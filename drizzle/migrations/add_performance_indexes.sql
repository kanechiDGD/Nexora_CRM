-- Índices de optimización para producción
-- Ejecutar después de desplegar la aplicación

-- ============================================
-- CLIENTS - Índices para búsquedas frecuentes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clients_org_status 
  ON clients(organizationId, claimStatus);

CREATE INDEX IF NOT EXISTS idx_clients_org_name 
  ON clients(organizationId, lastName, firstName);

CREATE INDEX IF NOT EXISTS idx_clients_created 
  ON clients(createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_clients_city 
  ON clients(city);

-- ============================================
-- EVENTS - Índices para calendario y timeline
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_org_date 
  ON events(organizationId, eventDate DESC);

CREATE INDEX IF NOT EXISTS idx_events_client 
  ON events(clientId, eventDate DESC);

CREATE INDEX IF NOT EXISTS idx_events_created 
  ON events(createdAt DESC);

-- ============================================
-- TASKS - Índices para gestión de tareas
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_org_status 
  ON tasks(organizationId, status, dueDate);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned 
  ON tasks(assignedTo, status);

CREATE INDEX IF NOT EXISTS idx_tasks_client 
  ON tasks(clientId, dueDate DESC);

-- ============================================
-- ACTIVITY LOGS - Índices para historial
-- ============================================
CREATE INDEX IF NOT EXISTS idx_activity_logs_client 
  ON activityLogs(clientId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_org 
  ON activityLogs(organizationId, createdAt DESC);

-- ============================================
-- DOCUMENTS - Índices para archivos
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_client 
  ON documents(clientId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_documents_type 
  ON documents(documentType);

-- ============================================
-- CONSTRUCTION PROJECTS - Índices para construcción
-- ============================================
CREATE INDEX IF NOT EXISTS idx_construction_client 
  ON constructionProjects(clientId);

CREATE INDEX IF NOT EXISTS idx_construction_org 
  ON constructionProjects(organizationId, status);

-- ============================================
-- ORGANIZATION MEMBERS - Índices para usuarios
-- ============================================
CREATE INDEX IF NOT EXISTS idx_org_members_username 
  ON organizationMembers(username);

CREATE INDEX IF NOT EXISTS idx_org_members_org 
  ON organizationMembers(organizationId, role);

-- ============================================
-- ORGANIZATIONS - Índices para organizaciones
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug 
  ON organizations(slug);

CREATE INDEX IF NOT EXISTS idx_organizations_owner 
  ON organizations(ownerId);

-- Verificar índices creados
SHOW INDEX FROM clients;
SHOW INDEX FROM events;
SHOW INDEX FROM tasks;
SHOW INDEX FROM activityLogs;
SHOW INDEX FROM documents;
