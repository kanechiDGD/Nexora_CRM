# Arquitectura Multi-Tenant del CRM

## Resumen

Este CRM implementa una arquitectura multi-tenant donde múltiples organizaciones comparten la misma base de datos pero sus datos están completamente aislados mediante el campo `organizationId`.

## Modelo de Datos

### Tabla: `organizations`

```sql
CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo TEXT,
  businessType VARCHAR(100),
  maxMembers INT DEFAULT 20,
  ownerId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(id)
);
```

### Tabla: `organizationMembers`

```sql
CREATE TABLE organizationMembers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('ADMIN', 'CO_ADMIN', 'VENDEDOR') DEFAULT 'VENDEDOR',
  username VARCHAR(100) UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_org_user (organizationId, userId)
);
```

### Tablas Existentes (Agregar `organizationId`)

Todas las tablas de datos deben incluir:
```sql
ALTER TABLE clients ADD COLUMN organizationId INT NOT NULL;
ALTER TABLE events ADD COLUMN organizationId INT NOT NULL;
ALTER TABLE tasks ADD COLUMN organizationId INT NOT NULL;
ALTER TABLE activityLogs ADD COLUMN organizationId INT NOT NULL;
ALTER TABLE documents ADD COLUMN organizationId INT NOT NULL;
ALTER TABLE constructionProjects ADD COLUMN organizationId INT NOT NULL;

-- Crear índices para optimizar queries
CREATE INDEX idx_clients_org ON clients(organizationId);
CREATE INDEX idx_events_org ON events(organizationId);
CREATE INDEX idx_tasks_org ON tasks(organizationId);
CREATE INDEX idx_activityLogs_org ON activityLogs(organizationId);
CREATE INDEX idx_documents_org ON documents(organizationId);
CREATE INDEX idx_constructionProjects_org ON constructionProjects(organizationId);
```

## Roles y Permisos

### ADMIN (Administrador Principal)
- Control total sobre el CRM
- Gestión de organización (cambiar nombre, logo)
- Gestión de usuarios (agregar, eliminar, cambiar roles)
- Crear, editar, eliminar clientes, eventos, tareas, logs
- Ver todos los reportes y analytics

### CO_ADMIN (Co-Administrador)
- Control total sobre el CRM
- **NO** puede cambiar nombre/logo de organización
- **NO** puede gestionar usuarios
- Crear, editar, eliminar clientes, eventos, tareas, logs
- Ver todos los reportes y analytics

### VENDEDOR (Vendedor/Usuario Básico)
- Ver todo el CRM (solo lectura)
- Crear clientes, eventos, tareas, logs
- **NO** puede editar o eliminar nada
- Ver reportes básicos (sin analytics avanzados)

## Flujo de Onboarding

### Paso 1: Registro
1. Usuario se registra con OAuth de Manus
2. Sistema verifica si ya pertenece a una organización
3. Si no, redirige a wizard de creación de organización

### Paso 2: Información de Organización
1. Nombre de la organización
2. Tipo de negocio (dropdown):
   - Public Adjusters
   - Insurance
   - Real Estate
   - Construction
   - Legal
   - Healthcare
   - Other
3. Logo (opcional, puede subir después)

### Paso 3: Generación de Usuarios
1. Admin selecciona cantidad de miembros (1-20)
2. Sistema genera usuarios automáticamente:
   - Username: `vendedor1`, `vendedor2`, `coadmin1`, etc.
   - Email interno: `vendedor1@[org-slug].internal`
   - Password: Aleatoria de 8 caracteres (letras + números)
3. Muestra tabla con credenciales
4. Permite descargar CSV
5. Envía email al admin con credenciales

## Aislamiento de Datos

### En el Backend (tRPC Procedures)

Todos los procedures deben incluir filtro por `organizationId`:

```typescript
// Ejemplo: Listar clientes
list: protectedProcedure.query(async ({ ctx }) => {
  const member = await getOrganizationMember(ctx.user.id);
  if (!member) throw new TRPCError({ code: 'FORBIDDEN' });
  
  return db.getClientsByOrganization(member.organizationId);
});
```

### En el Frontend

El hook `useAuth()` incluye:
```typescript
{
  user: User,
  organizationId: number,
  role: 'ADMIN' | 'CO_ADMIN' | 'VENDEDOR',
  canEdit: boolean,
  canDelete: boolean,
  canManageUsers: boolean,
  canManageOrg: boolean
}
```

## Middleware de Autorización

```typescript
// server/routers.ts
const adminOnlyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const member = await getOrganizationMember(ctx.user.id);
  if (!member || member.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { ...ctx, organizationId: member.organizationId, role: member.role } });
});

const coAdminOrHigherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const member = await getOrganizationMember(ctx.user.id);
  if (!member || !['ADMIN', 'CO_ADMIN'].includes(member.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { ...ctx, organizationId: member.organizationId, role: member.role } });
});
```

## Límites y Restricciones

- Máximo 20 usuarios por organización
- Un usuario solo puede pertenecer a una organización
- El owner (creador) siempre es ADMIN y no puede ser eliminado
- Solo ADMIN puede cambiar logo y nombre de organización
- Solo ADMIN puede gestionar usuarios (agregar, eliminar, cambiar roles)

## Branding Personalizado

Cada organización puede personalizar:
- Logo (mostrado en dashboard y header)
- Nombre de la organización (mostrado en título de página)

El sistema usa:
```typescript
// client/src/contexts/OrganizationContext.tsx
const { organization } = useOrganization();
// organization.logo, organization.name
```

## Seguridad

- Todos los queries incluyen filtro por `organizationId`
- Middleware verifica permisos antes de ejecutar acciones
- Frontend oculta botones según permisos del usuario
- Backend siempre valida permisos (nunca confiar solo en frontend)
- Contraseñas temporales deben ser cambiadas en primer login
