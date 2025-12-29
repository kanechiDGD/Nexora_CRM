import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabla de organizaciones para sistema multi-tenant
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logo: text("logo"),
  businessType: varchar("businessType", { length: 100 }),
  maxMembers: int("maxMembers").default(20).notNull(),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Tabla de miembros de organizaciones con roles
 */
export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["ADMIN", "CO_ADMIN", "VENDEDOR"]).default("VENDEDOR").notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // Bcrypt hash
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

/**
 * Invitations to join an organization by email.
 */
export const organizationInvites = mysqlTable("organizationInvites", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["ADMIN", "CO_ADMIN", "VENDEDOR"]).default("VENDEDOR").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
});

export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type InsertOrganizationInvite = typeof organizationInvites.$inferInsert;

/**
 * Password reset tokens for org members.
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Tabla de clientes con 40 campos para gestión completa de casos
 */
export const clients = mysqlTable("clients", {
  id: varchar("id", { length: 50 }).primaryKey(), // Formato: [2 letras ciudad][YYYYMMDD][iniciales] ej: CH20250114JD
  // Información de contacto
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  alternatePhone: varchar("alternatePhone", { length: 20 }),

  // Información de propiedad
  propertyAddress: text("propertyAddress"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 10 }),
  propertyType: varchar("propertyType", { length: 50 }), // Residential, Commercial, etc.

  // Información de aseguradora
  insuranceCompany: varchar("insuranceCompany", { length: 200 }),
  policyNumber: varchar("policyNumber", { length: 100 }),
  claimNumber: varchar("claimNumber", { length: 100 }),
  deductible: int("deductible"),
  coverageAmount: int("coverageAmount"),

  // Estado del reclamo (acepta estados predeterminados y personalizados)
  claimStatus: varchar("claimStatus", { length: 100 }).default("NO_SOMETIDA"),
  suplementado: mysqlEnum("suplementado", ["si", "no"]).default("no"),
  primerCheque: mysqlEnum("primerCheque", ["OBTENIDO", "PENDIENTE"]).default("PENDIENTE"),

  // Fechas importantes
  dateOfLoss: timestamp("dateOfLoss"),
  claimSubmittedDate: timestamp("claimSubmittedDate"),
  scheduledVisit: timestamp("scheduledVisit"),
  adjustmentDate: timestamp("adjustmentDate"),
  lastContactDate: timestamp("lastContactDate"),
  nextContactDate: timestamp("nextContactDate"),

  // Información del vendedor/agente
  salesPerson: varchar("salesPerson", { length: 100 }),
  assignedAdjuster: varchar("assignedAdjuster", { length: 100 }),

  // Documentos (URLs de Google Drive)
  policyDocumentUrl: text("policyDocumentUrl"),
  contractDocumentUrl: text("contractDocumentUrl"),
  photosUrl: text("photosUrl"),
  driveFolderId: varchar("driveFolderId", { length: 200 }),

  // Detalles adicionales
  damageType: text("damageType"), // Fire, Water, Wind, etc.
  damageDescription: text("damageDescription"),
  estimatedLoss: int("estimatedLoss"),
  insuranceEstimate: int("insuranceEstimate"), // Estimado que envió la aseguranza
  firstCheckAmount: int("firstCheckAmount"), // Cantidad del primer cheque
  actualPayout: int("actualPayout"),

  // Notas y observaciones
  notes: text("notes"),
  internalNotes: text("internalNotes"),

  // Información de construcción relacionada
  constructionStatus: varchar("constructionStatus", { length: 50 }),

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  // Auditoría
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Tabla de logs de actividad para seguimiento de interacciones
 */
export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("clientId", { length: 50 }).references(() => clients.id, { onDelete: "cascade" }),

  // Tipo de actividad
  activityType: mysqlEnum("activityType", ["LLAMADA", "CORREO", "VISITA", "NOTA", "DOCUMENTO", "CAMBIO_ESTADO"]).notNull(),

  // Detalles de la actividad
  subject: varchar("subject", { length: 200 }),
  description: text("description"),
  outcome: text("outcome"),

  // Información de contacto
  contactMethod: varchar("contactMethod", { length: 50 }),
  duration: int("duration"), // en minutos

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  // Auditoría
  performedBy: int("performedBy").notNull().references(() => users.id),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

/**
 * Tabla de proyectos de construcción
 */
export const constructionProjects = mysqlTable("constructionProjects", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("clientId", { length: 50 }).references(() => clients.id, { onDelete: "set null" }),

  // Información básica
  projectName: varchar("projectName", { length: 200 }).notNull(),
  propertyAddress: text("propertyAddress"),

  // Detalles de construcción
  roofType: varchar("roofType", { length: 100 }),
  roofColor: varchar("roofColor", { length: 50 }),
  roofSQ: int("roofSQ"), // Square footage
  sidingType: varchar("sidingType", { length: 100 }),
  sidingColor: varchar("sidingColor", { length: 50 }),
  sidingSQ: int("sidingSQ"),

  // Permisos y aprobaciones
  permitNumber: varchar("permitNumber", { length: 100 }),
  permitStatus: mysqlEnum("permitStatus", ["PENDIENTE", "APROBADO", "RECHAZADO", "NO_REQUERIDO"]).default("PENDIENTE"),
  permitDate: timestamp("permitDate"),

  // Fechas del proyecto
  startDate: timestamp("startDate"),
  estimatedCompletionDate: timestamp("estimatedCompletionDate"),
  actualCompletionDate: timestamp("actualCompletionDate"),

  // Estado y costos
  projectStatus: mysqlEnum("projectStatus", ["PLANIFICACION", "EN_PROGRESO", "PAUSADO", "COMPLETADO", "CANCELADO"]).default("PLANIFICACION"),
  estimatedCost: int("estimatedCost"),
  actualCost: int("actualCost"),

  // Contratistas y equipo
  contractor: varchar("contractor", { length: 200 }),
  projectManager: varchar("projectManager", { length: 100 }),

  // Notas
  notes: text("notes"),
  specialRequirements: text("specialRequirements"),

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  // Auditoría
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConstructionProject = typeof constructionProjects.$inferSelect;
export type InsertConstructionProject = typeof constructionProjects.$inferInsert;

/**
 * Tabla de documentos para gestión de archivos
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("clientId", { length: 50 }).references(() => clients.id, { onDelete: "cascade" }),
  constructionProjectId: int("constructionProjectId").references(() => constructionProjects.id, { onDelete: "cascade" }),

  // Información del documento
  documentType: mysqlEnum("documentType", ["POLIZA", "CONTRATO", "FOTO", "ESTIMADO", "FACTURA", "PERMISO", "OTRO"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),

  // Metadata
  description: text("description"),
  tags: text("tags"), // JSON array de tags

  // Google Drive info
  driveFileId: varchar("driveFileId", { length: 200 }),

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  // Auditoría
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Tabla de auditoría para cambios críticos
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),

  // Información de la entidad afectada
  entityType: mysqlEnum("entityType", ["CLIENT", "ACTIVITY_LOG", "CONSTRUCTION_PROJECT", "DOCUMENT", "USER"]).notNull(),
  entityId: int("entityId").notNull(),

  // Tipo de acción
  action: mysqlEnum("action", ["CREATE", "UPDATE", "DELETE"]).notNull(),

  // Cambios realizados
  fieldName: varchar("fieldName", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),

  // Auditoría
  performedBy: int("performedBy").notNull().references(() => users.id),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
/**
 * Tabla de eventos del calendario
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("clientId", { length: 50 }), // Opcional - puede ser evento general
  eventType: mysqlEnum("eventType", ["MEETING", "ADJUSTMENT", "ESTIMATE", "INSPECTION", "APPOINTMENT", "DEADLINE", "OTHER"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("eventDate").notNull(),
  eventTime: varchar("eventTime", { length: 10 }), // HH:MM format
  endTime: varchar("endTime", { length: 10 }),
  address: text("address"),

  // Campos específicos para ajustaciones
  adjusterNumber: varchar("adjusterNumber", { length: 100 }),
  adjusterName: varchar("adjusterName", { length: 200 }),
  adjusterPhone: varchar("adjusterPhone", { length: 20 }),
  adjusterEmail: varchar("adjusterEmail", { length: 320 }),
  insuranceCompany: varchar("insuranceCompany", { length: 200 }),
  claimNumber: varchar("claimNumber", { length: 100 }),

  // Metadata
  status: mysqlEnum("status", ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).default("SCHEDULED").notNull(),
  reminderSent: int("reminderSent").default(0), // boolean as int
  notes: text("notes"),

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Tabla de tareas del equipo
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("clientId", { length: 50 }), // Opcional - puede ser tarea general
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["DOCUMENTACION", "SEGUIMIENTO", "ESTIMADO", "REUNION", "REVISION", "OTRO"]).default("OTRO").notNull(),
  priority: mysqlEnum("priority", ["ALTA", "MEDIA", "BAJA"]).default("MEDIA").notNull(),
  status: mysqlEnum("status", ["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"]).default("PENDIENTE").notNull(),
  assignedTo: int("assignedTo"), // userId
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),

  // Documentos adjuntos (URLs separadas por comas)
  attachments: text("attachments"),

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  // Metadata
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Tabla de estados de reclamo personalizados
 * Permite a ADMIN y CO_ADMIN agregar estados adicionales al dropdown
 */
export const customClaimStatuses = mysqlTable("customClaimStatuses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Nombre del estado personalizado
  displayName: varchar("displayName", { length: 100 }).notNull(), // Nombre para mostrar en UI
  color: varchar("color", { length: 50 }), // Color opcional para el estado (hex o nombre)
  sortOrder: int("sortOrder").default(0), // Orden de visualización
  isActive: int("isActive").default(1).notNull(), // 1 = activo, 0 = inactivo

  // Multi-tenant
  organizationId: int("organizationId").notNull(),

  // Auditoría
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomClaimStatus = typeof customClaimStatuses.$inferSelect;
export type InsertCustomClaimStatus = typeof customClaimStatuses.$inferInsert;
