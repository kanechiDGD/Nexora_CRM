import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import Stripe from "stripe";
import * as db from "./db";
import { generateClientId } from "./utils/generateClientId";
import { generatePassword } from "./utils/generatePassword";
import { generateToken, hashToken } from "./utils/tokens";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { ENV } from "./_core/env";
import { buildInviteEmail, buildPasswordResetEmail, sendEmail } from "./_core/email";
import { sdk } from "./_core/sdk";
import { getGmailAccessToken, sendGmailMessage } from "./services/gmail";
import { backfillGmailMessages } from "./services/gmailSync";
import { stripe } from "./services/stripe";
import type { InsertUser } from "../drizzle/schema";
import {
  getAllowedSeats,
  getPlanConfig,
  getTrialDaysLeft,
  isComped,
  isAccessBlocked
} from "./utils/billing";

// Helper para verificar roles
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Solo administradores pueden realizar esta acción'
    });
  }
  return next({ ctx });
});

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'user') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No tienes permisos suficientes'
    });
  }
  return next({ ctx });
});

// Middleware que inyecta organizationId del usuario autenticado
const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.organizationMember) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Usuario no pertenece a ninguna organización. Completa el proceso de onboarding.'
    });
  }
  const organization = await db.getOrganizationById(ctx.organizationMember.organizationId);
  if (!organization) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organización no encontrada'
    });
  }
  if (isAccessBlocked(organization)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'El acceso está restringido. Agrega un método de pago para continuar.'
    });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationMember.organizationId,
      memberRole: ctx.organizationMember.role,
      organization,
    }
  });
});

const orgBillingProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.organizationMember) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Usuario no pertenece a ninguna organización. Completa el proceso de onboarding.'
    });
  }
  const organization = await db.getOrganizationById(ctx.organizationMember.organizationId);
  if (!organization) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Organización no encontrada'
    });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationMember.organizationId,
      memberRole: ctx.organizationMember.role,
      organization,
    }
  });
});

// Middleware que solo permite ADMIN
const adminOrgProcedure = orgProcedure.use(({ ctx, next }) => {
  if (ctx.memberRole !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Solo administradores pueden realizar esta acción'
    });
  }
  return next({ ctx });
});

// Middleware que permite ADMIN y CO_ADMIN
const coAdminOrgProcedure = orgProcedure.use(({ ctx, next }) => {
  if (ctx.memberRole !== 'ADMIN' && ctx.memberRole !== 'CO_ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Solo administradores y co-administradores pueden realizar esta acción'
    });
  }
  return next({ ctx });
});

const READY_FOR_CONSTRUCTION_STATUS = "LISTA_PARA_CONSTRUIR";

const shouldMarkReadyForConstruction = (status?: string | null, primerCheque?: string | null) =>
  primerCheque === "OBTENIDO" || status === "APROVADA" || status === READY_FOR_CONSTRUCTION_STATUS;

const normalizeClaimStatusForConstruction = (status?: string | null, primerCheque?: string | null) => {
  if (shouldMarkReadyForConstruction(status, primerCheque)) {
    return READY_FOR_CONSTRUCTION_STATUS;
  }
  return status ?? null;
};

async function ensureConstructionProjectForClient(params: {
  clientId: string;
  organizationId: number;
  createdBy: number;
  updatedBy: number;
  firstName?: string | null;
  lastName?: string | null;
  propertyAddress?: string | null;
}) {
  const existing = await db.getConstructionProjectByClientId(params.clientId, params.organizationId);
  if (existing) return;

  const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ").trim();
  const projectName = fullName || `Project ${params.clientId}`;
  await db.createConstructionProject({
    clientId: params.clientId,
    projectName,
    propertyAddress: params.propertyAddress ?? null,
    organizationId: params.organizationId,
    createdBy: params.createdBy,
    updatedBy: params.updatedBy,
  });
}

const clientImportRowSchema = z.object({
  rowNumber: z.number().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  alternatePhone: z.string().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  propertyType: z.string().optional().nullable(),
  insuranceCompany: z.string().optional().nullable(),
  policyNumber: z.string().optional().nullable(),
  claimNumber: z.string().optional().nullable(),
  deductible: z.number().optional().nullable(),
  coverageAmount: z.number().optional().nullable(),
  claimStatus: z.string().optional().nullable(),
  suplementado: z.enum(["si", "no"]).optional().nullable(),
  primerCheque: z.enum(["OBTENIDO", "PENDIENTE"]).optional().nullable(),
  dateOfLoss: z.date().optional().nullable(),
  claimSubmittedDate: z.date().optional().nullable(),
  scheduledVisit: z.date().optional().nullable(),
  adjustmentDate: z.date().optional().nullable(),
  lastContactDate: z.date().optional().nullable(),
  nextContactDate: z.date().optional().nullable(),
  salesPerson: z.string().optional().nullable(),
  assignedAdjuster: z.string().optional().nullable(),
  damageType: z.string().optional().nullable(),
  damageDescription: z.string().optional().nullable(),
  estimatedLoss: z.number().optional().nullable(),
  insuranceEstimate: z.number().optional().nullable(),
  firstCheckAmount: z.number().optional().nullable(),
  actualPayout: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  constructionStatus: z.string().optional().nullable(),
});

const clientImportSchema = z.object({
  rows: z.array(clientImportRowSchema).min(1).max(1000),
});

async function notifyOrganizationMembers(params: {
  organizationId: number;
  type: "EVENT" | "TASK" | "ACTIVITY" | "EMAIL";
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  const members = await db.getOrganizationMembers(params.organizationId);
  if (!members.length) return;
  const rows = members.map((member) => ({
    organizationId: params.organizationId,
    userId: member.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
  }));
  await db.createNotifications(rows);
}

async function selectRoleAssignee(roleId: number, organizationId: number) {
  const members = await db.getWorkflowRoleMembers(roleId, organizationId);
  if (!members.length) return null;
  const primary = members.find((member: any) => member.isPrimary === 1);
  return primary?.userId ?? members[0].userId ?? null;
}

 

export const appRouter = router({
  system: systemRouter,



  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    loginWithCredentials: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const member = await db.getOrganizationMemberByUsername(input.username);
        if (!member || !member.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(input.password, member.password);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        }

        const user = await db.getUserById(member.userId);
        if (!user?.openId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
        }

        await db.upsertUser({
          openId: user.openId,
          name: user.name ?? null,
          email: user.email ?? null,
          loginMethod: user.loginMethod ?? null,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        if (input.rememberMe) {
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        } else {
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
        }

        return { success: true };
      }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true };
    }),

    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const member = await db.getOrganizationMemberByUsername(input.email);
        if (!member) {
          return { success: true };
        }


        const user = await db.getUserById(member.userId);
        if (!user) {
          return { success: true };
        }

        const token = generateToken(32);
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + ENV.passwordResetTokenHours * 60 * 60 * 1000);

        await db.createPasswordResetToken({
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        const resetUrl = `${ENV.appBaseUrl}/reset-password?token=${token}`;
        const email = buildPasswordResetEmail({
          userName: user.name || input.email,
          resetUrl,
        });

        await sendEmail({
          to: input.email,
          subject: email.subject,
          html: email.html,
        });

        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(10),
        password: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const tokenHash = hashToken(input.token);
        const resetToken = await db.getPasswordResetTokenByHash(tokenHash);
        if (!resetToken) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
        }

        if (resetToken.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Token already used" });
        }

        if (resetToken.expiresAt && new Date(resetToken.expiresAt).getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
        }

        const member = await db.getOrganizationMemberByUserId(resetToken.userId);
        if (!member) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        await db.updateOrganizationMember(member.id, { password: passwordHash });
        await db.updatePasswordResetToken(resetToken.id, { usedAt: new Date() });

        return { success: true };
      }),

      changePassword: protectedProcedure
        .input(z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8),
        }))
        .mutation(async ({ input, ctx }) => {
          const member = await db.getOrganizationMemberByUserId(ctx.user.id);
          if (!member?.password) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
          }

          const isValid = await bcrypt.compare(input.currentPassword, member.password);
          if (!isValid) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
          }

          const passwordHash = await bcrypt.hash(input.newPassword, 10);
          await db.updateOrganizationMember(member.id, { password: passwordHash });
          return { success: true };
        }),
      updateProfile: protectedProcedure
        .input(z.object({
          name: z.string().min(1),
          email: z.string().email().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const trimmedName = input.name.trim();
          const trimmedEmail = input.email?.trim().toLowerCase();

          if (!trimmedName) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required" });
          }

          if (trimmedEmail && trimmedEmail !== (ctx.user.email || "").toLowerCase()) {
            const existingMember = await db.getOrganizationMemberByUsername(trimmedEmail);
            if (existingMember && existingMember.userId !== ctx.user.id) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Email already in use" });
            }
          }

          const member = await db.getOrganizationMemberByUserId(ctx.user.id);
          if (member && trimmedEmail && member.username !== trimmedEmail) {
            await db.updateOrganizationMember(member.id, { username: trimmedEmail });
          }

          const updateData: Partial<InsertUser> = { name: trimmedName };
          if (trimmedEmail !== undefined) {
            updateData.email = trimmedEmail;
          }

          await db.updateUser(ctx.user.id, updateData);
          const updated = await db.getUserById(ctx.user.id);
          return updated ?? { ...ctx.user, ...updateData };
        }),
    }),

  // ============ CLIENTS ROUTER ============
  clients: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return await db.getAllClients(ctx.organizationId);
    }),

    getById: orgProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.id, ctx.organizationId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        return client;
      }),

    create: orgProcedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email({ message: "El formato del email no es vA-lido" }).optional().nullable(),
        phone: z.string().regex(/^[0-9\s\-\(\)]+$/, { message: "El nA?mero de telAcfono contiene caracteres no vA-lidos" }).optional().nullable(),
        alternatePhone: z.string().regex(/^[0-9\s\-\(\)]+$/, { message: "El nA?mero de telAcfono alternativo contiene caracteres no vA-lidos" }).optional().nullable(),
        propertyAddress: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        zipCode: z.string().regex(/^\d{5}$/, { message: "El cA3digo postal debe tener 5 dA-gitos" }).optional().nullable(),
        propertyType: z.string().optional().nullable(),
        insuranceCompany: z.string().optional().nullable(),
        policyNumber: z.string().optional().nullable(),
        claimNumber: z.string().optional().nullable(),
        deductible: z.number().positive({ message: "El deducible debe ser un nA?mero positivo" }).optional().nullable(),
        coverageAmount: z.number().positive({ message: "El monto de cobertura debe ser un nA?mero positivo" }).optional().nullable(),
        claimStatus: z.string().optional().nullable(),
        suplementado: z.enum(["si", "no"]).optional(),
        primerCheque: z.enum(["OBTENIDO", "PENDIENTE"]).optional(),
        dateOfLoss: z.date().optional().nullable(),
        claimSubmittedDate: z.date().optional().nullable(),
        scheduledVisit: z.date().optional().nullable(),
        adjustmentDate: z.date().optional().nullable(),
        lastContactDate: z.date().optional().nullable(),
        nextContactDate: z.date().optional().nullable(),
        salesPerson: z.string().optional().nullable(),
        assignedAdjuster: z.string().optional().nullable(),
        policyDocumentUrl: z.string().optional().nullable(),
        contractDocumentUrl: z.string().optional().nullable(),
        photosUrl: z.string().optional().nullable(),
        driveFolderId: z.string().optional().nullable(),
        damageType: z.string().optional().nullable(),
        damageDescription: z.string().optional().nullable(),
        estimatedLoss: z.number().positive({ message: "La pAcrdida estimada debe ser un nA?mero positivo" }).optional().nullable(),
        insuranceEstimate: z.number().optional().nullable(),
        firstCheckAmount: z.number().optional().nullable(),
        actualPayout: z.number().positive({ message: "El pago real debe ser un nA?mero positivo" }).optional().nullable(),
        notes: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
        constructionStatus: z.string().optional().nullable(),
      }))
        .mutation(async ({ input, ctx }) => {
          try {
            const baseId = generateClientId(
              input.city || "",
              input.firstName,
              input.lastName
            );

          let customId = baseId;
          let suffix = 1;
            while (await db.getClientById(customId, ctx.organizationId)) {
              suffix += 1;
              customId = `${baseId}-${suffix}`;
              if (customId.length > 50) {
                customId = `${baseId}-${Date.now().toString().slice(-4)}`;
                break;
              }
            }

            const claimStatus = normalizeClaimStatusForConstruction(
              input.claimStatus,
              input.primerCheque
            );

            const result = await db.createClient({
              ...input,
              claimStatus,
              id: customId,
              organizationId: ctx.organizationId,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            });

            if (claimStatus === READY_FOR_CONSTRUCTION_STATUS) {
              await ensureConstructionProjectForClient({
                clientId: customId,
                organizationId: ctx.organizationId,
                createdBy: ctx.user.id,
                updatedBy: ctx.user.id,
                firstName: input.firstName,
                lastName: input.lastName,
                propertyAddress: input.propertyAddress ?? null,
              });
            }

          await db.createAuditLog({
            entityType: "CLIENT",
            entityId: 0,
            action: "CREATE",
            performedBy: ctx.user.id,
          });

          await db.createActivityLog({
            clientId: customId,
            activityType: "NOTA",
            subject: "Client created",
            description: `Client created by ${ctx.user.name || ctx.user.email || "user"}`,
            organizationId: ctx.organizationId,
            performedBy: ctx.user.id,
          });

          return result;
        } catch (error) {
          console.error("[Clients] Failed to create client", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create client",
          });
        }
      }),

    bulkImport: orgProcedure
      .input(clientImportSchema)
      .mutation(async ({ input, ctx }) => {
        const errors: Array<{ row: number; message: string }> = [];
        const createdIds: string[] = [];

        for (let index = 0; index < input.rows.length; index += 1) {
          const row = input.rows[index];
          const rowNumber = row.rowNumber ?? index + 1;
          const firstName = row.firstName?.trim() || "Unknown";
          const lastName = row.lastName?.trim() || "Non";

          const baseId = generateClientId(row.city || "", firstName, lastName);
          let customId = baseId;
          let suffix = 1;
          while (await db.getClientById(customId, ctx.organizationId)) {
            suffix += 1;
            customId = `${baseId}-${suffix}`;
            if (customId.length > 50) {
              customId = `${baseId}-${Date.now().toString().slice(-4)}`;
              break;
            }
          }

            const { rowNumber: _rowNumber, ...clientData } = row;

            try {
              const claimStatus = normalizeClaimStatusForConstruction(
                clientData.claimStatus,
                clientData.primerCheque
              );
              await db.createClient({
                ...clientData,
                claimStatus,
                firstName,
                lastName,
                id: customId,
                organizationId: ctx.organizationId,
                createdBy: ctx.user.id,
                updatedBy: ctx.user.id,
              });

              await db.createAuditLog({
                entityType: "CLIENT",
                entityId: 0,
                action: "CREATE",
                performedBy: ctx.user.id,
              });

              if (claimStatus === READY_FOR_CONSTRUCTION_STATUS) {
                await ensureConstructionProjectForClient({
                  clientId: customId,
                  organizationId: ctx.organizationId,
                  createdBy: ctx.user.id,
                  updatedBy: ctx.user.id,
                  firstName,
                  lastName,
                  propertyAddress: clientData.propertyAddress ?? null,
                });
              }

              createdIds.push(customId);
            } catch (error) {
            console.error("[Clients] Failed to import client", error);
            errors.push({ row: rowNumber, message: "Failed to create client" });
          }
        }

        return { created: createdIds.length, errors };
      }),

    deleteAll: coAdminOrgProcedure
      .mutation(async ({ ctx }) => {
        await db.deleteAllClients(ctx.organizationId);

        await db.createAuditLog({
          entityType: "CLIENT",
          entityId: 0,
          action: "DELETE",
          performedBy: ctx.user.id,
        });

        return { success: true };
      }),

    update: orgProcedure
      .input(z.object({
        id: z.string(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email({ message: "El formato del email no es vA-lido" }).optional().nullable(),
          phone: z.string().regex(/^[0-9\s\-\(\)]+$/, { message: "El nA?mero de telAcfono contiene caracteres no vA-lidos" }).optional().nullable(),
          alternatePhone: z.string().regex(/^[0-9\s\-\(\)]+$/, { message: "El nA?mero de telAcfono alternativo contiene caracteres no vA-lidos" }).optional().nullable(),
          propertyAddress: z.string().optional().nullable(),
          city: z.string().optional().nullable(),
          state: z.string().optional().nullable(),
          zipCode: z.string().regex(/^\d{5}$/, { message: "El cA3digo postal debe tener 5 dA-gitos" }).optional().nullable(),
          propertyType: z.string().optional().nullable(),
          insuranceCompany: z.string().optional().nullable(),
          policyNumber: z.string().optional().nullable(),
          claimNumber: z.string().optional().nullable(),
          deductible: z.number().positive({ message: "El deducible debe ser un nA?mero positivo" }).optional().nullable(),
          coverageAmount: z.number().positive({ message: "El monto de cobertura debe ser un nA?mero positivo" }).optional().nullable(),
          claimStatus: z.string().optional().nullable(),
          suplementado: z.enum(["si", "no"]).optional(),
          primerCheque: z.enum(["OBTENIDO", "PENDIENTE"]).optional(),
          dateOfLoss: z.date().optional().nullable(),
          claimSubmittedDate: z.date().optional().nullable(),
          scheduledVisit: z.date().optional().nullable(),
          adjustmentDate: z.date().optional().nullable(),
          lastContactDate: z.date().optional().nullable(),
          nextContactDate: z.date().optional().nullable(),
          salesPerson: z.string().optional().nullable(),
          assignedAdjuster: z.string().optional().nullable(),
          policyDocumentUrl: z.string().optional().nullable(),
          contractDocumentUrl: z.string().optional().nullable(),
          photosUrl: z.string().optional().nullable(),
          driveFolderId: z.string().optional().nullable(),
          damageType: z.string().optional().nullable(),
          damageDescription: z.string().optional().nullable(),
          estimatedLoss: z.number().positive({ message: "La pAcrdida estimada debe ser un nA?mero positivo" }).optional().nullable(),
          insuranceEstimate: z.number().optional().nullable(),
          firstCheckAmount: z.number().optional().nullable(),
          actualPayout: z.number().positive({ message: "El pago real debe ser un nA?mero positivo" }).optional().nullable(),
          notes: z.string().optional().nullable(),
          internalNotes: z.string().optional().nullable(),
          constructionStatus: z.string().optional().nullable(),
        }),
        }))
        .mutation(async ({ input, ctx }) => {
          const existing = await db.getClientById(input.id, ctx.organizationId);
          if (!existing) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
          }

          const claimStatus = normalizeClaimStatusForConstruction(
            input.data.claimStatus ?? existing.claimStatus,
            input.data.primerCheque ?? existing.primerCheque
          );

          const updated = await db.updateClient(input.id, ctx.organizationId, {
            ...input.data,
            claimStatus,
            updatedBy: ctx.user.id,
          });

          if (claimStatus === READY_FOR_CONSTRUCTION_STATUS && updated) {
            await ensureConstructionProjectForClient({
              clientId: input.id,
              organizationId: ctx.organizationId,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
              firstName: updated.firstName,
              lastName: updated.lastName,
              propertyAddress: updated.propertyAddress ?? null,
            });
          }

        await db.createAuditLog({
          entityType: "CLIENT",
          entityId: 0,
          action: "UPDATE",
          performedBy: ctx.user.id,
        });

        await db.createActivityLog({
          clientId: input.id,
          activityType: "NOTA",
          subject: "Client updated",
          description: `Client updated by ${ctx.user.name || ctx.user.email || "user"}`,
          organizationId: ctx.organizationId,
          performedBy: ctx.user.id,
        });

        return updated;
      }),

      delete: coAdminOrgProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteClient(input.id, ctx.organizationId);

          await db.createAuditLog({
            entityType: "CLIENT",
            entityId: 0,
            action: "DELETE",
            performedBy: ctx.user.id,
          });

          return { success: true };
        }),

      getWorkflowSummary: orgProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          const client = await db.getClientById(input.id, ctx.organizationId);
          if (!client) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
          }

          const logs = await db.getActivityLogsByClientId(input.id, ctx.organizationId);
          const lastByType: Record<string, any> = {};
          for (const log of logs) {
            if (!lastByType[log.activityType]) {
              lastByType[log.activityType] = log;
            }
          }

          return {
            client: {
              id: client.id,
              claimStatus: client.claimStatus,
              adjustmentDate: client.adjustmentDate,
              lastContactDate: client.lastContactDate,
              nextContactDate: client.nextContactDate,
            },
            lastActivity: logs[0] || null,
            lastStatusChange: lastByType["CAMBIO_ESTADO"] || null,
            lastCoreActivities: {
              AJUSTACION_REALIZADA: lastByType["AJUSTACION_REALIZADA"] || null,
              SCOPE_SOLICITADO: lastByType["SCOPE_SOLICITADO"] || null,
              SCOPE_RECIBIDO: lastByType["SCOPE_RECIBIDO"] || null,
              SCOPE_ENVIADO: lastByType["SCOPE_ENVIADO"] || null,
              RESPUESTA_FAVORABLE: lastByType["RESPUESTA_FAVORABLE"] || null,
              RESPUESTA_NEGATIVA: lastByType["RESPUESTA_NEGATIVA"] || null,
              INICIO_APPRAISAL: lastByType["INICIO_APPRAISAL"] || null,
              CARTA_APPRAISAL_ENVIADA: lastByType["CARTA_APPRAISAL_ENVIADA"] || null,
              RELEASE_LETTER_REQUERIDA: lastByType["RELEASE_LETTER_REQUERIDA"] || null,
              ITEL_SOLICITADO: lastByType["ITEL_SOLICITADO"] || null,
              REINSPECCION_SOLICITADA: lastByType["REINSPECCION_SOLICITADA"] || null,
            },
          };
        }),
    }),
  // ============ DASHBOARD / KPIs ROUTER ============
    dashboard: router({
      // Total de clientes
      totalClients: orgProcedure.query(async ({ ctx }) => {
        const clients = await db.getAllClients(ctx.organizationId);
        return { count: clients.length, clients };
      }),

    // Contacto atrasado (>7 días)
    lateContact: orgProcedure.query(async ({ ctx }) => {
      const clients = await db.getClientsWithLateContact(ctx.organizationId, 7);
      return { count: clients.length, clients };
    }),

    // No suplementado
    notSupplemented: orgProcedure.query(async ({ ctx }) => {
      const clients = await db.getClientsNotSupplemented(ctx.organizationId);
      return { count: clients.length, clients };
    }),

    // Pendientes por someter
    pendingSubmission: orgProcedure.query(async ({ ctx }) => {
      const clients = await db.getClientsPendingSubmission(ctx.organizationId);
      return { count: clients.length, clients };
    }),

    // Listas para construir
    readyForConstruction: orgProcedure.query(async ({ ctx }) => {
      const clients = await db.getClientsReadyForConstruction(ctx.organizationId);
      return { count: clients.length, clients };
    }),

    // Próximos contactos (7 días)
    upcomingContacts: protectedProcedure.query(async () => {
      const clients = await db.getClientsWithUpcomingContact(7);
      return { count: clients.length, clients };
    }),

      // Conteo de clientes por estado de reclamo (predeterminados + personalizados)
      clientsByClaimStatus: orgProcedure.query(async ({ ctx }) => {
        return await db.getClientCountByClaimStatus(ctx.organizationId);
      }),

      workflowKpis: orgProcedure.query(async ({ ctx }) => {
        const clients = await db.getAllClients(ctx.organizationId);
        const coreTypes = [
          "AJUSTACION_REALIZADA",
          "SCOPE_SOLICITADO",
          "SCOPE_RECIBIDO",
          "SCOPE_ENVIADO",
          "RESPUESTA_FAVORABLE",
          "RESPUESTA_NEGATIVA",
          "INICIO_APPRAISAL",
          "CARTA_APPRAISAL_ENVIADA",
          "CAMBIO_ESTADO",
        ];
        const logs = await db.getActivityLogsByOrganization(ctx.organizationId, coreTypes);
        const insuranceScopeDocs = await db.getDocumentsByOrganization(ctx.organizationId, [
          "ESTIMADO_ASEGURANZA",
          "ESTIMADO",
        ]);
        const latestByClient: Record<string, Record<string, any>> = {};
        const insuranceScopeByClient = new Set<string>();

        for (const log of logs) {
          if (!log.clientId) continue;
          if (!latestByClient[log.clientId]) {
            latestByClient[log.clientId] = {};
          }
          if (!latestByClient[log.clientId][log.activityType]) {
            latestByClient[log.clientId][log.activityType] = log;
          }
        }
        for (const doc of insuranceScopeDocs) {
          if (doc.clientId) {
            insuranceScopeByClient.add(doc.clientId);
          }
        }

        const now = Date.now();
        const addDays = (date: Date | string, days: number) =>
          new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000);
        const addHours = (date: Date | string, hours: number) =>
          new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);
        const daysSince = (date?: Date | string | null) =>
          date ? Math.floor((now - new Date(date).getTime()) / (1000 * 60 * 60 * 24)) : null;
        const daysUntil = (date?: Date | string | null) =>
          date ? Math.floor((new Date(date).getTime() - now) / (1000 * 60 * 60 * 24)) : null;
        const getPriorityFromDue = (date?: Date | string | null): "high" | "medium" | "low" => {
          const remaining = daysUntil(date);
          if (remaining === null) return "low";
          if (remaining <= 0) return "high";
          if (remaining <= 2) return "medium";
          return "low";
        };

        let scopePending = 0;
        let scopeSendPending = 0;
        let responsePending = 0;
        let appraisalPending = 0;
        let missingInsuranceScope = 0;
        const nextActions: Array<{
          clientId: string;
          clientName: string;
          actionKey: string;
          dueDate: Date | null;
          priority: "high" | "medium" | "low";
        }> = [];

        for (const client of clients) {
          const activity = latestByClient[client.id] || {};
          const adjustmentDate = client.adjustmentDate || activity["AJUSTACION_REALIZADA"]?.performedAt || null;
          const scopeReceivedAt = activity["SCOPE_RECIBIDO"]?.performedAt || null;
          const scopeSentAt = activity["SCOPE_ENVIADO"]?.performedAt || null;
          const hasNegativeResponse = !!activity["RESPUESTA_NEGATIVA"];
          const responseAt =
            activity["RESPUESTA_FAVORABLE"]?.performedAt ||
            activity["RESPUESTA_NEGATIVA"]?.performedAt ||
            null;
          const appraisalStartedAt = activity["INICIO_APPRAISAL"]?.performedAt || null;
          const appraisalLetterSentAt = activity["CARTA_APPRAISAL_ENVIADA"]?.performedAt || null;
          const adjustmentLogged = !!activity["AJUSTACION_REALIZADA"];

          const clientName = `${client.firstName} ${client.lastName}`;
          const hasAdjustment = !!adjustmentDate;
          const isInProcess = client.claimStatus === "EN_PROCESO";
          const hasScopePhase = !!(
            scopeReceivedAt ||
            scopeSentAt ||
            activity["RESPUESTA_FAVORABLE"] ||
            appraisalStartedAt
          );
          const hasInsuranceScopeDoc = insuranceScopeByClient.has(client.id);
          let hasPrimaryAction = false;

          if (
            !hasPrimaryAction &&
            adjustmentDate &&
            !adjustmentLogged &&
            client.claimStatus !== "EN_PROCESO" &&
            now > addHours(adjustmentDate, 2).getTime()
          ) {
            const dueDate = addHours(adjustmentDate, 2);
            nextActions.push({
              clientId: client.id,
              clientName,
              actionKey: "completeAdjustment",
              dueDate,
              priority: getPriorityFromDue(dueDate),
            });
            hasPrimaryAction = true;
          }

          if (hasNegativeResponse && !appraisalStartedAt) {
            appraisalPending += 1;
            if (!appraisalLetterSentAt) {
              nextActions.push({
                clientId: client.id,
                clientName,
                actionKey: "sendAppraisalLetter",
                dueDate: null,
                priority: "high",
              });
              hasPrimaryAction = true;
            }
          }

          if (!hasPrimaryAction && !hasNegativeResponse && adjustmentDate && !scopeReceivedAt) {
            const dueDate = addDays(adjustmentDate, 5);
            scopePending += 1;
            nextActions.push({
              clientId: client.id,
              clientName,
              actionKey: "requestScope",
              dueDate,
              priority: getPriorityFromDue(dueDate),
            });
            hasPrimaryAction = true;
          }

          if (!hasPrimaryAction && !hasNegativeResponse && scopeReceivedAt && !scopeSentAt) {
            const dueDate = addDays(scopeReceivedAt, 2);
            scopeSendPending += 1;
            nextActions.push({
              clientId: client.id,
              clientName,
              actionKey: "sendScope",
              dueDate,
              priority: getPriorityFromDue(dueDate),
            });
            hasPrimaryAction = true;
          }

          if (!hasPrimaryAction && !hasNegativeResponse && scopeSentAt && !responseAt) {
            const dueDate = addDays(scopeSentAt, 10);
            responsePending += 1;
            nextActions.push({
              clientId: client.id,
              clientName,
              actionKey: "followUpAdjuster",
              dueDate,
              priority: getPriorityFromDue(dueDate),
            });
            hasPrimaryAction = true;
          }

          const needsInsuranceScope = !hasNegativeResponse && !hasInsuranceScopeDoc && (isInProcess || (hasAdjustment && hasScopePhase));
          if (needsInsuranceScope) {
            missingInsuranceScope += 1;
            if (!hasPrimaryAction) {
              nextActions.push({
                clientId: client.id,
                clientName,
                actionKey: "uploadInsuranceScope",
                dueDate: null,
                priority: "high",
              });
            }
          }

          if (!hasPrimaryAction && appraisalLetterSentAt && !appraisalStartedAt) {
            const dueDate = addDays(appraisalLetterSentAt, 5);
            nextActions.push({
              clientId: client.id,
              clientName,
              actionKey: "followUpAppraisalLetter",
              dueDate,
              priority: getPriorityFromDue(dueDate),
            });
          }
        }

        nextActions.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });

        return {
          scopePending,
          scopeSendPending,
          responsePending,
          appraisalPending,
          missingInsuranceScope,
          nextActions: nextActions.slice(0, 10),
        };
      }),
    }),

  // ============ ACTIVITY LOGS ROUTER ============
  activityLogs: router({
    // Obtener logs por cliente
    getByClientId: orgProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getActivityLogsByClientId(input.clientId, ctx.organizationId);
      }),

    // Obtener logs recientes
    getRecent: orgProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        return await db.getRecentActivityLogs(ctx.organizationId, input.limit || 50);
      }),

    // Crear nuevo log
      create: orgProcedure
        .input(z.object({
          clientId: z.string().optional().nullable(),
          activityType: z.enum([
            "LLAMADA",
            "CORREO",
            "VISITA",
            "NOTA",
            "DOCUMENTO",
            "CAMBIO_ESTADO",
            "AJUSTACION_REALIZADA",
            "SCOPE_SOLICITADO",
            "SCOPE_RECIBIDO",
            "SCOPE_ENVIADO",
            "RESPUESTA_FAVORABLE",
            "RESPUESTA_NEGATIVA",
            "INICIO_APPRAISAL",
            "CARTA_APPRAISAL_ENVIADA",
            "RELEASE_LETTER_REQUERIDA",
            "ITEL_SOLICITADO",
            "REINSPECCION_SOLICITADA",
          ]),
          subject: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          outcome: z.string().optional().nullable(),
          contactMethod: z.string().optional().nullable(),
          duration: z.number().optional().nullable(),
      }))
        .mutation(async ({ input, ctx }) => {
          const result = await db.createActivityLog({
            ...input,
            organizationId: ctx.organizationId,
            performedBy: ctx.user.id,
          });
  
          if (input.clientId) {
            const rules = await db.getActiveAutomationRulesByActivityType(
              ctx.organizationId,
              input.activityType
            );
            if (rules.length > 0) {
              for (const rule of rules) {
                const assignedTo = rule.roleId
                  ? await selectRoleAssignee(rule.roleId, ctx.organizationId)
                  : null;
                const dueDate = rule.dueInDays !== null && rule.dueInDays !== undefined
                  ? new Date(Date.now() + rule.dueInDays * 24 * 60 * 60 * 1000)
                  : null;
  
                await db.createTask({
                  clientId: input.clientId,
                  title: rule.taskTitle,
                  description: rule.taskDescription || null,
                  category: rule.category,
                  priority: rule.priority,
                  status: "PENDIENTE",
                  assignedTo,
                  dueDate,
                  completedAt: null,
                  attachments: null,
                  organizationId: ctx.organizationId,
                  createdBy: ctx.user.id,
                  updatedBy: ctx.user.id,
                });
              }
            }
          }

          const client = input.clientId
            ? await db.getClientById(input.clientId, ctx.organizationId)
            : null;
        const clientName = client ? `${client.firstName} ${client.lastName}` : "Client";
        const subject = input.subject || "Activity logged";

        await notifyOrganizationMembers({
          organizationId: ctx.organizationId,
          type: "ACTIVITY",
          title: `New activity for ${clientName}`,
          body: `${subject}${input.description ? ` - ${input.description}` : ""}`,
          entityType: "activity",
          entityId: (result as any)?.insertId ? String((result as any).insertId) : null,
        });

        return result;
      }),

    // Actualizar log
    update: coAdminOrgProcedure
      .input(z.object({
        id: z.number(),
        activityType: z.enum([
          "LLAMADA",
          "CORREO",
          "VISITA",
          "NOTA",
          "DOCUMENTO",
          "CAMBIO_ESTADO",
          "AJUSTACION_REALIZADA",
          "SCOPE_SOLICITADO",
          "SCOPE_RECIBIDO",
          "SCOPE_ENVIADO",
          "RESPUESTA_FAVORABLE",
          "RESPUESTA_NEGATIVA",
          "INICIO_APPRAISAL",
          "CARTA_APPRAISAL_ENVIADA",
          "RELEASE_LETTER_REQUERIDA",
          "ITEL_SOLICITADO",
          "REINSPECCION_SOLICITADA",
        ]).optional(),
        subject: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateActivityLog(id, ctx.organizationId, {
          activityType: data.activityType,
          subject: data.subject ?? null,
          description: data.description ?? null,
        });
        return { success: true };
      }),

    // Eliminar log (solo admin)
    delete: adminOrgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteActivityLog(input.id, ctx.organizationId);
        return { success: true };
      }),

  }),

  // ============ CONSTRUCTION PROJECTS ROUTER ============
  construction: router({
    // Listar todos los proyectos
    list: orgProcedure.query(async ({ ctx }) => {
      return await db.getAllConstructionProjects(ctx.organizationId);
    }),

    // Obtener proyecto por ID
    getById: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getConstructionProjectById(input.id, ctx.organizationId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        return project;
      }),

    // Buscar proyectos por nombre
    search: orgProcedure
      .input(z.object({ searchTerm: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.searchConstructionProjectsByName(input.searchTerm, ctx.organizationId);
      }),

    // Crear nuevo proyecto
    create: orgProcedure
      .input(z.object({
        clientId: z.string().optional().nullable(),
        projectName: z.string(),
        propertyAddress: z.string().optional().nullable(),
        roofType: z.string().optional().nullable(),
        roofColor: z.string().optional().nullable(),
        roofSQ: z.number().optional().nullable(),
        sidingType: z.string().optional().nullable(),
        sidingColor: z.string().optional().nullable(),
        sidingSQ: z.number().optional().nullable(),
        permitNumber: z.string().optional().nullable(),
        permitStatus: z.enum(["PENDIENTE", "APROBADO", "RECHAZADO", "NO_REQUERIDO"]).optional(),
        permitDate: z.date().optional().nullable(),
        startDate: z.date().optional().nullable(),
        estimatedCompletionDate: z.date().optional().nullable(),
        actualCompletionDate: z.date().optional().nullable(),
        projectStatus: z.enum(["PLANIFICACION", "EN_PROGRESO", "PAUSADO", "COMPLETADO", "CANCELADO"]).optional(),
        estimatedCost: z.number().optional().nullable(),
        actualCost: z.number().optional().nullable(),
        contractor: z.string().optional().nullable(),
        projectManager: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        specialRequirements: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createConstructionProject({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
      }),

    // Actualizar proyecto
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          clientId: z.string().optional().nullable(),
          projectName: z.string().optional(),
          propertyAddress: z.string().optional().nullable(),
          roofType: z.string().optional().nullable(),
          roofColor: z.string().optional().nullable(),
          roofSQ: z.number().optional().nullable(),
          sidingType: z.string().optional().nullable(),
          sidingColor: z.string().optional().nullable(),
          sidingSQ: z.number().optional().nullable(),
          permitNumber: z.string().optional().nullable(),
          permitStatus: z.enum(["PENDIENTE", "APROBADO", "RECHAZADO", "NO_REQUERIDO"]).optional(),
          permitDate: z.date().optional().nullable(),
          startDate: z.date().optional().nullable(),
          estimatedCompletionDate: z.date().optional().nullable(),
          actualCompletionDate: z.date().optional().nullable(),
          projectStatus: z.enum(["PLANIFICACION", "EN_PROGRESO", "PAUSADO", "COMPLETADO", "CANCELADO"]).optional(),
          estimatedCost: z.number().optional().nullable(),
          actualCost: z.number().optional().nullable(),
          contractor: z.string().optional().nullable(),
          projectManager: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
          specialRequirements: z.string().optional().nullable(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.updateConstructionProject(input.id, ctx.organizationId, {
          ...input.data,
          updatedBy: ctx.user.id,
        });
      }),
  }),

  // ============ DOCUMENTS ROUTER ============
  documents: router({
    // Obtener documentos por cliente
    getByClientId: orgProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getDocumentsByClientId(input.clientId, ctx.organizationId);
      }),

    // Obtener documentos por proyecto
    getByProjectId: orgProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getDocumentsByConstructionProjectId(input.projectId, ctx.organizationId);
      }),

    // Crear nuevo documento
    create: orgProcedure
      .input(z.object({
        clientId: z.string().optional().nullable(),
        constructionProjectId: z.number().optional().nullable(),
        documentType: z.enum([
          "POLIZA",
          "CONTRATO",
          "FOTO",
          "ESTIMADO",
          "ESTIMADO_ASEGURANZA",
          "ESTIMADO_NUESTRO",
          "FACTURA",
          "PERMISO",
          "OTRO",
        ]),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string().optional().nullable(),
        mimeType: z.string().optional().nullable(),
        fileSize: z.number().optional().nullable(),
        description: z.string().optional().nullable(),
        tags: z.string().optional().nullable(),
        driveFileId: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createDocument({
          ...input,
          organizationId: ctx.organizationId,
          uploadedBy: ctx.user.id,
        });
      }),

    update: orgProcedure
      .input(z.object({
        id: z.number(),
        documentType: z.enum([
          "POLIZA",
          "CONTRATO",
          "FOTO",
          "ESTIMADO",
          "ESTIMADO_ASEGURANZA",
          "ESTIMADO_NUESTRO",
          "FACTURA",
          "PERMISO",
          "OTRO",
        ]),
        description: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.updateDocument(input.id, ctx.organizationId, {
          documentType: input.documentType,
          description: input.description ?? null,
        });
      }),
  }),

  // ============ GMAIL ROUTER ============
  gmail: router({
    status: orgProcedure.query(async ({ ctx }) => {
      const account = await db.getGmailAccountByUserId(ctx.user.id, ctx.organizationId);
      return {
        connected: !!account && account.isActive === 1,
        email: account?.email || null,
      };
    }),

    listByClient: orgProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getGmailMessagesByClientId(input.clientId, ctx.organizationId);
      }),

    send: orgProcedure
      .input(z.object({
        clientId: z.string(),
        to: z.string(),
        subject: z.string(),
        bodyHtml: z.string().optional().nullable(),
        bodyText: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const account = await db.getGmailAccountByUserId(ctx.user.id, ctx.organizationId);
        if (!account || account.isActive !== 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Gmail not connected" });
        }

        const accessToken = await getGmailAccessToken(account);
        const sendResult = await sendGmailMessage({
          accessToken,
          fromEmail: account.email,
          to: input.to,
          subject: input.subject,
          bodyHtml: input.bodyHtml || null,
          bodyText: input.bodyText || null,
        });

        const threadId = sendResult.threadId || null;
          let threadRecordId: number | null = null;
          if (threadId) {
            const existingThread = await db.getGmailThreadByThreadId(threadId, ctx.organizationId, input.clientId);
            if (existingThread) {
              threadRecordId = existingThread.id;
            } else {
              await db.createGmailThread({
                threadId,
                clientId: input.clientId,
                organizationId: ctx.organizationId,
                subject: input.subject,
                lastMessageAt: new Date(),
                lastSnippet: input.bodyText || input.bodyHtml || null,
              });
              const createdThread = await db.getGmailThreadByThreadId(threadId, ctx.organizationId, input.clientId);
              threadRecordId = createdThread?.id || null;
            }
          }

          await db.createGmailMessage({
            messageId: sendResult.id,
            threadId: threadRecordId,
            clientId: input.clientId,
            organizationId: ctx.organizationId,
            direction: "OUTBOUND",
            isRead: 1,
            fromEmail: account.email,
            toEmails: input.to,
            ccEmails: null,
            subject: input.subject,
          snippet: input.bodyText || input.bodyHtml || null,
          bodyText: input.bodyText || null,
          bodyHtml: input.bodyHtml || null,
          sentAt: new Date(),
          gmailLink: `https://mail.google.com/mail/u/0/#all/${sendResult.id}`,
        });

        await db.createActivityLog({
          clientId: input.clientId,
          activityType: "CORREO",
          subject: input.subject,
          description: input.bodyText || input.bodyHtml || "Email sent",
          organizationId: ctx.organizationId,
          performedBy: ctx.user.id,
        });

        return { success: true, messageId: sendResult.id };
      }),

    syncNow: orgProcedure
      .input(z.object({
        query: z.string().optional().nullable(),
        days: z.number().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const account = await db.getGmailAccountByUserId(ctx.user.id, ctx.organizationId);
        if (!account || account.isActive !== 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Gmail not connected" });
        }

        const accessToken = await getGmailAccessToken(account);
        const days = input.days || 180;
        const query = input.query || `newer_than:${days}d`;
          const processed = await backfillGmailMessages({
            account: {
              id: account.id,
              userId: account.userId,
              email: account.email,
              organizationId: ctx.organizationId,
            },
            accessToken,
            query,
            maxResults: 200,
            notifyOnInbound: true,
          });

        return { success: true, processed };
      }),

    disconnect: orgProcedure.mutation(async ({ ctx }) => {
      const account = await db.getGmailAccountByUserId(ctx.user.id, ctx.organizationId);
      if (!account) {
        return { success: true };
      }
      await db.deactivateGmailAccount(account.id, ctx.organizationId);
      return { success: true };
    }),
  }),

  // ============ AUDIT LOGS ROUTER ============
  auditLogs: router({
    // Obtener logs de auditoría por entidad
    getByEntity: adminProcedure
      .input(z.object({
        entityType: z.enum(["CLIENT", "ACTIVITY_LOG", "CONSTRUCTION_PROJECT", "DOCUMENT", "USER"]),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getAuditLogsByEntity(input.entityType, input.entityId);
      }),
  }),

  // ============ EVENTS ROUTER ============
  events: router({
    // Listar todos los eventos
    list: orgProcedure.query(async ({ ctx }) => {
      return await db.getAllEvents(ctx.organizationId);
    }),

    // Obtener evento por ID
    getById: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const event = await db.getEventById(input.id, ctx.organizationId);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento no encontrado' });
        }
        return event;
      }),

    getAttendees: orgProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getEventAttendees(input.eventId, ctx.organizationId);
      }),

    // Obtener eventos por cliente
    getByClientId: orgProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getEventsByClientId(input.clientId, ctx.organizationId);
      }),

    // Crear nuevo evento
    create: orgProcedure
      .input(z.object({
        clientId: z.string().optional().nullable(),
        eventType: z.enum(["MEETING", "ADJUSTMENT", "ESTIMATE", "INSPECTION", "APPOINTMENT", "DEADLINE", "OTHER"]),
        title: z.string(),
        description: z.string().optional().nullable(),
        eventDate: z.date(),
        eventTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        attendeeIds: z.array(z.number()).optional(),
        adjusterNumber: z.string().optional().nullable(),
        adjusterName: z.string().optional().nullable(),
        adjusterPhone: z.string().optional().nullable(),
        adjusterEmail: z.string().optional().nullable(),
        insuranceCompany: z.string().optional().nullable(),
        claimNumber: z.string().optional().nullable(),
        status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { attendeeIds, ...eventData } = input;
        const result = await db.createEvent({
          ...eventData,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });

        const eventId = Number((result as any)?.insertId || 0);
        if (eventId && attendeeIds?.length) {
          await db.createEventAttendees(
            attendeeIds.map((memberId) => ({
              eventId,
              memberId,
              organizationId: ctx.organizationId,
            }))
          );
        }

        await db.createActivityLog({
          clientId: input.clientId ?? null,
          activityType: "NOTA",
          subject: `Event scheduled: ${input.title}`,
          description: input.description || null,
          organizationId: ctx.organizationId,
          performedBy: ctx.user.id,
        });

        const eventDate = input.eventDate.toISOString().split("T")[0];
        await notifyOrganizationMembers({
          organizationId: ctx.organizationId,
          type: "EVENT",
          title: `New event: ${input.title}`,
          body: `Scheduled on ${eventDate}${input.eventTime ? ` at ${input.eventTime}` : ""}`,
          entityType: "event",
          entityId: eventId ? String(eventId) : null,
        });

        return result;
      }),

    // Actualizar evento
    update: coAdminOrgProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.string().optional().nullable(),
        eventType: z.enum(["MEETING", "ADJUSTMENT", "ESTIMATE", "INSPECTION", "APPOINTMENT", "DEADLINE", "OTHER"]).optional(),
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        eventDate: z.date().optional(),
        eventTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        attendeeIds: z.array(z.number()).optional(),
        adjusterNumber: z.string().optional().nullable(),
        adjusterName: z.string().optional().nullable(),
        adjusterPhone: z.string().optional().nullable(),
        adjusterEmail: z.string().optional().nullable(),
        insuranceCompany: z.string().optional().nullable(),
        claimNumber: z.string().optional().nullable(),
        status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, attendeeIds, ...data } = input;
        const updated = await db.updateEvent(id, ctx.organizationId, {
          ...data,
          updatedBy: ctx.user.id,
        });

        if (attendeeIds) {
          await db.replaceEventAttendees(id, ctx.organizationId, attendeeIds);
        }

        return updated;
      }),

    // Eliminar evento (solo admin)
    delete: adminOrgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.deleteEvent(input.id, ctx.organizationId);
      }),
  }),

  // ============ TASKS ROUTER ============
    tasks: router({
    // Listar todas las tareas
    list: orgProcedure.query(async ({ ctx }) => {
      return await db.getAllTasks(ctx.organizationId);
    }),

    // Obtener tarea por ID
    getById: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const task = await db.getTaskById(input.id, ctx.organizationId);
        if (!task) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarea no encontrada' });
        }
        return task;
      }),

    // Obtener tareas por usuario asignado
    getByAssignee: orgProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getTasksByAssignee(input.userId, ctx.organizationId);
      }),

    // Obtener tareas por cliente
    getByClientId: orgProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getTasksByClientId(input.clientId, ctx.organizationId);
      }),

    // Crear nueva tarea
    create: orgProcedure
      .input(z.object({
        clientId: z.string().optional().nullable(),
        title: z.string(),
        description: z.string().optional().nullable(),
        category: z.enum(["DOCUMENTACION", "SEGUIMIENTO", "ESTIMADO", "REUNION", "REVISION", "OTRO"]).optional(),
        priority: z.enum(["ALTA", "MEDIA", "BAJA"]).optional(),
        status: z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"]).optional(),
        assignedTo: z.number().optional().nullable(),
        dueDate: z.date().optional().nullable(),
        attachments: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createTask({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });

        await db.createActivityLog({
          clientId: input.clientId ?? null,
          activityType: "NOTA",
          subject: `Task created: ${input.title}`,
          description: input.description || null,
          organizationId: ctx.organizationId,
          performedBy: ctx.user.id,
        });

        await notifyOrganizationMembers({
          organizationId: ctx.organizationId,
          type: "TASK",
          title: `New task: ${input.title}`,
          body: input.description || null,
          entityType: "task",
          entityId: (result as any)?.insertId ? String((result as any).insertId) : null,
        });

        return result;
      }),

    // Actualizar tarea
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.string().optional().nullable(),
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        category: z.enum(["DOCUMENTACION", "SEGUIMIENTO", "ESTIMADO", "REUNION", "REVISION", "OTRO"]).optional(),
        priority: z.enum(["ALTA", "MEDIA", "BAJA"]).optional(),
        status: z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"]).optional(),
        assignedTo: z.number().optional().nullable(),
        dueDate: z.date().optional().nullable(),
        completedAt: z.date().optional().nullable(),
        attachments: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await db.updateTask(id, ctx.organizationId, {
          ...data,
          updatedBy: ctx.user.id,
        });
      }),

    // Eliminar tarea (solo admin)
      delete: adminOrgProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          return await db.deleteTask(input.id, ctx.organizationId);
        }),
    }),

    // ============ WORKFLOW ROLES ROUTER ============
    workflowRoles: router({
      list: orgProcedure.query(async ({ ctx }) => {
        return await db.getWorkflowRoles(ctx.organizationId);
      }),

      getById: orgProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
          return await db.getWorkflowRoleById(input.id, ctx.organizationId);
        }),

      listMembers: orgProcedure
        .input(z.object({ roleId: z.number() }))
        .query(async ({ input, ctx }) => {
          return await db.getWorkflowRoleMembers(input.roleId, ctx.organizationId);
        }),

      listAllMembers: orgProcedure.query(async ({ ctx }) => {
        return await db.getWorkflowRoleMembersByOrg(ctx.organizationId);
      }),

      create: coAdminOrgProcedure
        .input(z.object({
          name: z.string().min(1).max(100),
          description: z.string().optional().nullable(),
          isActive: z.number().optional(),
          primaryUserId: z.number().optional().nullable(),
          secondaryUserIds: z.array(z.number()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const result = await db.createWorkflowRole({
            name: input.name,
            description: input.description || null,
            isActive: input.isActive ?? 1,
            organizationId: ctx.organizationId,
            createdBy: ctx.user.id,
          });

          const roleId = (result as any)?.insertId;
          if (roleId) {
            const members: Array<{ userId: number; isPrimary: number }> = [];
            if (input.primaryUserId) {
              members.push({ userId: input.primaryUserId, isPrimary: 1 });
            }
            (input.secondaryUserIds || []).forEach((userId) => {
              if (userId !== input.primaryUserId) {
                members.push({ userId, isPrimary: 0 });
              }
            });

            for (const member of members) {
              await db.createWorkflowRoleMember({
                roleId,
                userId: member.userId,
                isPrimary: member.isPrimary,
                organizationId: ctx.organizationId,
                createdAt: new Date(),
              });
            }
          }

          return { success: true, id: result };
        }),

      update: coAdminOrgProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional().nullable(),
          isActive: z.number().optional(),
          primaryUserId: z.number().optional().nullable(),
          secondaryUserIds: z.array(z.number()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          await db.updateWorkflowRole(input.id, ctx.organizationId, {
            name: input.name,
            description: input.description ?? undefined,
            isActive: input.isActive,
          });

          if (input.primaryUserId !== undefined || input.secondaryUserIds !== undefined) {
            await db.deleteWorkflowRoleMembers(input.id, ctx.organizationId);
            const members: Array<{ userId: number; isPrimary: number }> = [];
            if (input.primaryUserId) {
              members.push({ userId: input.primaryUserId, isPrimary: 1 });
            }
            (input.secondaryUserIds || []).forEach((userId) => {
              if (userId !== input.primaryUserId) {
                members.push({ userId, isPrimary: 0 });
              }
            });

            for (const member of members) {
              await db.createWorkflowRoleMember({
                roleId: input.id,
                userId: member.userId,
                isPrimary: member.isPrimary,
                organizationId: ctx.organizationId,
                createdAt: new Date(),
              });
            }
          }

          return { success: true };
        }),

      delete: coAdminOrgProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteWorkflowRole(input.id, ctx.organizationId);
          return { success: true };
        }),
    }),

    // ============ ACTIVITY AUTOMATION RULES ROUTER ============
    activityAutomationRules: router({
      list: orgProcedure.query(async ({ ctx }) => {
        return await db.getActivityAutomationRules(ctx.organizationId);
      }),

      create: coAdminOrgProcedure
        .input(z.object({
          activityType: z.enum([
            "LLAMADA",
            "CORREO",
            "VISITA",
            "NOTA",
            "DOCUMENTO",
            "CAMBIO_ESTADO",
            "AJUSTACION_REALIZADA",
            "SCOPE_SOLICITADO",
            "SCOPE_RECIBIDO",
            "SCOPE_ENVIADO",
            "RESPUESTA_FAVORABLE",
            "RESPUESTA_NEGATIVA",
            "INICIO_APPRAISAL",
            "CARTA_APPRAISAL_ENVIADA",
            "RELEASE_LETTER_REQUERIDA",
            "ITEL_SOLICITADO",
            "REINSPECCION_SOLICITADA",
          ]),
          taskTitle: z.string().min(1).max(200),
          taskDescription: z.string().optional().nullable(),
          roleId: z.number().optional().nullable(),
          category: z.enum(["DOCUMENTACION", "SEGUIMIENTO", "ESTIMADO", "REUNION", "REVISION", "OTRO"]).optional(),
          priority: z.enum(["ALTA", "MEDIA", "BAJA"]).optional(),
          dueInDays: z.number().optional().nullable(),
          isActive: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const result = await db.createActivityAutomationRule({
            activityType: input.activityType,
            taskTitle: input.taskTitle,
            taskDescription: input.taskDescription || null,
            roleId: input.roleId || null,
            category: input.category || "OTRO",
            priority: input.priority || "MEDIA",
            dueInDays: input.dueInDays ?? null,
            isActive: input.isActive ?? 1,
            organizationId: ctx.organizationId,
            createdBy: ctx.user.id,
          });
          return { success: true, id: result };
        }),

      update: coAdminOrgProcedure
        .input(z.object({
          id: z.number(),
          activityType: z.enum([
            "LLAMADA",
            "CORREO",
            "VISITA",
            "NOTA",
            "DOCUMENTO",
            "CAMBIO_ESTADO",
            "AJUSTACION_REALIZADA",
            "SCOPE_SOLICITADO",
            "SCOPE_RECIBIDO",
            "SCOPE_ENVIADO",
            "RESPUESTA_FAVORABLE",
            "RESPUESTA_NEGATIVA",
            "INICIO_APPRAISAL",
            "CARTA_APPRAISAL_ENVIADA",
            "RELEASE_LETTER_REQUERIDA",
            "ITEL_SOLICITADO",
            "REINSPECCION_SOLICITADA",
          ]).optional(),
          taskTitle: z.string().min(1).max(200).optional(),
          taskDescription: z.string().optional().nullable(),
          roleId: z.number().optional().nullable(),
          category: z.enum(["DOCUMENTACION", "SEGUIMIENTO", "ESTIMADO", "REUNION", "REVISION", "OTRO"]).optional(),
          priority: z.enum(["ALTA", "MEDIA", "BAJA"]).optional(),
          dueInDays: z.number().optional().nullable(),
          isActive: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          await db.updateActivityAutomationRule(input.id, ctx.organizationId, {
            activityType: input.activityType,
            taskTitle: input.taskTitle,
            taskDescription: input.taskDescription ?? undefined,
            roleId: input.roleId ?? undefined,
            category: input.category,
            priority: input.priority,
            dueInDays: input.dueInDays ?? undefined,
            isActive: input.isActive,
          });
          return { success: true };
        }),

      delete: coAdminOrgProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await db.deleteActivityAutomationRule(input.id, ctx.organizationId);
          return { success: true };
        }),
    }),

    // ============ NOTIFICATIONS ROUTER ============
  notifications: router({
    list: orgProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        return await db.getNotificationsByUser(ctx.organizationId, ctx.user.id, input.limit || 200);
      }),

    markRead: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.markNotificationRead(input.id, ctx.user.id, ctx.organizationId);
        return { success: true };
      }),
  }),

  billing: router({
    getStatus: orgBillingProcedure.query(async ({ ctx }) => {
      const trialDaysLeft = getTrialDaysLeft(ctx.organization);
      const allowedSeats = getAllowedSeats(ctx.organization);
      return {
        planTier: ctx.organization.planTier,
        planStatus: ctx.organization.planStatus,
        trialDaysLeft,
        allowedSeats,
        extraSeats: ctx.organization.extraSeats ?? 0,
        hasPaymentMethod: ctx.organization.hasPaymentMethod === 1,
        isComped: isComped(ctx.organization),
        billingCompedCode: ctx.organization.billingCompedCode ?? null,
      };
    }),

    applyCompedCode: orgBillingProcedure
      .input(z.object({
        code: z.string().min(1).max(64),
      }))
      .mutation(async ({ input, ctx }) => {
        const rawCode = input.code.trim();
        if (!rawCode) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon code is required" });
        }
        const configuredCode = ENV.billingCompedCode.trim();
        if (!configuredCode) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Coupon code is not configured" });
        }
        if (rawCode.toLowerCase() !== configuredCode.toLowerCase()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid coupon code" });
        }

        await db.updateOrganization(ctx.organizationId, {
          billingCompedCode: rawCode,
          billingCompedAt: new Date(),
          planStatus: "comped",
          stripeSubscriptionStatus: null,
          trialStartedAt: null,
          trialEndsAt: null,
          trialNotifiedAt: null,
        });

        return { success: true };
      }),

    createCheckoutSession: orgBillingProcedure
      .input(z.object({
        planTier: z.enum(["starter", "professional", "enterprise"]).optional(),
        requestedSeats: z.number().min(1).optional(),
        successPath: z.string().optional(),
        cancelPath: z.string().optional(),
        promotionCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const selectedTier = (input.planTier ?? ctx.organization.planTier ?? "starter") as "starter" | "professional" | "enterprise";
        const planConfig = getPlanConfig(selectedTier);
        if (!planConfig.priceId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe price not configured for plan" });
        }
        const memberCount = input.requestedSeats ?? await db.getOrganizationMemberCount(ctx.organizationId);
        const extraSeatsNeeded = Math.max(0, memberCount - planConfig.includedSeats);

        if (selectedTier !== ctx.organization.planTier) {
          await db.updateOrganization(ctx.organizationId, {
            planTier: selectedTier,
          });
        }

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
          { price: planConfig.priceId, quantity: 1 },
        ];
        if (extraSeatsNeeded > 0) {
          if (!ENV.stripePriceExtraSeat) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe price not configured for extra seats" });
          }
          lineItems.push({ price: ENV.stripePriceExtraSeat, quantity: extraSeatsNeeded });
        }

        let trialEndsAt = ctx.organization.trialEndsAt;
        if (!trialEndsAt) {
          const now = new Date();
          trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          await db.updateOrganization(ctx.organizationId, {
            trialStartedAt: now,
            trialEndsAt,
          });
        }
        const nowUnix = Math.floor(Date.now() / 1000);
        const trialEndUnix = trialEndsAt
          ? Math.floor(new Date(trialEndsAt).getTime() / 1000)
          : undefined;
        const trialEnd = trialEndUnix && trialEndUnix > nowUnix ? trialEndUnix : undefined;

        const trimmedPromotionCode = input.promotionCode?.trim();
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_collection: "if_required",
          allow_promotion_codes: trimmedPromotionCode ? undefined : true,
          client_reference_id: String(ctx.organizationId),
          customer: ctx.organization.stripeCustomerId ?? undefined,
          customer_email: ctx.organization.stripeCustomerId ? undefined : ctx.user?.email ?? undefined,
          line_items: lineItems,
          metadata: {
            organizationId: String(ctx.organizationId),
            planTier: selectedTier,
          },
          subscription_data: {
            metadata: {
              organizationId: String(ctx.organizationId),
              planTier: selectedTier,
            },
            trial_end: trialEnd,
          },
          discounts: trimmedPromotionCode ? [{ promotion_code: trimmedPromotionCode }] : undefined,
          success_url: `${ENV.appBaseUrl}${input.successPath ?? "/dashboard"}`,
          cancel_url: `${ENV.appBaseUrl}${input.cancelPath ?? "/billing?status=cancel"}`,
        });

        return { url: session.url };
      }),

    createPortalSession: orgBillingProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.organization.stripeCustomerId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe customer not found" });
        }
        const session = await stripe.billingPortal.sessions.create({
          customer: ctx.organization.stripeCustomerId,
          return_url: `${ENV.appBaseUrl}/billing`,
        });
        return { url: session.url };
      }),

      createSetupSession: orgBillingProcedure
        .input(z.object({
          successPath: z.string().optional(),
          cancelPath: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
        let customerId = ctx.organization.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: ctx.user?.email ?? undefined,
            name: ctx.organization.name ?? undefined,
            metadata: {
              organizationId: String(ctx.organizationId),
            },
          });
          customerId = customer.id;
          await db.updateOrganization(ctx.organizationId, { stripeCustomerId: customerId });
        }

        const session = await stripe.checkout.sessions.create({
          mode: "setup",
          customer: customerId,
          payment_method_types: ["card"],
          metadata: {
            organizationId: String(ctx.organizationId),
          },
          success_url: `${ENV.appBaseUrl}${input.successPath ?? "/billing?status=setup_success"}`,
          cancel_url: `${ENV.appBaseUrl}${input.cancelPath ?? "/billing?status=setup_cancel"}`,
        });

          return { url: session.url };
        }),

      applySeatCoupon: orgBillingProcedure
        .input(z.object({ code: z.string().min(1) }))
        .mutation(async ({ input, ctx }) => {
          const normalized = input.code.trim().toLowerCase();
          if (normalized !== "tres") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid coupon code" });
          }

          const currentExtraSeats = ctx.organization.extraSeats ?? 0;
          const newExtraSeats = currentExtraSeats + 1;
          await db.updateOrganization(ctx.organizationId, { extraSeats: newExtraSeats });
          return { extraSeats: newExtraSeats };
        }),

      addExtraSeat: orgBillingProcedure
        .mutation(async ({ ctx }) => {
        if (!ctx.organization.stripeSubscriptionId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe subscription not found" });
        }
        if (!ENV.stripePriceExtraSeat) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe price not configured for extra seats" });
        }

        const currentExtraSeats = ctx.organization.extraSeats ?? 0;
        const newExtraSeats = currentExtraSeats + 1;

        if (ctx.organization.stripeExtraItemId) {
          await stripe.subscriptionItems.update(ctx.organization.stripeExtraItemId, {
            quantity: newExtraSeats,
          });
        } else {
          const item = await stripe.subscriptionItems.create({
            subscription: ctx.organization.stripeSubscriptionId,
            price: ENV.stripePriceExtraSeat,
            quantity: newExtraSeats,
          });
          await db.updateOrganization(ctx.organizationId, { stripeExtraItemId: item.id });
        }

        await db.updateOrganization(ctx.organizationId, { extraSeats: newExtraSeats });
        return { extraSeats: newExtraSeats };
      }),
  }),

  // ============ ORGANIZATIONS ROUTER ============
  organizations: router({    // Verificar si el usuario tiene organización
    checkMembership: protectedProcedure.query(async ({ ctx }) => {
      const member = await db.getOrganizationMemberByUserId(ctx.user.id);
      if (!member) {
        return { hasMembership: false, member: null, organization: null };
      }
      const organization = await db.getOrganizationById(member.organizationId);
      if (!organization) {
        return { hasMembership: false, member: null, organization: null };
      }

      const trialDaysLeft = getTrialDaysLeft(organization);
      const accessBlocked = isAccessBlocked(organization);
      const allowedSeats = getAllowedSeats(organization);

      if (
        trialDaysLeft !== null &&
        trialDaysLeft <= 5 &&
        trialDaysLeft > 0 &&
        !organization.hasPaymentMethod &&
        !isComped(organization) &&
        !organization.trialNotifiedAt
      ) {
        await notifyOrganizationMembers({
          organizationId: organization.id,
          type: "EMAIL",
          title: "Free trial ending soon",
          body: `Your trial ends in ${trialDaysLeft} day(s). Add a payment method to keep access.`,
          entityType: "BILLING",
          entityId: String(organization.id),
        });
        await db.updateOrganization(organization.id, { trialNotifiedAt: new Date() });
      }

      return {
        hasMembership: true,
        member,
        organization,
        billing: {
          planTier: organization.planTier,
          planStatus: organization.planStatus,
          trialDaysLeft,
          accessBlocked,
          allowedSeats,
          extraSeats: organization.extraSeats ?? 0,
          hasPaymentMethod: organization.hasPaymentMethod === 1,
          isComped: isComped(organization),
          billingCompedCode: organization.billingCompedCode ?? null,
        },
      };
    }),

    // Crear organización (onboarding paso 2) - PUBLIC para permitir onboarding sin autenticación
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        businessType: z.string(),
        logo: z.string().optional().nullable(),
        planTier: z.enum(["starter", "professional", "enterprise"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.organizationMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ya tienes una organizacion asociada',
          });
        }

        if (ctx.user?.loginMethod !== 'google') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Debes iniciar sesion con Google para crear una organizacion',
          });
        }

        let ownerUser = ctx.user ?? null;
        if (!ownerUser) {
          // Crear usuario temporal para el admin si no existe
          const tempOpenId = `onboarding-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          await db.upsertUser({
            openId: tempOpenId,
            name: 'Admin Temporal',
            email: null,
            loginMethod: 'onboarding',
            role: 'user',
          });

          const tempUser = await db.getUserByOpenId(tempOpenId);
          if (!tempUser) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Error al crear usuario temporal'
            });
          }

          ownerUser = tempUser;
        }

        // Crear organizaciA3n
        const baseSlug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-+|-+$)/g, '');
        const slugBaseForSuffix = baseSlug || `org-${Date.now()}`;
        let slug = slugBaseForSuffix;
        let slugSuffix = 1;
        while (await db.getOrganizationBySlug(slug)) {
          slugSuffix += 1;
          slug = `${slugBaseForSuffix}-${slugSuffix}`;
        }
        const planTier = input.planTier ?? "starter";
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        const orgId = await db.createOrganization({
          name: input.name,
          slug,
          businessType: input.businessType,
          logo: input.logo,
          ownerId: ownerUser.id,
          planTier,
          planStatus: "trialing",
          trialStartedAt: now,
          trialEndsAt,
        });

        // Crear miembro admin con username y password
        const adminUsernameBase = `admin@${slug}.internal`;
        let adminUsername = adminUsernameBase;
        let adminSuffix = 1;
        while (await db.getOrganizationMemberByUsername(adminUsername)) {
          adminSuffix += 1;
          adminUsername = `admin${adminSuffix}@${slug}.internal`;
        }
        const adminPassword = generatePassword(10);
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        await db.createOrganizationMember({
          organizationId: orgId,
          userId: ownerUser.id,
          role: 'ADMIN',
          username: adminUsername,
          password: adminPasswordHash,
        });


        return {
          organizationId: orgId,
        };
      }),

    inviteMember: adminOrgProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["ADMIN", "CO_ADMIN", "VENDEDOR"]).default("VENDEDOR"),
      }))
      .mutation(async ({ input, ctx }) => {
        const organization = await db.getOrganizationById(ctx.organizationId);
        if (!organization) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }

        const memberCount = await db.getOrganizationMemberCount(ctx.organizationId);
        const allowedSeats = getAllowedSeats(organization);
        if (allowedSeats > 0 && memberCount >= allowedSeats) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "SEAT_LIMIT_REACHED" });
        }

        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          const existingMember = await db.getOrganizationMemberByUserId(existingUser.id);
          if (existingMember) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "User already belongs to an organization" });
          }
        }

      const token = generateToken(32);
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + ENV.inviteTokenHours * 60 * 60 * 1000);
      const existingInvite = await db.getOrganizationInviteByEmail(ctx.organizationId, input.email);
      if (existingInvite) {
        if (existingInvite.acceptedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite already accepted" });
        }
        await db.updateOrganizationInvite(existingInvite.id, {
          tokenHash,
          expiresAt,
          invitedBy: ctx.user.id,
          role: input.role,
          revokedAt: null,
          createdAt: new Date(),
        });
      } else {
        await db.createOrganizationInvite({
          organizationId: ctx.organizationId,
          email: input.email,
          role: input.role,
          tokenHash,
          invitedBy: ctx.user.id,
          expiresAt,
        });
      }

        const inviteUrl = `${ENV.appBaseUrl}/invite?token=${token}`;
        const email = buildInviteEmail({
          organizationName: organization.name,
          invitedBy: ctx.user.name || ctx.user.email || "Your admin",
          inviteUrl,
        });

        await sendEmail({
          to: input.email,
          subject: email.subject,
          html: email.html,
        });

        return { success: true };
      }),

    listInvites: adminOrgProcedure
      .query(async ({ ctx }) => {
        return await db.listOrganizationInvites(ctx.organizationId);
      }),

    revokeInvite: adminOrgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const invite = await db.getOrganizationInviteById(input.id);
        if (!invite || invite.organizationId != ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        }
        await db.updateOrganizationInvite(invite.id, { revokedAt: new Date() });
        return { success: true };
      }),
    deleteInvite: adminOrgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const invite = await db.getOrganizationInviteById(input.id);
        if (!invite || invite.organizationId != ctx.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
        }
        const isExpired = invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now();
        if (!invite.revokedAt && !isExpired) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only revoked or expired invites can be deleted" });
        }
        await db.deleteOrganizationInvite(invite.id);
        return { success: true };
      }),

      acceptInvite: publicProcedure
        .input(z.object({
          token: z.string().min(10),
          name: z.string().min(2),
          password: z.string().min(8),
        }))
        .mutation(async ({ input, ctx }) => {
          const tokenHash = hashToken(input.token);
          const invite = await db.getOrganizationInviteByTokenHash(tokenHash);
          if (!invite) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired invite" });
          }

        if (invite.revokedAt || invite.acceptedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite already used" });
        }

        if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite expired" });
        }

        let user = await db.getUserByEmail(invite.email);
        if (user) {
          const existingMember = await db.getOrganizationMemberByUserId(user.id);
          if (existingMember) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "User already belongs to an organization" });
          }
        } else {
          const openId = `invite-${Date.now()}-${generateToken(8)}`;
          await db.upsertUser({
            openId,
            name: input.name,
            email: invite.email,
            loginMethod: "invite",
            role: "user",
          });
          user = await db.getUserByOpenId(openId);
        }

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
        }

        const organization = await db.getOrganizationById(invite.organizationId);
        if (!organization) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }
        const memberCount = await db.getOrganizationMemberCount(invite.organizationId);
        const allowedSeats = getAllowedSeats(organization);
        if (allowedSeats > 0 && memberCount >= allowedSeats) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "SEAT_LIMIT_REACHED" });
        }

        let username = invite.email;
        let suffix = 1;
        while (await db.getOrganizationMemberByUsername(username)) {
          suffix += 1;
          const parts = invite.email.split("@");
          username = `${parts[0]}+${suffix}@${parts[1]}`;
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
          await db.createOrganizationMember({
            organizationId: invite.organizationId,
            userId: user.id,
            role: invite.role,
            username,
            password: passwordHash,
          });

          await db.updateOrganizationInvite(invite.id, { acceptedAt: new Date() });
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || input.name || "",
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          return { success: true };
        }),

    // Obtener mi organización
    getMyOrganization: orgProcedure.query(async ({ ctx }) => {
      return await db.getOrganizationById(ctx.organizationId);
    }),

    // Listar miembros de mi organización
    getMembers: orgProcedure.query(async ({ ctx }) => {
      return await db.getOrganizationMembers(ctx.organizationId);
    }),

    // Actualizar rol de un miembro (solo ADMIN)
    updateMemberRole: orgProcedure
      .input(z.object({
        memberId: z.number(),
        newRole: z.enum(["ADMIN", "CO_ADMIN", "VENDEDOR"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar que el usuario actual sea ADMIN
        if (ctx.memberRole !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo administradores pueden cambiar roles',
          });
        }

        // Actualizar rol del miembro
        await db.updateOrganizationMember(input.memberId, {
          role: input.newRole,
        });

        return { success: true };
      }),

    // Eliminar miembro (solo ADMIN)
    deleteMember: orgProcedure
      .input(z.object({ memberId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar que el usuario actual sea ADMIN
        if (ctx.memberRole !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo administradores pueden eliminar miembros',
          });
        }

        // No permitir que el admin se elimine a sí mismo
        const member = await db.getOrganizationMemberById(input.memberId);
        if (member && member.userId === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No puedes eliminarte a ti mismo',
          });
        }

        await db.deleteOrganizationMember(input.memberId);
        return { success: true };
      }),

    // Agregar nuevo miembro (solo ADMIN)
    addMember: orgProcedure
      .input(z.object({
        username: z.string(),
        password: z.string().min(8),
        role: z.enum(["ADMIN", "CO_ADMIN", "VENDEDOR"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar que el usuario actual sea ADMIN
        if (ctx.memberRole !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo administradores pueden agregar miembros',
          });
        }

        // Verificar que el username no exista
        const existingMember = await db.getOrganizationMemberByUsername(input.username);
        if (existingMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'El nombre de usuario ya existe',
          });
        }

        const memberCount = await db.getOrganizationMemberCount(ctx.organizationId);
        const organization = await db.getOrganizationById(ctx.organizationId);
        if (!organization) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }
        const allowedSeats = getAllowedSeats(organization);
        if (allowedSeats > 0 && memberCount >= allowedSeats) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "SEAT_LIMIT_REACHED" });
        }

        // Hashear contraseña
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Crear usuario dummy
        const dummyOpenId = `manual-${ctx.organizationId}-${Date.now()}`;
        await db.upsertUser({
          openId: dummyOpenId,
          name: input.username,
          email: null,
          loginMethod: 'internal',
          role: 'user',
        });

        const newUser = await db.getUserByOpenId(dummyOpenId);

        // Crear miembro de organización
        await db.createOrganizationMember({
          organizationId: ctx.organizationId,
          userId: newUser!.id,
          role: input.role,
          username: input.username,
          password: passwordHash,
        });

        return { success: true };
      }),

    // Resetear contraseña de un miembro (solo ADMIN)
    resetMemberPassword: orgProcedure
      .input(z.object({ memberId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verificar que el usuario actual sea ADMIN
        if (ctx.memberRole !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo administradores pueden resetear contraseñas',
          });
        }

        // Generar nueva contraseña temporal
        const newPassword = generatePassword(10);
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña del miembro
        await db.updateOrganizationMember(input.memberId, {
          password: passwordHash,
        });

        return {
          success: true,
          newPassword, // Retornar la contraseña temporal para mostrarla al admin
        };
      }),
  }),

  // Router de estados de reclamo personalizados
  customClaimStatuses: router({
    // Listar estados personalizados de la organización
    list: orgProcedure.query(async ({ ctx }) => {
      return await db.getCustomClaimStatuses(ctx.organizationId);
    }),

    // Crear nuevo estado personalizado (solo ADMIN y CO_ADMIN)
    create: coAdminOrgProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        displayName: z.string().min(1).max(100),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createCustomClaimStatus({
          name: input.name,
          displayName: input.displayName,
          color: input.color || null,
          sortOrder: input.sortOrder || 0,
          isActive: 1,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
        });
        return { success: true, id: result };
      }),

    // Eliminar estado personalizado (solo ADMIN y CO_ADMIN)
    delete: coAdminOrgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // TODO: Verificar que el estado no esté en uso por ningún cliente
        // const clientsUsingStatus = await db.getClientsWithCustomStatus(input.id);
        // if (clientsUsingStatus.length > 0) {
        //   throw new TRPCError({
        //     code: 'BAD_REQUEST',
        //     message: 'No se puede eliminar un estado que está en uso por clientes',
        //   });
        // }

        await db.deleteCustomClaimStatus(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
