# 📋 Documentación Completa del CRM para Public Adjusters

## 🎯 Descripción General

Aplicación CRM completa diseñada específicamente para firmas de public adjusters en Illinois. Combina un sitio público educativo con un sistema interno robusto de gestión de clientes, logs de actividad, tareas, eventos y proyectos de construcción.

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

**Frontend:**
- React 19.2.0
- TypeScript
- Tailwind CSS 4.x
- shadcn/ui (componentes)
- tRPC React Query
- Wouter (routing)
- React Big Calendar
- date-fns
- Lucide React (iconos)
- Sonner (toasts)

**Backend:**
- Node.js 22.13.0
- Express 4.x
- tRPC 11
- Drizzle ORM
- MySQL2 (TiDB)
- Zod (validación)
- JWT (autenticación)

**Base de Datos:**
- TiDB (MySQL compatible) en la nube
- 6 tablas principales
- Relaciones con claves foráneas
- Índices optimizados

**Servicios Externos:**
- Manus OAuth (autenticación)
- Google Sheets API (sincronización de datos)
- Google Drive API (gestión de archivos)
- S3 (almacenamiento de archivos)

---

## 📊 Estructura de Base de Datos

### Tabla: `users`
Almacena información de usuarios del sistema.

```typescript
{
  id: int (PK, auto-increment),
  openId: varchar(64) UNIQUE NOT NULL,
  name: text,
  email: varchar(320),
  loginMethod: varchar(64),
  role: enum('user', 'admin') DEFAULT 'user',
  createdAt: timestamp DEFAULT NOW(),
  updatedAt: timestamp ON UPDATE NOW(),
  lastSignedIn: timestamp DEFAULT NOW()
}
```

**Roles:**
- `admin`: Acceso completo (owner del proyecto)
- `user`: Acceso estándar

### Tabla: `clients`
Almacena información completa de clientes (40+ campos).

```typescript
{
  // Identificación
  id: int (PK, auto-increment),
  firstName: varchar(100) NOT NULL,
  lastName: varchar(100) NOT NULL,
  phone: varchar(20),
  email: varchar(320),
  alternatePhone: varchar(20),
  
  // Dirección de Propiedad
  propertyAddress: text,
  city: varchar(100),
  state: varchar(2) DEFAULT 'IL',
  zipCode: varchar(10),
  county: varchar(100),
  
  // Información de Aseguradora
  insuranceCompany: varchar(200),
  policyNumber: varchar(100),
  claimNumber: varchar(100),
  adjusterName: varchar(200),
  adjusterPhone: varchar(20),
  adjusterEmail: varchar(320),
  
  // Información del Reclamo
  dateOfLoss: date,
  typeOfDamage: varchar(100),
  claimStatus: enum('INICIAL', 'EN_PROCESO', 'SUPLEMENTO', 'APROBADO', 'RECHAZADO', 'CERRADO'),
  claimAmount: decimal(12,2),
  settlementAmount: decimal(12,2),
  
  // Fechas Importantes
  lastContactDate: date,
  scheduledVisitDate: datetime,
  adjustmentDate: datetime,
  
  // Estado del Cliente
  status: varchar(50),
  isSupplemented: boolean DEFAULT false,
  readyForConstruction: boolean DEFAULT false,
  
  // Equipo Asignado
  assignedTo: varchar(200),
  teamMember: varchar(200),
  
  // Documentación
  policyDocumentUrl: text,
  contractUrl: text,
  photosUrl: text,
  
  // Notas
  notes: text,
  internalNotes: text,
  
  // Auditoría
  createdAt: timestamp DEFAULT NOW(),
  updatedAt: timestamp ON UPDATE NOW(),
  createdBy: int (FK -> users.id)
}
```

### Tabla: `activityLogs`
Registro de todas las actividades relacionadas con clientes.

```typescript
{
  id: int (PK, auto-increment),
  clientId: int (FK -> clients.id, nullable),
  activityType: enum('LLAMADA', 'CORREO', 'VISITA', 'NOTA', 'DOCUMENTO', 'CAMBIO_ESTADO'),
  subject: varchar(200) NOT NULL,
  description: text,
  performedBy: int (FK -> users.id),
  performedAt: timestamp DEFAULT NOW(),
  createdAt: timestamp DEFAULT NOW()
}
```

### Tabla: `constructionProjects`
Proyectos de construcción para clientes aprobados.

```typescript
{
  id: int (PK, auto-increment),
  clientId: int (FK -> clients.id) NOT NULL,
  projectName: varchar(200),
  contractor: varchar(200),
  contractorPhone: varchar(20),
  contractorEmail: varchar(320),
  
  // Detalles del Proyecto
  roofType: varchar(100),
  sidingType: varchar(100),
  roofColor: varchar(50),
  sidingColor: varchar(50),
  squareFootage: decimal(10,2),
  
  // Fechas
  startDate: date,
  estimatedCompletionDate: date,
  actualCompletionDate: date,
  
  // Permisos
  permitNumber: varchar(100),
  permitStatus: varchar(50),
  permitDate: date,
  
  // Financiero
  budget: decimal(12,2),
  actualCost: decimal(12,2),
  
  // Estado
  status: enum('PLANIFICACION', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'),
  
  // Notas
  notes: text,
  
  // Auditoría
  createdAt: timestamp DEFAULT NOW(),
  updatedAt: timestamp ON UPDATE NOW()
}
```

### Tabla: `events`
Eventos del calendario (reuniones, ajustaciones, estimados, etc.).

```typescript
{
  id: int (PK, auto-increment),
  eventType: enum('MEETING', 'ADJUSTMENT', 'ESTIMATE', 'INSPECTION', 'APPOINTMENT', 'DEADLINE', 'OTHER'),
  title: varchar(200) NOT NULL,
  description: text,
  
  // Fecha y Hora
  eventDate: datetime NOT NULL,
  eventTime: varchar(5),
  endTime: varchar(5),
  
  // Ubicación
  address: text,
  
  // Cliente Relacionado
  clientId: int (FK -> clients.id, nullable),
  
  // Campos Específicos para Ajustaciones
  adjusterNumber: varchar(100),
  adjusterName: varchar(200),
  adjusterPhone: varchar(20),
  adjusterEmail: varchar(320),
  insuranceCompany: varchar(200),
  claimNumber: varchar(100),
  
  // Notas
  notes: text,
  
  // Auditoría
  createdBy: int (FK -> users.id),
  createdAt: timestamp DEFAULT NOW(),
  updatedAt: timestamp ON UPDATE NOW()
}
```

### Tabla: `tasks`
Tareas asignadas a miembros del equipo.

```typescript
{
  id: int (PK, auto-increment),
  title: varchar(200) NOT NULL,
  description: text,
  
  // Categorización
  category: enum('DOCUMENTACION', 'SEGUIMIENTO', 'ESTIMADO', 'REUNION', 'REVISION', 'OTRO'),
  priority: enum('ALTA', 'MEDIA', 'BAJA') DEFAULT 'MEDIA',
  status: enum('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA') DEFAULT 'PENDIENTE',
  
  // Asignación
  assignedTo: int (FK -> users.id, nullable),
  clientId: int (FK -> clients.id, nullable),
  
  // Fechas
  dueDate: date,
  completedAt: datetime,
  
  // Auditoría
  createdBy: int (FK -> users.id),
  createdAt: timestamp DEFAULT NOW(),
  updatedAt: timestamp ON UPDATE NOW()
}
```

### Tabla: `auditLogs`
Registro de auditoría para cambios críticos.

```typescript
{
  id: int (PK, auto-increment),
  tableName: varchar(100) NOT NULL,
  recordId: int NOT NULL,
  action: enum('CREATE', 'UPDATE', 'DELETE'),
  oldValues: json,
  newValues: json,
  changedBy: int (FK -> users.id),
  changedAt: timestamp DEFAULT NOW()
}
```

---

## 🌐 PÁGINA PÚBLICA (Home - `/`)

### Propósito
Sitio educativo para atraer clientes potenciales y explicar los servicios de public adjusters.

### Secciones

#### 1. Hero Section
**Contenido:**
- Título: "Maximice su Reclamo de Seguro con un Ajustador Público Profesional"
- Subtítulo: Explicación del valor (compensación completa por daños)
- **Botón "Evaluación Gratuita"**: Scroll suave hacia formulario de contacto
- **Botón "Conocer Más"**: Scroll hacia secciones educativas
- **Botón "Acceder CRM"** (header): Redirige a `/dashboard` (requiere login)

**Implementación:**
```tsx
<Button onClick={() => scrollToSection('contact')}>
  Evaluación Gratuita
</Button>
```

#### 2. ¿Qué Hace un Ajustador Público?
**4 Tarjetas:**
1. **Su Defensor Personal**: Representación ante aseguradoras
2. **Expertos en Pólizas**: Identificación de coberturas
3. **Gestión Completa**: Documentación hasta negociación
4. **Sin Riesgo**: Pago solo si ganan

**Diseño:** Grid 2x2 con iconos de Lucide React

#### 3. Exclusiones Típicas que Debe Conocer
**4 Tarjetas de Advertencia:**
1. Daños por Inundación (requiere NFIP)
2. Mantenimiento y Desgaste
3. Daños por Moho
4. Terremotos y Movimientos de Tierra

**Estilo:** Fondo oscuro con borde de advertencia

#### 4. Checklist Esencial
**6 Items Numerados:**
1. Documente Todo
2. Revise su Póliza
3. Mantenga Registros
4. NO Firme Nada Rápidamente
5. Mitigue Daños Adicionales
6. Consulte con un Profesional

**Diseño:** Lista vertical con números en círculos azules

#### 5. Formulario de Evaluación Gratuita
**Campos:**
- Teléfono (Input)
- Email (Input)
- **Botón "Solicitar Consulta Gratuita"**: Envía datos (actualmente solo muestra toast)

**Futuro:** Conectar a endpoint que envíe email o cree lead en CRM

---

## 🔐 SISTEMA DE AUTENTICACIÓN

### Flujo Completo

1. **Usuario hace clic en "Acceder CRM"**
   - Redirige a `getLoginUrl()` de Manus OAuth
   
2. **Usuario selecciona cuenta en portal OAuth**
   - Portal de Manus maneja autenticación

3. **Callback a `/api/oauth/callback`**
   - Servidor recibe `code` de OAuth
   - Intercambia code por token de acceso
   - Obtiene información del usuario (openId, name, email)

4. **Creación/Actualización de Usuario**
   ```typescript
   await upsertUser({
     openId: userInfo.openId,
     name: userInfo.name,
     email: userInfo.email,
     loginMethod: userInfo.loginMethod,
     role: userInfo.openId === ENV.ownerOpenId ? 'admin' : 'user',
     lastSignedIn: new Date()
   });
   ```

5. **Generación de JWT**
   ```typescript
   const token = jwt.sign(
     { openId: userInfo.openId },
     ENV.jwtSecret,
     { expiresIn: '7d' }
   );
   ```

6. **Cookie de Sesión**
   ```typescript
   res.cookie(COOKIE_NAME, token, {
     httpOnly: true,
     secure: true,
     sameSite: 'lax',
     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
   });
   ```

7. **Redirección a Dashboard**
   ```typescript
   res.redirect('/dashboard');
   ```

### Middleware de Autenticación

**Archivo:** `server/_core/context.ts`

```typescript
export async function createContext({ req, res }: CreateContextOptions) {
  const token = req.cookies[COOKIE_NAME];
  
  if (!token) {
    return { req, res, user: null };
  }
  
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret);
    const user = await getUserByOpenId(decoded.openId);
    return { req, res, user };
  } catch {
    return { req, res, user: null };
  }
}
```

### Procedimientos Protegidos

```typescript
// Público - no requiere autenticación
export const publicProcedure = t.procedure;

// Protegido - requiere autenticación
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Admin - requiere rol admin
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

### Hook de Autenticación (Frontend)

```typescript
// client/src/_core/hooks/useAuth.ts
export function useAuth() {
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
  
  return {
    user,
    loading: isLoading,
    error,
    isAuthenticated: !!user,
  };
}
```

### Logout

**Frontend:**
```typescript
const logout = trpc.auth.logout.useMutation({
  onSuccess: () => {
    window.location.href = '/';
  }
});
```

**Backend:**
```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  ctx.res.clearCookie(COOKIE_NAME, {
    ...cookieOptions,
    maxAge: -1
  });
  return { success: true };
})
```

---

## 📊 DASHBOARD (`/dashboard`)

### Layout
Usa `DashboardLayout` con sidebar colapsable.

### Componentes Principales

#### 1. **6 Tarjetas de KPIs**

**Total de Clientes:**
```typescript
const { data: totalClients } = trpc.dashboard.totalClients.useQuery();
// Backend: SELECT COUNT(*) FROM clients
```
- **Clic**: Navega a `/clients` (todos los clientes)

**Contacto Atrasado (>7 días):**
```typescript
const { data: lateContact } = trpc.dashboard.lateContact.useQuery();
// Backend: WHERE DATEDIFF(NOW(), lastContactDate) > 7
```
- **Clic**: Navega a `/clients?filter=late`

**No Suplementado:**
```typescript
const { data: notSupplemented } = trpc.dashboard.notSupplemented.useQuery();
// Backend: WHERE isSupplemented = false
```
- **Clic**: Navega a `/clients?filter=not_supplemented`

**Pendientes por Someter:**
```typescript
const { data: pendingSubmission } = trpc.dashboard.pendingSubmission.useQuery();
// Backend: WHERE claimStatus = 'INICIAL'
```
- **Clic**: Navega a `/clients?filter=pending`

**Listas para Construir:**
```typescript
const { data: readyForConstruction } = trpc.dashboard.readyForConstruction.useQuery();
// Backend: WHERE readyForConstruction = true
```
- **Clic**: Navega a `/clients?filter=ready_construction`

**Próximos Contactos (7 días):**
```typescript
const { data: upcomingContacts } = trpc.dashboard.upcomingContacts.useQuery();
// Backend: WHERE DATEDIFF(scheduledVisitDate, NOW()) BETWEEN 0 AND 7
```
- **Clic**: Navega a `/clients?filter=upcoming`

**Implementación de Clic:**
```typescript
const handleCardClick = (filter: string) => {
  setLocation(`/clients?filter=${filter}`);
};

<Card onClick={() => handleCardClick('late')} className="cursor-pointer">
```

#### 2. **Calendario Visual**

**Biblioteca:** `react-big-calendar`

**Carga de Eventos:**
```typescript
const { data: events } = trpc.events.list.useQuery();

const calendarEvents = events?.map((event: any) => ({
  title: event.title,
  start: new Date(event.eventDate),
  end: event.endTime 
    ? new Date(event.eventDate + 'T' + event.endTime)
    : new Date(new Date(event.eventDate).getTime() + 60 * 60 * 1000),
  resource: event,
})) || [];
```

**Renderizado:**
```tsx
<BigCalendar
  localizer={localizer}
  events={calendarEvents}
  startAccessor="start"
  endAccessor="end"
  style={{ height: 400 }}
  views={['month', 'week', 'day']}
  defaultView="month"
/>
```

**Futuro:** Agregar onClick en eventos para mostrar modal con detalles y opciones de editar/eliminar

#### 3. **Panel de Alertas de Contacto**

**Lógica:**
```typescript
const contactAlerts = clientsNeedingContact?.filter((client: any) => {
  if (!client.lastContactDate) return true; // Sin contacto previo
  const daysSinceContact = differenceInDays(new Date(), new Date(client.lastContactDate));
  return daysSinceContact >= 0 && daysSinceContact <= 7;
}).map((client: any) => {
  const daysSinceContact = client.lastContactDate 
    ? differenceInDays(new Date(), new Date(client.lastContactDate))
    : 7;
  const daysRemaining = 7 - daysSinceContact;
  return {
    ...client,
    daysRemaining,
    priority: daysRemaining <= 1 ? 'high' : daysRemaining <= 3 ? 'medium' : 'low'
  };
}).sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
```

**Renderizado:**
```tsx
{contactAlerts.map(alert => (
  <div key={alert.id} className="border-l-4 border-{priority-color}">
    <h4>{alert.firstName} {alert.lastName}</h4>
    <p>{alert.phone}</p>
    <Badge variant={getPriorityVariant(alert.priority)}>
      Faltan {alert.daysRemaining} días
    </Badge>
  </div>
))}
```

---

## 👥 MÓDULO DE CLIENTES

### Página de Listado (`/clients`)

#### Funcionalidades

**1. Búsqueda en Tiempo Real:**
```typescript
const [searchTerm, setSearchTerm] = useState("");

const filteredClients = clients?.filter((client: any) => {
  const search = searchTerm.toLowerCase();
  return (
    client.firstName?.toLowerCase().includes(search) ||
    client.lastName?.toLowerCase().includes(search) ||
    client.phone?.includes(search) ||
    client.email?.toLowerCase().includes(search)
  );
});
```

**2. Filtros desde Dashboard:**
```typescript
const [searchParams] = useSearchParams();
const filter = searchParams.get('filter');

// Aplicar filtro
const filtered = clients?.filter(client => {
  switch(filter) {
    case 'late':
      return differenceInDays(new Date(), new Date(client.lastContactDate)) > 7;
    case 'not_supplemented':
      return !client.isSupplemented;
    case 'pending':
      return client.claimStatus === 'INICIAL';
    case 'ready_construction':
      return client.readyForConstruction;
    default:
      return true;
  }
});
```

**3. Tabla de Clientes:**

**Columnas:**
- Nombre Completo (clickable → perfil)
- Teléfono
- Email
- Aseguradora
- Estado del Reclamo (Badge con colores)
- Última Contacto (con indicador de días)
- Acciones (Ver, Editar, Eliminar)

**Implementación:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nombre</TableHead>
      <TableHead>Contacto</TableHead>
      <TableHead>Aseguradora</TableHead>
      <TableHead>Estado</TableHead>
      <TableHead>Último Contacto</TableHead>
      <TableHead>Acciones</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredClients.map(client => (
      <TableRow key={client.id}>
        <TableCell>
          <Link href={`/clients/${client.id}`}>
            {client.firstName} {client.lastName}
          </Link>
        </TableCell>
        {/* ... más columnas ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**4. Botón "Nuevo Cliente":**
```tsx
<Button onClick={() => setLocation('/clients/new')}>
  <Plus className="h-4 w-4 mr-2" />
  Nuevo Cliente
</Button>
```

### Formulario de Nuevo Cliente (`/clients/new`)

**Archivo:** `client/src/pages/ClientNew.tsx`

#### Estructura del Formulario

**Secciones con Tabs:**
1. Información Personal
2. Dirección de Propiedad
3. Información de Aseguradora
4. Detalles del Reclamo
5. Fechas Importantes
6. Equipo y Notas

**Campos por Sección:**

**1. Información Personal:**
- Nombre (required)
- Apellido (required)
- Teléfono Principal
- Teléfono Alternativo
- Email

**2. Dirección de Propiedad:**
- Dirección Completa
- Ciudad
- Estado (default: IL)
- Código Postal
- Condado

**3. Información de Aseguradora:**
- Compañía de Seguros
- Número de Póliza
- Número de Reclamo
- Nombre del Ajustador
- Teléfono del Ajustador
- Email del Ajustador

**4. Detalles del Reclamo:**
- Fecha de Pérdida (date picker)
- Tipo de Daño (dropdown: Incendio, Agua, Viento, Granizo, Otro)
- Estado del Reclamo (dropdown: INICIAL, EN_PROCESO, SUPLEMENTO, APROBADO, RECHAZADO, CERRADO)
- Monto del Reclamo ($)
- Monto del Acuerdo ($)

**5. Fechas Importantes:**
- Última Fecha de Contacto
- Visita Programada (datetime)
- Fecha de Ajustación (datetime)

**6. Equipo y Notas:**
- Asignado A (dropdown de usuarios)
- Miembro del Equipo
- ¿Suplementado? (checkbox)
- ¿Listo para Construcción? (checkbox)
- Notas
- Notas Internas (solo admin)

**Validación:**
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.firstName || !formData.lastName) {
    toast.error("Nombre y apellido son requeridos");
    return;
  }
  
  createClient.mutate(formData);
};
```

**Mutación tRPC:**
```typescript
const createClient = trpc.clients.create.useMutation({
  onSuccess: (data) => {
    toast.success("Cliente creado exitosamente");
    setLocation(`/clients/${data.id}`);
  },
  onError: (error) => {
    toast.error(`Error: ${error.message}`);
  }
});
```

### Perfil de Cliente (`/clients/:id`)

**Archivo:** `client/src/pages/ClientProfile.tsx`

#### Estructura

**Tabs:**
1. **General**: Información personal y de contacto
2. **Reclamo**: Detalles del reclamo y aseguradora
3. **Propiedad**: Dirección y ubicación
4. **Fechas**: Timeline de fechas importantes
5. **Documentos**: URLs de póliza, contrato, fotos
6. **Actividad**: Logs relacionados con el cliente

**Carga de Datos:**
```typescript
const { id } = useParams();
const { data: client, isLoading } = trpc.clients.getById.useQuery({ 
  id: parseInt(id) 
});
```

**Botones de Acción:**
- **Editar Cliente**: Navega a `/clients/:id/edit` (pendiente)
- **Agregar Log**: Abre modal de nueva actividad con cliente pre-seleccionado
- **Crear Proyecto**: Navega a `/construction/new?clientId=:id`
- **Ver Construcción**: Si `readyForConstruction === true`

**Tab "Actividad":**
```typescript
const { data: logs } = trpc.activityLogs.getByClient.useQuery({ 
  clientId: client.id 
});

// Renderiza lista de logs ordenados por fecha descendente
{logs?.map(log => (
  <div key={log.id} className="border-l-4 border-primary pl-4">
    <div className="flex justify-between">
      <h4>{log.subject}</h4>
      <Badge>{log.activityType}</Badge>
    </div>
    <p>{log.description}</p>
    <span className="text-sm text-muted-foreground">
      {log.performedBy} - {formatDate(log.performedAt)}
    </span>
  </div>
))}
```

---

## 📝 MÓDULO DE LOGS (`/logs`)

### Propósito
Registro centralizado de todas las actividades del equipo con clientes.

### Funcionalidades

#### 1. **Botón "Nueva Actividad"**

**Componente:** `NewActivityDialog`

**Formulario:**
- **Tipo de Actividad** (Select):
  - LLAMADA
  - CORREO
  - VISITA
  - NOTA
  - DOCUMENTO
  - CAMBIO_ESTADO

- **Asunto** (Input, required)

- **Cliente** (Combobox con búsqueda):
  ```typescript
  const { data: clients } = trpc.clients.list.useQuery();
  
  <Command>
    <CommandInput placeholder="Buscar cliente..." />
    <CommandList>
      {clients?.map(client => (
        <CommandItem onSelect={() => handleSelect(client.id)}>
          {client.firstName} {client.lastName}
          <span className="text-xs">{client.phone}</span>
        </CommandItem>
      ))}
    </CommandList>
  </Command>
  ```

- **Descripción** (Textarea)

- **Usuario** (Auto-detectado, disabled):
  ```typescript
  const { user } = useAuth();
  <Input value={user?.name} disabled />
  ```

**Guardado:**
```typescript
const createLog = trpc.activityLogs.create.useMutation({
  onSuccess: () => {
    toast.success("Actividad registrada");
    utils.activityLogs.getRecent.invalidate();
    setOpen(false);
  }
});

const handleSubmit = () => {
  createLog.mutate({
    activityType: formData.activityType,
    subject: formData.subject,
    description: formData.description,
    clientId: formData.clientId,
    // performedBy se detecta automáticamente en el backend
  });
};
```

**Backend:**
```typescript
create: protectedProcedure
  .input(z.object({
    activityType: z.enum(['LLAMADA', 'CORREO', 'VISITA', 'NOTA', 'DOCUMENTO', 'CAMBIO_ESTADO']),
    subject: z.string(),
    description: z.string().optional(),
    clientId: z.number().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    await createActivityLog({
      ...input,
      performedBy: ctx.user.id, // Auto-detectado
      performedAt: new Date(),
    });
  })
```

#### 2. **Lista de Actividades Recientes**

**Limitado a 5:**
```typescript
const { data: recentLogs } = trpc.activityLogs.getRecent.useQuery({ 
  limit: 5 
});
```

**Backend:**
```typescript
getRecent: protectedProcedure
  .input(z.object({ limit: z.number().default(5) }))
  .query(async ({ input }) => {
    return await db.select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.performedAt))
      .limit(input.limit);
  })
```

**Renderizado:**
```tsx
{recentLogs?.map(log => (
  <Card key={log.id}>
    <CardHeader>
      <div className="flex justify-between">
        <CardTitle>{log.subject}</CardTitle>
        <Badge>{log.activityType}</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <p>{log.description}</p>
      <div className="flex gap-4 text-sm text-muted-foreground mt-2">
        <span>👤 {log.performedBy}</span>
        <span>📅 {formatDate(log.performedAt)}</span>
        {log.clientId && <span>🏠 Cliente #{log.clientId}</span>}
      </div>
    </CardContent>
  </Card>
))}
```

#### 3. **Filtros por Fecha**

**Secciones:**
- Hoy
- Esta Semana
- Semana Pasada
- Este Mes
- Mes Pasado

**Implementación:**
```typescript
const [dateFilter, setDateFilter] = useState('week');

const getDateRange = (filter: string) => {
  const now = new Date();
  switch(filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'last_week':
      return { 
        start: startOfWeek(subWeeks(now, 1)), 
        end: endOfWeek(subWeeks(now, 1)) 
      };
    // ... más casos
  }
};

const { data: filteredLogs } = trpc.activityLogs.getByDateRange.useQuery({
  ...getDateRange(dateFilter)
});
```

---

## 📅 MÓDULO DE CALENDARIO (`/calendar`)

### Funcionalidades

#### 1. **Vista de Calendario**

Similar al dashboard pero con más opciones de visualización.

#### 2. **Botón "Nuevo Evento"**

**Componente:** `NewEventDialog`

**Formulario Base:**
- Tipo de Evento (Select)
- Título (required)
- Cliente (Combobox opcional)
- Fecha (date, required)
- Hora (time)
- Dirección
- Descripción
- Notas

**Formulario Inteligente - Campos Adicionales para "ADJUSTMENT":**

Cuando `eventType === 'ADJUSTMENT'`, se muestran campos adicionales:

```tsx
{isAdjustment && (
  <div className="border-t pt-4">
    <h3>Información de Ajustación</h3>
    
    <Input 
      label="Número del Ajustador"
      value={formData.adjusterNumber}
      onChange={...}
    />
    
    <Input 
      label="Nombre del Ajustador"
      value={formData.adjusterName}
      onChange={...}
    />
    
    <Input 
      label="Teléfono del Ajustador"
      value={formData.adjusterPhone}
      onChange={...}
    />
    
    <Input 
      label="Email del Ajustador"
      type="email"
      value={formData.adjusterEmail}
      onChange={...}
    />
    
    <Input 
      label="Aseguradora"
      value={formData.insuranceCompany}
      onChange={...}
    />
    
    <Input 
      label="Número de Reclamo"
      value={formData.claimNumber}
      onChange={...}
    />
  </div>
)}
```

**Guardado:**
```typescript
const createEvent = trpc.events.create.useMutation({
  onSuccess: () => {
    toast.success("Evento creado y sincronizado con el calendario");
    utils.events.list.invalidate();
    setOpen(false);
  }
});

const handleSubmit = () => {
  createEvent.mutate({
    eventType: formData.eventType,
    title: formData.title,
    description: formData.description,
    eventDate: new Date(formData.eventDate + 'T' + formData.eventTime),
    eventTime: formData.eventTime,
    address: formData.address,
    clientId: formData.clientId,
    // Campos de ajustación (solo si eventType === 'ADJUSTMENT')
    adjusterNumber: formData.adjusterNumber,
    adjusterName: formData.adjusterName,
    adjusterPhone: formData.adjusterPhone,
    adjusterEmail: formData.adjusterEmail,
    insuranceCompany: formData.insuranceCompany,
    claimNumber: formData.claimNumber,
    notes: formData.notes,
  });
};
```

#### 3. **Editar Evento**

**Componente:** `EditEventDialog`

**Props:**
```typescript
interface EditEventDialogProps {
  event: Event;
}
```

**Flujo:**
1. Cargar datos del evento en el formulario
2. Permitir edición de todos los campos
3. Guardar cambios

```typescript
const updateEvent = trpc.events.update.useMutation({
  onSuccess: () => {
    toast.success("Evento actualizado");
    utils.events.list.invalidate();
  }
});

const handleUpdate = () => {
  updateEvent.mutate({
    id: event.id,
    ...formData
  });
};
```

#### 4. **Eliminar Evento**

**Componente:** `DeleteEventDialog`

**Confirmación:**
```tsx
<Dialog>
  <DialogHeader>
    <DialogTitle>¿Eliminar Evento?</DialogTitle>
    <DialogDescription>
      Esta acción no se puede deshacer. El evento "{event.title}" 
      será eliminado permanentemente del calendario.
    </DialogDescription>
  </DialogHeader>
  <DialogFooter>
    <Button variant="outline" onClick={() => setOpen(false)}>
      Cancelar
    </Button>
    <Button 
      variant="destructive" 
      onClick={handleDelete}
    >
      Eliminar
    </Button>
  </DialogFooter>
</Dialog>
```

**Eliminación:**
```typescript
const deleteEvent = trpc.events.delete.useMutation({
  onSuccess: () => {
    toast.success("Evento eliminado");
    utils.events.list.invalidate();
  }
});

const handleDelete = () => {
  deleteEvent.mutate({ id: event.id });
};
```

#### 5. **Sistema de Recordatorios (7 días)**

**Panel Lateral:**
```typescript
const { data: upcomingEvents } = trpc.events.getUpcoming.useQuery({
  days: 7
});

// Backend
getUpcoming: protectedProcedure
  .input(z.object({ days: z.number() }))
  .query(async ({ input }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    
    return await db.select()
      .from(events)
      .where(
        and(
          gte(events.eventDate, new Date()),
          lte(events.eventDate, futureDate)
        )
      )
      .orderBy(asc(events.eventDate));
  })
```

**Renderizado:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Próximos Eventos (7 días)</CardTitle>
  </CardHeader>
  <CardContent>
    {upcomingEvents?.map(event => (
      <div key={event.id} className="flex justify-between items-center mb-2">
        <div>
          <h4>{event.title}</h4>
          <p className="text-sm">{formatDate(event.eventDate)}</p>
        </div>
        <Badge>{getDaysUntil(event.eventDate)}</Badge>
      </div>
    ))}
  </CardContent>
</Card>
```

---

## ✅ MÓDULO DE TAREAS (`/tasks`)

### Estructura

#### 1. **Estadísticas**

**4 Tarjetas:**
```typescript
const stats = {
  total: tasks?.length || 0,
  pending: tasks?.filter(t => t.status === 'PENDIENTE').length || 0,
  inProgress: tasks?.filter(t => t.status === 'EN_PROGRESO').length || 0,
  completed: tasks?.filter(t => t.status === 'COMPLETADA').length || 0,
};
```

**Renderizado:**
```tsx
<div className="grid md:grid-cols-4 gap-4">
  <Card>
    <CardTitle>Total de Tareas</CardTitle>
    <div className="text-2xl font-bold">{stats.total}</div>
  </Card>
  <Card>
    <CardTitle>Pendientes</CardTitle>
    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
  </Card>
  <Card>
    <CardTitle>En Progreso</CardTitle>
    <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
  </Card>
  <Card>
    <CardTitle>Completadas</CardTitle>
    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
  </Card>
</div>
```

#### 2. **Botón "Nueva Tarea"**

**Componente:** `NewTaskDialog`

**Formulario:**
- Título (required)
- Descripción
- Categoría (Select): DOCUMENTACION, SEGUIMIENTO, ESTIMADO, REUNION, REVISION, OTRO
- Prioridad (Select): ALTA, MEDIA, BAJA
- Fecha Límite (date)
- Cliente Relacionado (Combobox opcional)
- Asignado A (Select de usuarios - por defecto: usuario actual)

**Guardado:**
```typescript
const createTask = trpc.tasks.create.useMutation({
  onSuccess: () => {
    toast.success("Tarea creada exitosamente");
    utils.tasks.list.invalidate();
  }
});

const handleSubmit = () => {
  createTask.mutate({
    title: formData.title,
    description: formData.description,
    category: formData.category,
    priority: formData.priority,
    dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
    clientId: formData.clientId,
    assignedTo: formData.assignedTo || user.id,
  });
};
```

#### 3. **Lista de Tareas**

**Carga:**
```typescript
const { data: tasks, isLoading } = trpc.tasks.list.useQuery();
```

**Renderizado de Cada Tarea:**
```tsx
<Card>
  <CardHeader>
    <div className="flex justify-between items-start">
      <div>
        <CardTitle>{task.title}</CardTitle>
        <CardDescription>{task.description}</CardDescription>
        <div className="flex gap-2 mt-2">
          {getStatusBadge(task.status)}
          {getPriorityBadge(task.priority)}
          {getCategoryBadge(task.category)}
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          variant={task.status === 'COMPLETADA' ? 'default' : 'outline'}
          onClick={() => handleToggleComplete(task)}
        >
          {task.status === 'COMPLETADA' ? 'Completada' : 'Marcar Completa'}
        </Button>
        <EditTaskDialog task={task} />
        <DeleteTaskDialog task={task} />
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div>📅 {formatDate(task.dueDate)} ({getDaysUntil(task.dueDate)})</div>
      <div>👤 Asignado a: {task.assignedTo}</div>
      <div>🕐 Creada: {formatDate(task.createdAt)}</div>
    </div>
  </CardContent>
</Card>
```

#### 4. **Botón "Marcar Completa" / "Cambiar Estado"**

**Funcionalidad:**
```typescript
const updateTaskStatus = trpc.tasks.update.useMutation({
  onSuccess: () => {
    toast.success("Estado actualizado");
    utils.tasks.list.invalidate();
  }
});

const handleToggleComplete = (task: Task) => {
  const newStatus = task.status === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA';
  
  updateTaskStatus.mutate({
    id: task.id,
    status: newStatus,
    completedAt: newStatus === 'COMPLETADA' ? new Date() : null,
  });
};
```

#### 5. **Editar Tarea**

**Componente:** `EditTaskDialog`

**Formulario:**
- Todos los campos editables
- Estado adicional: PENDIENTE, EN_PROGRESO, COMPLETADA, CANCELADA

**Guardado:**
```typescript
const updateTask = trpc.tasks.update.useMutation({
  onSuccess: () => {
    toast.success("Tarea actualizada");
    utils.tasks.list.invalidate();
  }
});

const handleUpdate = () => {
  updateTask.mutate({
    id: task.id,
    title: formData.title,
    description: formData.description,
    category: formData.category,
    priority: formData.priority,
    status: formData.status,
    dueDate: formData.dueDate,
    completedAt: formData.status === 'COMPLETADA' ? new Date() : null,
  });
};
```

#### 6. **Eliminar Tarea**

**Componente:** `DeleteTaskDialog`

**Similar a DeleteEventDialog:**
```typescript
const deleteTask = trpc.tasks.delete.useMutation({
  onSuccess: () => {
    toast.success("Tarea eliminada");
    utils.tasks.list.invalidate();
  }
});

const handleDelete = () => {
  deleteTask.mutate({ id: task.id });
};
```

#### 7. **Búsqueda de Tareas**

```typescript
const [searchTerm, setSearchTerm] = useState("");

const filteredTasks = tasks?.filter((task: any) => {
  if (!searchTerm) return true;
  const search = searchTerm.toLowerCase();
  return (
    task.title?.toLowerCase().includes(search) ||
    task.description?.toLowerCase().includes(search) ||
    task.category?.toLowerCase().includes(search)
  );
});
```

---

## 🏗️ MÓDULO DE CONSTRUCCIÓN (`/construction`)

### Propósito
Gestionar proyectos de construcción para clientes aprobados.

### Funcionalidades

#### 1. **Filtro Automático**

Solo muestra clientes con `readyForConstruction === true`:

```typescript
const { data: constructionClients } = trpc.clients.list.useQuery();

const readyClients = constructionClients?.filter(
  client => client.readyForConstruction
);
```

#### 2. **Lista de Proyectos**

```typescript
const { data: projects } = trpc.construction.list.useQuery();

{projects?.map(project => (
  <Card key={project.id}>
    <CardHeader>
      <CardTitle>{project.projectName}</CardTitle>
      <CardDescription>
        Cliente: {project.client.firstName} {project.client.lastName}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contratista</Label>
          <p>{project.contractor}</p>
        </div>
        <div>
          <Label>Estado</Label>
          <Badge>{project.status}</Badge>
        </div>
        <div>
          <Label>Inicio</Label>
          <p>{formatDate(project.startDate)}</p>
        </div>
        <div>
          <Label>Finalización Estimada</Label>
          <p>{formatDate(project.estimatedCompletionDate)}</p>
        </div>
      </div>
    </CardContent>
  </Card>
))}
```

#### 3. **Detalles del Proyecto**

**Campos Específicos:**
- Tipo de Techo
- Tipo de Revestimiento
- Color de Techo
- Color de Revestimiento
- Pies Cuadrados (SQ)
- Número de Permiso
- Estado del Permiso
- Presupuesto vs Costo Real

---

## 👤 MÓDULO DE PERFIL (`/profile`)

### Información del Usuario

```typescript
const { user } = useAuth();

<Card>
  <CardHeader>
    <CardTitle>Mi Perfil</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <Label>Nombre</Label>
        <p>{user.name}</p>
      </div>
      <div>
        <Label>Email</Label>
        <p>{user.email}</p>
      </div>
      <div>
        <Label>Rol</Label>
        <Badge>{user.role}</Badge>
      </div>
      <div>
        <Label>Último Acceso</Label>
        <p>{formatDate(user.lastSignedIn)}</p>
      </div>
      <div>
        <Label>Miembro Desde</Label>
        <p>{formatDate(user.createdAt)}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 📄 MÓDULO DE CONTRATOS (`/contracts`)

### Funcionalidades Futuras

- Lista de contratos por cliente
- Plantillas de contratos
- Generación de PDFs
- Firma electrónica
- Almacenamiento en S3

---

## 🔌 INTEGRACIONES EXTERNAS

### Google Sheets

**Archivo:** `server/services/googleSheets.ts`

**Configuración:**
```typescript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
```

**Funciones:**

**1. Leer Datos:**
```typescript
export async function readSheet(spreadsheetId: string, range: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values;
}
```

**2. Escribir Datos:**
```typescript
export async function writeSheet(
  spreadsheetId: string, 
  range: string, 
  values: any[][]
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}
```

**3. Sincronización Bidireccional:**
```typescript
export async function syncClientToSheet(client: Client) {
  const row = [
    client.id,
    client.firstName,
    client.lastName,
    client.phone,
    client.email,
    client.insuranceCompany,
    client.claimStatus,
    // ... más campos
  ];
  
  await writeSheet(
    process.env.GOOGLE_SHEET_ID!,
    `Perfil!A${client.id + 1}`,
    [row]
  );
}
```

**Hojas Sincronizadas:**
- **Perfil**: Información general de clientes
- **Hoja 1**: Detalles de reclamos
- **log_log**: Logs de actividad
- **Construction**: Proyectos de construcción

### Google Drive

**Archivo:** `server/services/googleDrive.ts`

**Configuración:**
```typescript
const drive = google.drive({ version: 'v3', auth });
```

**Funciones:**

**1. Crear Carpeta:**
```typescript
export async function createFolder(name: string, parentId?: string) {
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, webViewLink',
  });
  
  return response.data;
}
```

**2. Crear Carpetas por Cliente:**
```typescript
export async function createClientFolders(clientId: number, clientName: string) {
  // Carpeta principal del cliente
  const mainFolder = await createFolder(
    `Cliente ${clientId} - ${clientName}`,
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  );
  
  // Subcarpetas
  const subfolders = [
    'Póliza',
    'Fotos',
    'Estimados',
    'Contratos',
    'Correspondencia',
    'Permisos'
  ];
  
  for (const subfolder of subfolders) {
    await createFolder(subfolder, mainFolder.id);
  }
  
  return mainFolder;
}
```

**3. Subir Archivo:**
```typescript
export async function uploadFile(
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer,
  folderId: string
) {
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };
  
  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink',
  });
  
  return response.data;
}
```

**Flujo de Creación de Cliente:**
```typescript
// En el router de clientes
create: protectedProcedure
  .input(clientSchema)
  .mutation(async ({ input, ctx }) => {
    // 1. Crear cliente en BD
    const client = await createClient(input);
    
    // 2. Crear carpetas en Google Drive
    const folder = await createClientFolders(client.id, `${client.firstName} ${client.lastName}`);
    
    // 3. Guardar URL de carpeta en BD
    await updateClient(client.id, {
      driveFolderUrl: folder.webViewLink
    });
    
    // 4. Sincronizar con Google Sheets
    await syncClientToSheet(client);
    
    return client;
  })
```

---

## 🎨 COMPONENTES REUTILIZABLES

### DashboardLayout

**Archivo:** `client/src/components/DashboardLayout.tsx`

**Funcionalidades:**
- Sidebar colapsable
- Navegación con íconos
- Detección de ruta activa
- Perfil de usuario
- Botón de logout
- Botón "Regresar" que siempre va a `/clients`

**Menú de Navegación:**
```typescript
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: FileText, label: 'Logs', path: '/logs' },
  { icon: Calendar, label: 'Calendario', path: '/calendar' },
  { icon: CheckSquare, label: 'Tareas', path: '/tasks' },
  { icon: Building2, label: 'Construcción', path: '/construction' },
  { icon: FileSignature, label: 'Contratos', path: '/contracts' },
  { icon: User, label: 'Perfil', path: '/profile' },
];
```

**Renderizado:**
```tsx
<aside className={cn("sidebar", isCollapsed && "collapsed")}>
  <nav>
    {menuItems.map(item => (
      <Link 
        key={item.path}
        href={item.path}
        className={cn(
          "nav-item",
          location === item.path && "active"
        )}
      >
        <item.icon className="h-5 w-5" />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    ))}
  </nav>
</aside>
```

### NewActivityDialog

**Archivo:** `client/src/components/NewActivityDialog.tsx`

**Características:**
- Formulario modal
- Buscador de clientes con autocompletado
- Detección automática de usuario
- Validación de campos requeridos
- Guardado con tRPC

### NewEventDialog

**Archivo:** `client/src/components/NewEventDialog.tsx`

**Características:**
- Formulario inteligente (campos dinámicos según tipo)
- Buscador de clientes
- Campos especiales para ajustaciones
- Sincronización con calendario

### NewTaskDialog

**Archivo:** `client/src/components/NewTaskDialog.tsx`

**Características:**
- Asignación de tareas
- Categorización y priorización
- Fecha límite
- Cliente relacionado opcional

### EditTaskDialog, DeleteTaskDialog, EditEventDialog, DeleteEventDialog

Componentes similares para operaciones CRUD.

---

## 🔧 BACKEND - ROUTERS tRPC

### Archivo: `server/routers.ts`

#### Router de Autenticación

```typescript
auth: router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
})
```

#### Router de Dashboard

```typescript
dashboard: router({
  totalClients: protectedProcedure.query(async () => {
    return await getTotalClients();
  }),
  
  lateContact: protectedProcedure.query(async () => {
    return await getClientsWithLateContact();
  }),
  
  notSupplemented: protectedProcedure.query(async () => {
    return await getNotSupplementedClients();
  }),
  
  pendingSubmission: protectedProcedure.query(async () => {
    return await getPendingSubmissionClients();
  }),
  
  readyForConstruction: protectedProcedure.query(async () => {
    return await getReadyForConstructionClients();
  }),
  
  upcomingContacts: protectedProcedure.query(async () => {
    return await getUpcomingContacts();
  }),
})
```

#### Router de Clientes

```typescript
clients: router({
  list: protectedProcedure.query(async () => {
    return await getAllClients();
  }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getClientById(input.id);
    }),
  
  create: protectedProcedure
    .input(clientSchema)
    .mutation(async ({ input, ctx }) => {
      const client = await createClient({
        ...input,
        createdBy: ctx.user.id,
      });
      
      // Crear carpetas en Google Drive
      await createClientFolders(client.id, `${client.firstName} ${client.lastName}`);
      
      // Sincronizar con Google Sheets
      await syncClientToSheet(client);
      
      return client;
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: clientSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Guardar valores antiguos para auditoría
      const oldClient = await getClientById(input.id);
      
      const updated = await updateClient(input.id, input.data);
      
      // Registrar en auditoría
      await createAuditLog({
        tableName: 'clients',
        recordId: input.id,
        action: 'UPDATE',
        oldValues: oldClient,
        newValues: updated,
        changedBy: ctx.user.id,
      });
      
      // Sincronizar con Google Sheets
      await syncClientToSheet(updated);
      
      return updated;
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const client = await getClientById(input.id);
      
      await deleteClient(input.id);
      
      // Registrar en auditoría
      await createAuditLog({
        tableName: 'clients',
        recordId: input.id,
        action: 'DELETE',
        oldValues: client,
        newValues: null,
        changedBy: ctx.user.id,
      });
      
      return { success: true };
    }),
})
```

#### Router de Activity Logs

```typescript
activityLogs: router({
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      return await getRecentActivityLogs(input.limit);
    }),
  
  getByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await getActivityLogsByClient(input.clientId);
    }),
  
  create: protectedProcedure
    .input(z.object({
      activityType: z.enum(['LLAMADA', 'CORREO', 'VISITA', 'NOTA', 'DOCUMENTO', 'CAMBIO_ESTADO']),
      subject: z.string(),
      description: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await createActivityLog({
        ...input,
        performedBy: ctx.user.id,
        performedAt: new Date(),
      });
    }),
})
```

#### Router de Events

```typescript
events: router({
  list: protectedProcedure.query(async () => {
    return await getAllEvents();
  }),
  
  getUpcoming: protectedProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      return await getUpcomingEvents(input.days);
    }),
  
  create: protectedProcedure
    .input(eventSchema)
    .mutation(async ({ input, ctx }) => {
      return await createEvent({
        ...input,
        createdBy: ctx.user.id,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      ...eventSchema.partial().shape,
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateEvent(id, data);
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEvent(input.id);
      return { success: true };
    }),
})
```

#### Router de Tasks

```typescript
tasks: router({
  list: protectedProcedure.query(async () => {
    return await getAllTasks();
  }),
  
  create: protectedProcedure
    .input(taskSchema)
    .mutation(async ({ input, ctx }) => {
      return await createTask({
        ...input,
        createdBy: ctx.user.id,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      ...taskSchema.partial().shape,
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateTask(id, data);
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTask(input.id);
      return { success: true };
    }),
})
```

#### Router de Construction

```typescript
construction: router({
  list: protectedProcedure.query(async () => {
    return await getAllConstructionProjects();
  }),
  
  getByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await getConstructionProjectsByClient(input.clientId);
    }),
  
  create: protectedProcedure
    .input(constructionSchema)
    .mutation(async ({ input }) => {
      return await createConstructionProject(input);
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      ...constructionSchema.partial().shape,
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateConstructionProject(id, data);
    }),
})
```

---

## 🛠️ FUNCIONES DE BASE DE DATOS

### Archivo: `server/db.ts`

#### Clientes

```typescript
export async function getAllClients() {
  const db = await getDb();
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  const result = await db.insert(clients).values(data);
  return await getClientById(result.insertId);
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  await db.update(clients).set(data).where(eq(clients.id, id));
  return await getClientById(id);
}

export async function deleteClient(id: number) {
  const db = await getDb();
  await db.delete(clients).where(eq(clients.id, id));
}

// Funciones específicas para KPIs
export async function getTotalClients() {
  const db = await getDb();
  const result = await db.select({ count: sql`COUNT(*)` }).from(clients);
  return result[0].count;
}

export async function getClientsWithLateContact() {
  const db = await getDb();
  return await db.select()
    .from(clients)
    .where(sql`DATEDIFF(NOW(), ${clients.lastContactDate}) > 7`);
}

export async function getNotSupplementedClients() {
  const db = await getDb();
  return await db.select()
    .from(clients)
    .where(eq(clients.isSupplemented, false));
}

export async function getPendingSubmissionClients() {
  const db = await getDb();
  return await db.select()
    .from(clients)
    .where(eq(clients.claimStatus, 'INICIAL'));
}

export async function getReadyForConstructionClients() {
  const db = await getDb();
  return await db.select()
    .from(clients)
    .where(eq(clients.readyForConstruction, true));
}

export async function getUpcomingContacts() {
  const db = await getDb();
  return await db.select()
    .from(clients)
    .where(sql`DATEDIFF(${clients.scheduledVisitDate}, NOW()) BETWEEN 0 AND 7`);
}
```

#### Activity Logs

```typescript
export async function getRecentActivityLogs(limit: number = 5) {
  const db = await getDb();
  return await db.select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.performedAt))
    .limit(limit);
}

export async function getActivityLogsByClient(clientId: number) {
  const db = await getDb();
  return await db.select()
    .from(activityLogs)
    .where(eq(activityLogs.clientId, clientId))
    .orderBy(desc(activityLogs.performedAt));
}

export async function createActivityLog(data: InsertActivityLog) {
  const db = await getDb();
  await db.insert(activityLogs).values(data);
}
```

#### Events

```typescript
export async function getAllEvents() {
  const db = await getDb();
  return await db.select()
    .from(events)
    .orderBy(asc(events.eventDate));
}

export async function getUpcomingEvents(days: number) {
  const db = await getDb();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await db.select()
    .from(events)
    .where(
      and(
        gte(events.eventDate, new Date()),
        lte(events.eventDate, futureDate)
      )
    )
    .orderBy(asc(events.eventDate));
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  const result = await db.insert(events).values(data);
  return result.insertId;
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  await db.delete(events).where(eq(events.id, id));
}
```

#### Tasks

```typescript
export async function getAllTasks() {
  const db = await getDb();
  return await db.select()
    .from(tasks)
    .orderBy(desc(tasks.createdAt));
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  const result = await db.insert(tasks).values(data);
  return result.insertId;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}
```

#### Construction Projects

```typescript
export async function getAllConstructionProjects() {
  const db = await getDb();
  return await db.select()
    .from(constructionProjects)
    .orderBy(desc(constructionProjects.createdAt));
}

export async function getConstructionProjectsByClient(clientId: number) {
  const db = await getDb();
  return await db.select()
    .from(constructionProjects)
    .where(eq(constructionProjects.clientId, clientId));
}

export async function createConstructionProject(data: InsertConstructionProject) {
  const db = await getDb();
  const result = await db.insert(constructionProjects).values(data);
  return result.insertId;
}

export async function updateConstructionProject(id: number, data: Partial<InsertConstructionProject>) {
  const db = await getDb();
  await db.update(constructionProjects).set(data).where(eq(constructionProjects.id, id));
}
```

#### Audit Logs

```typescript
export async function createAuditLog(data: {
  tableName: string;
  recordId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues: any;
  newValues: any;
  changedBy: number;
}) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    ...data,
    changedAt: new Date(),
  });
}
```

---

## 🚀 COMANDOS Y SCRIPTS

### Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Aplicar cambios de schema a BD
pnpm db:push

# Generar migraciones
pnpm db:generate

# Ejecutar migraciones
pnpm db:migrate
```

### Producción

```bash
# Build para producción
pnpm build

# Iniciar en producción
pnpm start
```

### Base de Datos

```bash
# Ver estado de la BD
pnpm db:studio

# Resetear BD (¡CUIDADO!)
pnpm db:reset
```

---

## 🔒 SEGURIDAD

### Variables de Entorno

**Nunca commitear:**
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- Cualquier API key

### Protección de Rutas

**Frontend:**
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <Loader />;
  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }
  
  return <>{children}</>;
}
```

**Backend:**
```typescript
// Ya implementado con protectedProcedure y adminProcedure
```

### Validación de Inputs

Todos los inputs están validados con Zod:

```typescript
const clientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  // ... más campos
});
```

### Sanitización

```typescript
import { sanitize } from 'sanitize-html';

const cleanDescription = sanitize(input.description);
```

---

## 📱 RESPONSIVE DESIGN

Todos los componentes usan Tailwind con breakpoints:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 🎨 TEMA Y ESTILOS

### Paleta de Colores

**Archivo:** `client/src/index.css`

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... más variables */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... más variables */
  }
}
```

### Componentes shadcn/ui

Instalados:
- Button
- Card
- Dialog
- Input
- Label
- Select
- Textarea
- Badge
- Table
- Tabs
- Separator
- Command
- Popover
- Calendar

---

## 🐛 DEBUGGING

### Logs del Servidor

```typescript
console.log('[Database] Query:', query);
console.error('[Error]', error);
```

### DevTools

- React DevTools
- TanStack Query DevTools (incluido en desarrollo)

---

## 📚 RECURSOS ADICIONALES

### Documentación de Librerías

- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Big Calendar](https://jquense.github.io/react-big-calendar/)

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

1. **Implementar formulario de edición de clientes** (`/clients/:id/edit`)
2. **Crear script de seed con datos de prueba**
3. **Configurar notificaciones por email automáticas**
4. **Implementar exportación de reportes a PDF**
5. **Agregar gráficos y visualizaciones en dashboard**
6. **Implementar búsqueda avanzada con filtros múltiples**
7. **Agregar soporte para múltiples idiomas (i18n)**
8. **Implementar sistema de notificaciones en tiempo real**
9. **Crear módulo de reportes personalizables**
10. **Agregar integración con servicios de email (SendGrid, Mailgun)**

---

## 📞 SOPORTE

Para preguntas o problemas, contactar al equipo de desarrollo o consultar la documentación oficial de cada librería utilizada.

---

**Última actualización:** Enero 2025  
**Versión:** 1.0.0  
**Autor:** Equipo de Desarrollo CRM
