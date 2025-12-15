import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  clients,
  InsertClient,
  activityLogs,
  InsertActivityLog,
  constructionProjects,
  InsertConstructionProject,
  documents,
  InsertDocument,
  auditLogs,
  InsertAuditLog,
  events,
  InsertEvent,
  tasks,
  InsertTask,
  organizations,
  InsertOrganization,
  organizationMembers,
  InsertOrganizationMember,
  customClaimStatuses,
  InsertCustomClaimStatus
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance with proper connection pooling
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create connection pool with proper configuration
      // NOTE: Pass DATABASE_URL directly as string, NOT as { uri: ... }
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL, // mysql2 accepts 'uri' for connection strings
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 30000,
        // acquireTimeout is not a valid option for createPool in some mysql2 versions or when passed this way
        // It belongs to pool.getConnection() options usually, or maybe it's just deprecated/invalid here.
        // Removing it to fix the warning.
        multipleStatements: false,
      });

      // Test the connection
      const connection = await _pool.getConnection();
      console.log("[Database] Connection pool established successfully");
      connection.release();

      // CRITICAL FIX: Use { client: pool } syntax for Drizzle
      _db = drizzle({ client: _pool });
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

// Graceful shutdown
export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    console.log("[Database] Connection pool closed");
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CLIENTS ============

export async function getAllClients(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients)
    .where(eq(clients.organizationId, organizationId))
    .orderBy(clients.createdAt);
}

export async function getClientById(id: string, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import('drizzle-orm');
  const result = await db.select().from(clients)
    .where(and(
      eq(clients.id, id),
      eq(clients.organizationId, organizationId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchClientsByName(searchTerm: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { or, like, sql, and } = await import('drizzle-orm');
  return await db.select().from(clients)
    .where(
      and(
        eq(clients.organizationId, organizationId),
        or(
          like(clients.firstName, `%${searchTerm}%`),
          like(clients.lastName, `%${searchTerm}%`),
          sql`CONCAT(${clients.firstName}, ' ', ${clients.lastName}) LIKE ${'%' + searchTerm + '%'}`
        )
      )
    );
}

// Helper function to convert empty strings to null
function cleanClientData(data: InsertClient): InsertClient {
  const cleaned: any = { ...data };

  // Convert empty strings to null for all optional fields
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === "") {
      cleaned[key] = null;
    }
  });

  return cleaned as InsertClient;
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cleanedData = cleanClientData(data);
  const result = await db.insert(clients).values(cleanedData);
  return result;
}

export async function updateClient(id: string, organizationId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.update(clients).set(data).where(and(
    eq(clients.id, id),
    eq(clients.organizationId, organizationId)
  ));
  return await getClientById(id, organizationId);
}

export async function deleteClient(id: string, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.delete(clients).where(and(
    eq(clients.id, id),
    eq(clients.organizationId, organizationId)
  ));
}

// KPI Queries
export async function getClientsWithLateContact(organizationId: number, daysThreshold: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const { sql, lt, and } = await import('drizzle-orm');
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  return await db.select().from(clients)
    .where(and(
      eq(clients.organizationId, organizationId),
      lt(clients.lastContactDate, thresholdDate)
    ));
}

export async function getClientsNotSupplemented(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select().from(clients)
    .where(and(
      eq(clients.organizationId, organizationId),
      eq(clients.suplementado, "no")
    ));
}

export async function getClientsPendingSubmission(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select().from(clients)
    .where(and(
      eq(clients.organizationId, organizationId),
      eq(clients.claimStatus, "NO_SOMETIDA")
    ));
}

export async function getClientsReadyForConstruction(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select().from(clients)
    .where(
      and(
        eq(clients.organizationId, organizationId),
        eq(clients.claimStatus, "APROVADA"),
        eq(clients.primerCheque, "OBTENIDO")
      )
    );
}

export async function getClientsWithUpcomingContact(organizationId: number, daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const { and, gte, lte } = await import('drizzle-orm');
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return await db.select().from(clients)
    .where(
      and(
        eq(clients.organizationId, organizationId),
        gte(clients.nextContactDate, today),
        lte(clients.nextContactDate, futureDate)
      )
    );
}

// ============ ACTIVITY LOGS ============

export async function getActivityLogsByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and } = await import('drizzle-orm');
  return await db.select().from(activityLogs)
    .where(and(
      eq(activityLogs.clientId, clientId),
      eq(activityLogs.organizationId, organizationId)
    ))
    .orderBy(desc(activityLogs.performedAt));
}

export async function getRecentActivityLogs(organizationId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import('drizzle-orm');
  return await db.select().from(activityLogs)
    .where(eq(activityLogs.organizationId, organizationId))
    .orderBy(desc(activityLogs.performedAt))
    .limit(limit);
}

export async function createActivityLog(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(activityLogs).values(data);
  return result;
}

// ============ CONSTRUCTION PROJECTS ============

export async function getAllConstructionProjects(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(constructionProjects)
    .where(eq(constructionProjects.organizationId, organizationId))
    .orderBy(constructionProjects.createdAt);
}

export async function getConstructionProjectById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import('drizzle-orm');
  const result = await db.select().from(constructionProjects)
    .where(and(
      eq(constructionProjects.id, id),
      eq(constructionProjects.organizationId, organizationId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchConstructionProjectsByName(searchTerm: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { like, and } = await import('drizzle-orm');
  return await db.select().from(constructionProjects)
    .where(and(
      eq(constructionProjects.organizationId, organizationId),
      like(constructionProjects.projectName, `%${searchTerm}%`)
    ));
}

export async function createConstructionProject(data: InsertConstructionProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(constructionProjects).values(data);
  return result;
}

export async function updateConstructionProject(id: number, organizationId: number, data: Partial<InsertConstructionProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.update(constructionProjects).set(data).where(and(
    eq(constructionProjects.id, id),
    eq(constructionProjects.organizationId, organizationId)
  ));
  return await getConstructionProjectById(id, organizationId);
}

// ============ DOCUMENTS ============

export async function getDocumentsByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and } = await import('drizzle-orm');
  return await db.select().from(documents)
    .where(and(
      eq(documents.clientId, clientId),
      eq(documents.organizationId, organizationId)
    ))
    .orderBy(desc(documents.uploadedAt));
}

export async function getDocumentsByConstructionProjectId(projectId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and } = await import('drizzle-orm');
  return await db.select().from(documents)
    .where(and(
      eq(documents.constructionProjectId, projectId),
      eq(documents.organizationId, organizationId)
    ))
    .orderBy(desc(documents.uploadedAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return result;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0] || null;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(documents).where(eq(documents.id, id));
  return result;
}

// ============ AUDIT LOGS ============

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditLogs).values(data);
  return result;
}

export async function getAuditLogsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and } = await import('drizzle-orm');
  return await db.select().from(auditLogs)
    .where(
      and(
        eq(auditLogs.entityType, entityType as any),
        eq(auditLogs.entityId, entityId)
      )
    )
    .orderBy(desc(auditLogs.performedAt));
}


// ============ EVENTS ============

export async function getAllEvents(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(events.eventDate);
}

export async function getEventById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import('drizzle-orm');
  const result = await db.select().from(events)
    .where(and(
      eq(events.id, id),
      eq(events.organizationId, organizationId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEventsByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select().from(events)
    .where(and(
      eq(events.clientId, clientId),
      eq(events.organizationId, organizationId)
    ))
    .orderBy(events.eventDate);
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(data);
  return result;
}

export async function updateEvent(id: number, organizationId: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.update(events).set(data).where(and(
    eq(events.id, id),
    eq(events.organizationId, organizationId)
  ));
  return { id, ...data };
}

export async function deleteEvent(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.delete(events).where(and(
    eq(events.id, id),
    eq(events.organizationId, organizationId)
  ));
  return { id };
}

// ============ TASKS ============

export async function getAllTasks(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks)
    .where(eq(tasks.organizationId, organizationId))
    .orderBy(tasks.createdAt);
}

export async function getTaskById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import('drizzle-orm');
  const result = await db.select().from(tasks)
    .where(and(
      eq(tasks.id, id),
      eq(tasks.organizationId, organizationId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTasksByAssignee(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select().from(tasks)
    .where(and(
      eq(tasks.assignedTo, userId),
      eq(tasks.organizationId, organizationId)
    ))
    .orderBy(tasks.dueDate);
}

export async function getTasksByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select().from(tasks)
    .where(and(
      eq(tasks.clientId, clientId),
      eq(tasks.organizationId, organizationId)
    ))
    .orderBy(tasks.dueDate);
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(data);
  return result;
}

export async function updateTask(id: number, organizationId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.update(tasks).set(data).where(and(
    eq(tasks.id, id),
    eq(tasks.organizationId, organizationId)
  ));
  return { id, ...data };
}

export async function deleteTask(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.delete(tasks).where(and(
    eq(tasks.id, id),
    eq(tasks.organizationId, organizationId)
  ));
  return { id };
}

// ============ ORGANIZATIONS ============

export async function createOrganization(data: InsertOrganization): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(organizations).values(data);
  // Obtener el último ID insertado
  const [inserted] = await db.select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.ownerId, data.ownerId))
    .orderBy(organizations.id)
    .limit(1);
  return inserted?.id || 0;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations)
    .where(eq(organizations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations)
    .where(eq(organizations.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(organizations).set(data).where(eq(organizations.id, id));
  return await getOrganizationById(id);
}

// ============ ORGANIZATION MEMBERS ============

export async function createOrganizationMember(data: InsertOrganizationMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(organizationMembers).values(data);
  return result;
}

export async function getOrganizationMemberByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationMembers)
    .where(eq(organizationMembers.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrganizationMemberByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;

  // Validación adicional para prevenir SQL errors
  if (!username || username.trim() === '') {
    console.warn('[DB] getOrganizationMemberByUsername called with empty username');
    return undefined;
  }

  // Simple retry logic for transient DB errors
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const result = await db.select().from(organizationMembers)
        .where(eq(organizationMembers.username, username)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error: any) {
      attempts++;
      console.error(`[DB] Error in getOrganizationMemberByUsername (Attempt ${attempts}/${maxAttempts}):`, error?.code || error);

      // If it's a connection error, retry
      if (
        (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND' || error?.cause?.code === 'ECONNRESET')
        && attempts < maxAttempts
      ) {
        console.log(`[DB] Retrying query after transient error...`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempts)); // Exponential backoff
        continue;
      }

      // If we exhausted retries or it's a different error, log and return undefined (or throw if critical)
      console.error('[DB] Failed to get member after retries or fatal error');
      console.error('[DB] Username was:', username);

      // Return undefined to treat as "User not found" or "Auth failed" rather than crashing
      // Ideally we should throw a specific error, but the caller expects member | undefined
      return undefined;
    }
  }
  return undefined;
}

export async function getOrganizationMembers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
}

export async function getOrganizationMemberById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationMembers)
    .where(eq(organizationMembers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrganizationMembersByOrgId(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
}

export async function updateOrganizationMember(id: number, data: Partial<InsertOrganizationMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(organizationMembers).set(data).where(eq(organizationMembers.id, id));
}

export async function deleteOrganizationMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
}

export async function getOrganizationMemberCount(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const members = await getOrganizationMembersByOrgId(organizationId);
  return members.length;
}

// ==================== Custom Claim Statuses ====================

export async function getCustomClaimStatuses(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customClaimStatuses)
    .where(eq(customClaimStatuses.organizationId, organizationId));
}

export async function createCustomClaimStatus(data: InsertCustomClaimStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customClaimStatuses).values(data);
  return result;
}

export async function deleteCustomClaimStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customClaimStatuses).where(eq(customClaimStatuses.id, id));
}

export async function getCustomClaimStatusById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customClaimStatuses)
    .where(eq(customClaimStatuses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== Claim Status Statistics ====================

export async function getClientCountByClaimStatus(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  // Obtener todos los clientes de la organización
  const allClients = await db.select().from(clients)
    .where(eq(clients.organizationId, organizationId));

  // Agrupar por claimStatus y contar
  const statusCounts = allClients.reduce((acc: any, client) => {
    const status = client.claimStatus || 'NO_SOMETIDA';
    if (!acc[status]) {
      acc[status] = {
        status,
        count: 0,
        clients: []
      };
    }
    acc[status].count++;
    acc[status].clients.push({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    });
    return acc;
  }, {});

  return Object.values(statusCounts);
}
