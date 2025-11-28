import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateClientId } from "./utils/generateClientId";
import { generatePassword } from "./utils/generatePassword";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

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
const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.organizationMember) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Usuario no pertenece a ninguna organización. Completa el proceso de onboarding.'
    });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationMember.organizationId,
      memberRole: ctx.organizationMember.role
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

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    // Login con username/password para miembros de organización
    loginWithCredentials: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar miembro por username
        const member = await db.getOrganizationMemberByUsername(input.username);
        if (!member) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Usuario o contraseña incorrectos',
          });
        }

        // Verificar contraseña
        const isValid = await bcrypt.compare(input.password, member.password);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Usuario o contraseña incorrectos',
          });
        }

        // Obtener usuario asociado
        const user = await db.getUserById(member.userId);
        if (!user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error al obtener información del usuario',
          });
        }

        // Crear sesión JWT (igual que OAuth)
        const { sdk } = await import('./_core/sdk');
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || input.username,
        });

        // Establecer cookie de sesión
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: member.role,
            organizationId: member.organizationId,
          },
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Cambiar contraseña (requiere contraseña actual)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Obtener miembro de organización del usuario actual
        const member = await db.getOrganizationMemberByUserId(ctx.user.id);
        if (!member) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Usuario no encontrado en ninguna organización',
          });
        }

        // Verificar contraseña actual
        const isValid = await bcrypt.compare(input.currentPassword, member.password);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Contraseña actual incorrecta',
          });
        }

        // Hashear nueva contraseña
        const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

        // Actualizar contraseña
        await db.updateOrganizationMember(member.id, {
          password: newPasswordHash,
        });

        return { success: true };
      }),
  }),

  // ============ CLIENTS ROUTER ============
  clients: router({
    // Listar todos los clientes
    list: orgProcedure.query(async ({ ctx }) => {
      return await db.getAllClients(ctx.organizationId);
    }),

    // Obtener cliente por ID
    getById: orgProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const client = await db.getClientById(input.id, ctx.organizationId);
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente no encontrado' });
        }
        return client;
      }),

    // Buscar clientes por nombre
    search: orgProcedure
      .input(z.object({ searchTerm: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.searchClientsByName(input.searchTerm, ctx.organizationId);
      }),

    // Crear nuevo cliente
    create: orgProcedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional().nullable(),
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
        estimatedLoss: z.number().optional().nullable(),
        actualPayout: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
        constructionStatus: z.string().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generar ID personalizado
        const customId = generateClientId(
          input.city || "",
          input.firstName,
          input.lastName
        );

        const result = await db.createClient({
          ...input,
          id: customId,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });

        // Crear log de auditoría
        await db.createAuditLog({
          entityType: "CLIENT",
          entityId: 0, // No aplicable para IDs de texto
          action: "CREATE",
          performedBy: ctx.user.id,
        });

        return result;
      }),

    // Actualizar cliente
    update: orgProcedure
      .input(z.object({
        id: z.string(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional().nullable(),
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
          estimatedLoss: z.number().optional().nullable(),
          insuranceEstimate: z.number().optional().nullable(),
          firstCheckAmount: z.number().optional().nullable(),
          actualPayout: z.number().optional().nullable(),
          notes: z.string().optional().nullable(),
          internalNotes: z.string().optional().nullable(),
          constructionStatus: z.string().optional().nullable(),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        const updated = await db.updateClient(input.id, ctx.organizationId, {
          ...input.data,
          updatedBy: ctx.user.id,
        });

        // Crear log de auditoría para campos importantes
        await db.createAuditLog({
          entityType: "CLIENT",
          entityId: 0, // No aplicable para IDs de texto
          action: "UPDATE",
          performedBy: ctx.user.id,
        });

        return updated;
      }),

    // Eliminar cliente (solo admin y co-admin)
    delete: coAdminOrgProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // TODO: Verificar que sea admin de la organización
        await db.deleteClient(input.id, ctx.organizationId);

        await db.createAuditLog({
          entityType: "CLIENT",
          entityId: 0, // No aplicable para IDs de texto
          action: "DELETE",
          performedBy: ctx.user.id,
        });

        return { success: true };
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
        activityType: z.enum(["LLAMADA", "CORREO", "VISITA", "NOTA", "DOCUMENTO", "CAMBIO_ESTADO"]),
        subject: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        outcome: z.string().optional().nullable(),
        contactMethod: z.string().optional().nullable(),
        duration: z.number().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createActivityLog({
          ...input,
          organizationId: ctx.organizationId,
          performedBy: ctx.user.id,
        });
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
        documentType: z.enum(["POLIZA", "CONTRATO", "FOTO", "ESTIMADO", "FACTURA", "PERMISO", "OTRO"]),
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
        return await db.createEvent({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
      }),

    // Actualizar evento
    update: orgProcedure
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
        const { id, ...data } = input;
        return await db.updateEvent(id, ctx.organizationId, {
          ...data,
          updatedBy: ctx.user.id,
        });
      }),

    // Eliminar evento (solo admin y co-admin)
    delete: coAdminOrgProcedure
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
        return await db.createTask({
          ...input,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
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

    // Eliminar tarea (solo admin y co-admin)
    delete: coAdminOrgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.deleteTask(input.id, ctx.organizationId);
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
      return { hasMembership: true, member, organization };
    }),

    // Crear organización (onboarding paso 2) - PUBLIC para permitir onboarding sin autenticación
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        businessType: z.string(),
        logo: z.string().optional().nullable(),
        memberCount: z.number().min(1).max(20),
      }))
      .mutation(async ({ input }) => {
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

        // Crear organización
        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const orgId = await db.createOrganization({
          name: input.name,
          slug,
          businessType: input.businessType,
          logo: input.logo,
          ownerId: tempUser.id,
        });

        // Crear miembro admin con username y password
        const adminUsername = `admin@${slug}.internal`;
        const adminPassword = generatePassword(10);
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        await db.createOrganizationMember({
          organizationId: orgId,
          userId: tempUser.id,
          role: 'ADMIN',
          username: adminUsername,
          password: adminPasswordHash,
        });

        // Generar usuarios automáticos
        const generatedUsers: Array<{ username: string; password: string; role: string }> = [];

        for (let i = 1; i < input.memberCount; i++) {
          const username = `usuario${i}@${slug}.internal`;
          const password = generatePassword(8);
          const passwordHash = await bcrypt.hash(password, 10);
          const role = i === 1 ? 'CO_ADMIN' : 'VENDEDOR';

          // Crear usuario dummy en tabla users (sin email real)
          const dummyUser = await db.upsertUser({
            openId: `dummy-${orgId}-${i}`,
            name: `Usuario ${i}`,
            email: null,
            loginMethod: 'internal',
            role: 'user',
          });

          const dummyUserId = await db.getUserByOpenId(`dummy-${orgId}-${i}`);

          // Crear miembro de organización
          await db.createOrganizationMember({
            organizationId: orgId,
            userId: dummyUserId!.id,
            role: role as "ADMIN" | "CO_ADMIN" | "VENDEDOR",
            username,
            password: passwordHash,
          });

          generatedUsers.push({ username, password, role });
        }

        // Agregar credenciales del admin al principio de la lista
        generatedUsers.unshift({
          username: adminUsername,
          password: adminPassword,
          role: 'ADMIN',
        });

        return {
          organizationId: orgId,
          generatedUsers,
        };
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
