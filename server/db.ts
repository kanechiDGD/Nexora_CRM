import { and, eq } from "drizzle-orm";
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
  eventAttendees,
  InsertEventAttendee,
  notifications,
  InsertNotification,
  tasks,
  InsertTask,
  organizations,
  InsertOrganization,
  organizationMembers,
  InsertOrganizationMember,
  organizationInvites,
  InsertOrganizationInvite,
  passwordResetTokens,
  InsertPasswordResetToken,
  customClaimStatuses,
  InsertCustomClaimStatus,
  workflowRoles,
  InsertWorkflowRole,
  workflowRoleMembers,
  InsertWorkflowRoleMember,
  activityAutomationRules,
  InsertActivityAutomationRule,
  gmailAccounts,
  InsertGmailAccount,
  gmailThreads,
  InsertGmailThread,
  gmailMessages,
  InsertGmailMessage
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Typing for drizzle/mysql2 can be finicky with mysql2's dual callback/promise types.
// We keep _db as any to avoid type conflicts while still leveraging runtime safety.
let _db: any = null;
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

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const trimmedEmail = email?.trim();
  if (!trimmedEmail) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, trimmedEmail)).limit(1);
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
        eq(clients.claimStatus, "LISTA_PARA_CONSTRUIR")
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

export async function deleteAllClients(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  return await db.delete(clients).where(and(eq(clients.organizationId, organizationId)));
}

// ============ ACTIVITY LOGS ============

export async function getActivityLogsByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and } = await import('drizzle-orm');
  return await db.select({
    ...activityLogs,
    performedByName: users.name,
    performedByEmail: users.email,
  }).from(activityLogs)
    .leftJoin(users, eq(activityLogs.performedBy, users.id))
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
  return await db.select({
    ...activityLogs,
    performedByName: users.name,
    performedByEmail: users.email,
  }).from(activityLogs)
    .leftJoin(users, eq(activityLogs.performedBy, users.id))
    .where(eq(activityLogs.organizationId, organizationId))
    .orderBy(desc(activityLogs.performedAt))
    .limit(limit);
}

export async function getActivityLogsByOrganization(
  organizationId: number,
  activityTypes?: string[]
) {
  const db = await getDb();
  if (!db) return [];
  const { desc, inArray } = await import('drizzle-orm');
  const where = activityTypes && activityTypes.length > 0
    ? and(eq(activityLogs.organizationId, organizationId), inArray(activityLogs.activityType, activityTypes as any))
    : eq(activityLogs.organizationId, organizationId);
  return await db.select().from(activityLogs)
    .where(where)
    .orderBy(desc(activityLogs.performedAt));
}

export async function createActivityLog(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(activityLogs).values(data);
  return result;
}


export async function updateActivityLog(id: number, organizationId: number, data: Partial<InsertActivityLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.update(activityLogs).set(data).where(and(
    eq(activityLogs.id, id),
    eq(activityLogs.organizationId, organizationId)
  ));
}

export async function deleteActivityLog(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.delete(activityLogs).where(and(
    eq(activityLogs.id, id),
    eq(activityLogs.organizationId, organizationId)
  ));
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

export async function getConstructionProjectByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import('drizzle-orm');
  const result = await db.select().from(constructionProjects)
    .where(and(
      eq(constructionProjects.clientId, clientId),
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

export async function getDocumentsByOrganization(
  organizationId: number,
  documentTypes?: string[]
) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and, inArray } = await import('drizzle-orm');
  const where = documentTypes && documentTypes.length > 0
    ? and(eq(documents.organizationId, organizationId), inArray(documents.documentType, documentTypes as any))
    : eq(documents.organizationId, organizationId);
  return await db.select().from(documents)
    .where(where)
    .orderBy(desc(documents.uploadedAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return result;
}

export async function updateDocument(
  id: number,
  organizationId: number,
  data: Partial<Pick<InsertDocument, "documentType" | "description">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(documents)
    .set(data)
    .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));
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

// ============ GMAIL ============ 

export async function getGmailAccountByUserId(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gmailAccounts)
    .where(and(eq(gmailAccounts.userId, userId), eq(gmailAccounts.organizationId, organizationId)))
    .limit(1);
  return result[0] || null;
}

export async function getGmailAccountByEmail(email: string, organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gmailAccounts)
    .where(and(eq(gmailAccounts.email, email), eq(gmailAccounts.organizationId, organizationId)))
    .limit(1);
  return result[0] || null;
}

export async function upsertGmailAccount(data: InsertGmailAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(gmailAccounts)
    .where(and(eq(gmailAccounts.userId, data.userId), eq(gmailAccounts.organizationId, data.organizationId)))
    .limit(1);
  if (existing[0]) {
    await db.update(gmailAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gmailAccounts.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(gmailAccounts).values(data);
  return result;
}

export async function updateGmailAccount(id: number, organizationId: number, data: Partial<InsertGmailAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(gmailAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(gmailAccounts.id, id), eq(gmailAccounts.organizationId, organizationId)));
  return result;
}

export async function deactivateGmailAccount(id: number, organizationId: number) {
  return updateGmailAccount(id, organizationId, { isActive: 0 });
}

export async function getGmailThreadByThreadId(
  threadId: string,
  organizationId: number,
  clientId: string | null
) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [
    eq(gmailThreads.threadId, threadId),
    eq(gmailThreads.organizationId, organizationId),
  ];
  if (clientId) {
    conditions.push(eq(gmailThreads.clientId, clientId));
  }
  const result = await db.select().from(gmailThreads)
    .where(and(...conditions))
    .limit(1);
  return result[0] || null;
}

export async function createGmailThread(data: InsertGmailThread) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(gmailThreads).values(data);
}

export async function createGmailMessage(data: InsertGmailMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(gmailMessages).values(data);
}

export async function getGmailMessagesByClientId(clientId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  return await db.select().from(gmailMessages)
    .where(and(eq(gmailMessages.clientId, clientId), eq(gmailMessages.organizationId, organizationId)))
    .orderBy(desc(gmailMessages.sentAt));
}

export async function getGmailMessageByMessageId(messageId: string, organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gmailMessages)
    .where(and(eq(gmailMessages.messageId, messageId), eq(gmailMessages.organizationId, organizationId)))
    .limit(1);
  return result[0] || null;
}

export async function updateGmailThread(
  id: number,
  organizationId: number,
  data: Partial<InsertGmailThread>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(gmailThreads)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(gmailThreads.id, id), eq(gmailThreads.organizationId, organizationId)));
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

// ============ EVENT ATTENDEES ============

export async function getEventAttendees(eventId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { and } = await import('drizzle-orm');
  return await db.select({
    id: eventAttendees.id,
    eventId: eventAttendees.eventId,
    memberId: eventAttendees.memberId,
    role: organizationMembers.role,
    userId: organizationMembers.userId,
    userName: users.name,
    userEmail: users.email,
  }).from(eventAttendees)
    .leftJoin(organizationMembers, eq(eventAttendees.memberId, organizationMembers.id))
    .leftJoin(users, eq(organizationMembers.userId, users.id))
    .where(and(
      eq(eventAttendees.eventId, eventId),
      eq(eventAttendees.organizationId, organizationId)
    ));
}

export async function createEventAttendees(data: InsertEventAttendee[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.length) return;
  await db.insert(eventAttendees).values(data);
}

export async function replaceEventAttendees(eventId: number, organizationId: number, memberIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.delete(eventAttendees).where(and(
    eq(eventAttendees.eventId, eventId),
    eq(eventAttendees.organizationId, organizationId)
  ));
  if (!memberIds.length) return;
  const rows = memberIds.map((memberId) => ({
    eventId,
    memberId,
    organizationId,
  })) satisfies InsertEventAttendee[];
  await db.insert(eventAttendees).values(rows);
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

// ============ NOTIFICATIONS ============

export async function createNotifications(data: InsertNotification[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!data.length) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsByUser(organizationId: number, userId: number, limit: number = 200) {
  const db = await getDb();
  if (!db) return [];
  const { desc, and } = await import('drizzle-orm');
  return await db.select().from(notifications)
    .where(and(
      eq(notifications.organizationId, organizationId),
      eq(notifications.userId, userId)
    ))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number, userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { and } = await import('drizzle-orm');
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.id, id),
      eq(notifications.userId, userId),
      eq(notifications.organizationId, organizationId)
    ));
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

export async function getOrganizationByStripeCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId)).limit(1);
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

// ==================== Organization Invites ====================

export async function createOrganizationInvite(data: InsertOrganizationInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(organizationInvites).values(data);
}

export async function getOrganizationInviteByTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationInvites)
    .where(eq(organizationInvites.tokenHash, tokenHash))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrganizationInviteByEmail(organizationId: number, email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { and } = await import('drizzle-orm');
  const result = await db.select().from(organizationInvites)
    .where(and(
      eq(organizationInvites.organizationId, organizationId),
      eq(organizationInvites.email, email)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listOrganizationInvites(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(organizationInvites)
    .where(eq(organizationInvites.organizationId, organizationId));
}

export async function getOrganizationInviteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationInvites)
    .where(eq(organizationInvites.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOrganizationInvite(id: number, data: Partial<InsertOrganizationInvite>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(organizationInvites).set(data).where(eq(organizationInvites.id, id));
}

export async function deleteOrganizationInvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(organizationInvites).where(eq(organizationInvites.id, id));
}

// ==================== Password Reset Tokens ====================

export async function createPasswordResetToken(data: InsertPasswordResetToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(passwordResetTokens).values(data);
}

export async function getPasswordResetTokenByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePasswordResetToken(id: number, data: Partial<InsertPasswordResetToken>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(passwordResetTokens).set(data).where(eq(passwordResetTokens.id, id));
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

// ==================== Workflow Roles ====================

export async function getWorkflowRoles(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workflowRoles)
    .where(eq(workflowRoles.organizationId, organizationId));
}

export async function getWorkflowRoleById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workflowRoles)
    .where(and(eq(workflowRoles.id, id), eq(workflowRoles.organizationId, organizationId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWorkflowRole(data: InsertWorkflowRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(workflowRoles).values(data);
}

export async function updateWorkflowRole(id: number, organizationId: number, data: Partial<InsertWorkflowRole>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowRoles).set(data)
    .where(and(eq(workflowRoles.id, id), eq(workflowRoles.organizationId, organizationId)));
}

export async function deleteWorkflowRole(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workflowRoles)
    .where(and(eq(workflowRoles.id, id), eq(workflowRoles.organizationId, organizationId)));
}

export async function getWorkflowRoleMembers(roleId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workflowRoleMembers)
    .where(and(eq(workflowRoleMembers.roleId, roleId), eq(workflowRoleMembers.organizationId, organizationId)));
}

export async function getWorkflowRoleMembersByOrg(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workflowRoleMembers)
    .where(eq(workflowRoleMembers.organizationId, organizationId));
}

export async function deleteWorkflowRoleMembers(roleId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workflowRoleMembers)
    .where(and(eq(workflowRoleMembers.roleId, roleId), eq(workflowRoleMembers.organizationId, organizationId)));
}

export async function createWorkflowRoleMember(data: InsertWorkflowRoleMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(workflowRoleMembers).values(data);
}

// ==================== Activity Automation Rules ====================

export async function getActivityAutomationRules(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityAutomationRules)
    .where(eq(activityAutomationRules.organizationId, organizationId));
}

export async function getActiveAutomationRulesByActivityType(
  organizationId: number,
  activityType: string
) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityAutomationRules)
    .where(and(
      eq(activityAutomationRules.organizationId, organizationId),
      eq(activityAutomationRules.activityType, activityType),
      eq(activityAutomationRules.isActive, 1)
    ));
}

export async function getActivityAutomationRuleById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(activityAutomationRules)
    .where(and(eq(activityAutomationRules.id, id), eq(activityAutomationRules.organizationId, organizationId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createActivityAutomationRule(data: InsertActivityAutomationRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(activityAutomationRules).values(data);
}

export async function updateActivityAutomationRule(
  id: number,
  organizationId: number,
  data: Partial<InsertActivityAutomationRule>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(activityAutomationRules).set(data)
    .where(and(eq(activityAutomationRules.id, id), eq(activityAutomationRules.organizationId, organizationId)));
}

export async function deleteActivityAutomationRule(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(activityAutomationRules)
    .where(and(eq(activityAutomationRules.id, id), eq(activityAutomationRules.organizationId, organizationId)));
}

// ==================== Claim Status Statistics ====================

export async function getClientCountByClaimStatus(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  type ClientRecord = typeof clients.$inferSelect;

  const allClients = await db.select().from(clients)
    .where(eq(clients.organizationId, organizationId)) as ClientRecord[];

  type StatusEntry = {
    status: string;
    count: number;
    clients: Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
    }>;
  };

  const statusCounts = (allClients as ClientRecord[]).reduce<Record<string, StatusEntry>>((acc, client) => {
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
