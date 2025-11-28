# Project TODO

## Fase 1: Base de Datos y Esquema
- [x] Diseñar esquema completo de base de datos
- [x] Tabla de clientes con 40 campos (contacto, propiedad, aseguradora, reclamo, fechas)
- [x] Tabla de logs de actividad con auditoría
- [x] Tabla de proyectos de construcción
- [x] Tabla de documentos y archivos
- [x] Tabla de usuarios con roles (Admin, Staff, Read-only)
- [x] Tabla de auditoría para cambios críticos
- [x] Ejecutar migraciones de base de datos

## Fase 2: Backend y API
- [x] Router tRPC para clientes (CRUD completo)
- [x] Router tRPC para logs de actividad
- [x] Router tRPC para construcción
- [x] Router tRPC para documentos
- [x] Router tRPC para métricas y KPIs
- [x] Lógica de negocio para filtros de dashboard
- [x] Validaciones de formularios
- [x] Manejo de errores y respuestas

## Fase 3: Integración Google
- [x] Servicio de Google Sheets (lectura/escritura)
- [x] Servicio de Google Drive (subida de archivos)
- [x] Sincronización bidireccional con hojas: Perfil, Hoja 1, log_log, Construction
- [x] Creación automática de carpetas por cliente
- [x] Generación de subcarpetas predefinidas
- [x] Almacenamiento de URLs de documentos

## Fase 4: Sitio Público Educativo
- [x] Landing page con hero/banner y valor claro
- [x] Sección "Qué hace un public adjuster"
- [x] Sección de exclusiones típicas de pólizas
- [x] Checklist "Antes de someter un claim"
- [x] Llamados a la acción no intrusivos
- [x] Formulario de consulta/evaluación de póliza
- [x] Diseño responsive y profesional

## Fase 5: Dashboard con KPIs
- [x] Tarjeta KPI: Total de clientes
- [x] Tarjeta KPI: Contacto atrasado (>7 días)
- [x] Tarjeta KPI: No suplementado
- [x] Tarjeta KPI: Pendientes por someter
- [x] Tarjeta KPI: Listas para construir
- [x] Tarjeta KPI: Próximos contactos (7 días)
- [x] Navegación al clic: abrir vista filtrada
- [x] Sidebar colapsable funcional

## Fase 6: Módulo CRM de Clientes
- [x] Vista de perfil completo con 40 campos
- [ ] Formulario agregar cliente con validaciones
- [ ] Formulario editar cliente
- [ ] Dropdowns definidos para campos específicos
- [ ] Subida de archivos (póliza, contrato, fotos)
- [ ] Programación de fechas (Scheduled Visit, Adjustment Date)
- [x] Búsqueda por nombre/ID con coincidencias parciales
- [x] Lista de clientes con paginación

## Fase 7: Módulo de Logs
- [ ] Vista tipo cards de logs recientes
- [ ] Búsqueda de logs por cliente
- [ ] Formulario para agregar acciones (llamadas, correos, visitas)
- [ ] Vinculación de logs por ID de cliente
- [ ] Secciones: contacto, métricas, PDFs, info aseguradora, notas
- [ ] Timestamps automáticos

## Fase 8: Módulo de Construcción
- [ ] Búsqueda por nombre en hoja Construction
- [ ] Lista de múltiples coincidencias
- [ ] Vista detalle de proyecto (roof, siding, permisos, colores, SQ, etc.)
- [ ] Formulario editar proyecto
- [ ] Botón regresar a búsqueda
- [ ] Estandarización visual con sidebar

## Fase 9: Seguridad y Roles
- [ ] Sistema de login (email + password)
- [ ] Roles: Admin, Staff, Read-only
- [ ] Permisos por rol (crear/editar/ver)
- [ ] Auditoría: timestamp y usuario en cambios críticos
- [ ] Protección de rutas según rol
- [ ] Sesión persistente

## Fase 10: Pruebas y Documentación
- [ ] Probar lectura/escritura en Google Sheets
- [ ] Probar subida a Google Drive
- [ ] Probar login y roles
- [ ] Probar creación/edición de cliente
- [ ] Probar creación de logs
- [ ] Probar filtros de KPIs
- [ ] Probar búsqueda parcial
- [ ] Crear README con variables de entorno
- [ ] Documentar estructura de hojas
- [ ] Documentar flujos clave


## Correcciones Urgentes
- [x] Corregir problema de autenticación - usuarios no pueden acceder al CRM después de login
- [x] Verificar flujo de OAuth y creación de usuarios en base de datos
- [x] Asegurar redirección correcta después de login exitoso

## Nuevas Funcionalidades Solicitadas
- [x] Crear formulario completo para agregar nuevo cliente con todos los campos
- [x] Agregar botón de regresar a página anterior en el layout del dashboard

## Mejoras de Navegación
- [x] Cambiar botón "Regresar" para que siempre vaya a la página de clientes
- [x] Agregar sección "Perfil" en el menú lateral
- [x] Agregar sección "Contratos" en el menú lateral

## Nuevas Funcionalidades Avanzadas
- [x] Crear página de Logs con lista de actividades, información del equipo y filtros por fechas/semanas
- [x] Crear página de Construcción mostrando solo clientes aprobados para construcción
- [x] Implementar sección de Calendario para eventos importantes (estimados, reuniones, ajustaciones)
- [x] Crear sistema de cuenta regresiva de 7 días desde último contacto con clientes
- [x] Mostrar alertas de clientes que necesitan contacto con información relevante

## Gestión de Tareas y Formularios
- [x] Crear formulario de nueva actividad en Logs con detección automática de usuario
- [x] Implementar módulo de Tareas con asignación a miembros del equipo
- [x] Agregar timeline y fechas límite para tareas
- [x] Implementar categorización de tareas
- [x] Agregar funcionalidad de subida de documentos para tareas
- [x] Crear vista de progreso y estado de tareas

## Mejoras de UX en Formularios
- [x] Implementar buscador de clientes con autocompletado en formulario de nueva actividad
- [x] Mostrar sugerencias en tiempo real al escribir el nombre del cliente
- [x] Permitir seleccionar cliente de la lista de sugerencias

## Mejoras del Dashboard Principal
- [x] Agregar calendario visual en el dashboard mostrando eventos de la sección Calendario
- [x] Crear panel lateral con alertas de contacto de clientes
- [x] Mostrar cuenta regresiva de días restantes para contactar cada cliente
- [x] Incluir nombre y datos de contacto (teléfono/email) en alertas

## Mejoras del Calendario
- [ ] Mejorar diseño visual del calendario para hacerlo más atractivo y sencillo
- [ ] Agregar botón "Agregar Evento" funcional
- [ ] Crear formulario de nuevo evento con campos: tipo, título, fecha/hora, dirección, cliente, notas
- [ ] Guardar eventos en base de datos y sincronizar con calendario visual

## Correcciones de Bugs
- [x] Corregir error al guardar actividad en NewActivityDialog
- [x] Limitar visualización de logs a los últimos 5 más recientes

## Sistema de Eventos Completo
- [x] Crear tabla `events` en la base de datos
- [x] Hacer funcional el botón "Nuevo Evento" con formulario completo
- [x] Formulario inteligente: cuando se selecciona "Ajustación" pedir campos específicos
- [x] Buscador de cliente en formulario de eventos
- [x] Campos para ajustación: número ajustador, info ajustador, aseguranza, hora, fecha, dirección
- [x] Sincronizar eventos guardados con calendario visual del dashboard
- [x] Implementar botón "Editar Evento" para eventos existentes
- [x] Implementar botón "Eliminar Evento"
- [x] Mostrar eventos en el calendario con colores según tipo

## Sistema de Tareas Completo
- [x] Crear tabla `tasks` en la base de datos
- [x] Hacer funcional el botón "Nueva Tarea"
- [x] Implementar formulario de nueva tarea con todos los campos
- [x] Implementar botón "Editar Tarea" para cada tarea
- [x] Implementar botón "Eliminar Tarea"
- [x] Implementar botón "Cambiar Estado" (Pendiente/En Progreso/Completada)
- [x] Conectar todas las acciones a la base de datos
- [x] Actualizar estadísticas en tiempo real

## Mejoras Visuales del Dashboard
- [x] Mejorar estilo visual del calendario (más limpio y moderno)
- [x] Agregar botón "Agregar Evento" en esquina superior derecha del calendario
- [x] Integrar NewEventDialog con el calendario del dashboard
- [x] Agregar sección de tareas pendientes en la parte inferior del dashboard
- [x] Mostrar fecha límite y usuario a cargo en cada tarea pendiente

## Nuevas Mejoras Solicitadas
- [x] Agregar botón de modo día/noche (toggle de tema) en el DashboardLayout
- [x] Verificar que todos los botones del calendario funcionen correctamente
- [x] Hacer que al hacer clic en un cliente en la lista redirija a su perfil completo
- [x] Agregar pestaña "Documentos" en el perfil del cliente (ya existía)
- [x] Implementar subida de PDFs en la sección de documentos del cliente
- [x] Mostrar lista de documentos subidos con opciones de descargar/eliminar

## Mejoras de Tareas y Perfil de Usuario
- [x] Agregar selector de usuario en formulario de Nueva Tarea para asignar responsable
- [x] Implementar filtro por usuario en página de Tareas
- [x] Implementar filtro por tareas realizadas por usuario específico
- [x] Crear funcionalidad de edición de perfil de usuario (nombre, email, contraseña, foto)
- [x] Permitir cambio de foto de perfil con subida a S3

## Mejoras del Perfil de Cliente
- [x] Agregar sección de historial de contactos mostrando últimas 4 veces contactado
- [x] Mostrar fecha, hora, asunto y usuario en cada contacto del historial
- [x] Implementar filtro para ver historial completo de todos los contactos
- [x] Hacer teléfono clicable para iniciar llamada (móvil)
- [x] Hacer email clicable para abrir cliente de correo
- [x] Agregar campo "Estimado de Aseguranza" en sección de información del reclamo
- [x] Agregar campo "Primer Cheque" en sección de información del reclamo

## Edición de Clientes y Sistema de IDs Personalizado
- [x] Crear página de edición de clientes (`/clients/:id/edit`)
- [x] Formulario completo con todos los campos editables
- [x] Validaciones en formulario de edición
- [x] Registro de cambios en log de auditoría
- [x] Cambiar sistema de IDs de numérico a formato personalizado
- [x] Implementar generación de ID: [2 letras ciudad][YYYYMMDD][iniciales]
- [x] Migrar IDs existentes o agregar campo customId
- [x] Actualizar todas las referencias de ID en la aplicación

## Mejoras de la Sección "Por Contactar Hoy"
- [x] Crear diálogo modal ClientContactDialog para mostrar detalles del cliente
- [x] Mostrar última actividad del cliente en el diálogo
- [x] Mostrar usuario que contactó por última vez
- [x] Mostrar fecha del último contacto
- [x] Mostrar notas de la última actividad
- [x] Mostrar toda la información de contacto (teléfono, email, dirección)
- [x] Implementar botón "Marcar como Contactado" que actualice lastContactDate
- [x] Actualizar dashboard para mostrar TODOS los clientes que necesitan contacto (no solo 5)
- [x] Hacer que al hacer clic en un cliente se abra el diálogo con su información

## Sistema de Alertas Progresivas de Contacto
- [x] Actualizar ClientContactDialog para establecer nextContactDate = lastContactDate + 7 días
- [x] Modificar lógica del Dashboard para calcular alertas basadas en nextContactDate
- [x] Implementar alertas que aparezcan 2 días antes del contacto programado
- [x] Crear sistema de prioridades visuales:
  - [x] Verde (Baja): Faltan 2+ días para contactar
  - [x] Amarillo (Media): Falta 1 día para contactar
  - [x] Naranja (Alta): Hoy es el día de contactar
  - [x] Rojo (Urgente): Pasó la fecha de contacto
- [x] Actualizar badges y mensajes según días restantes

## Sistema Multi-Tenant (Multi-Organización)

### Arquitectura de Base de Datos
- [x] Crear tabla `organizations` con campos: id, name, slug, logo, businessType, createdAt, ownerId
- [x] Crear tabla `organizationMembers` con campos: id, organizationId, userId, role, username, createdAt
- [x] Agregar campo `organizationId` a todas las tablas existentes (clients, events, tasks, activityLogs, documents, constructionProjects)
- [x] Crear índices en organizationId para optimizar queries
- [x] Migrar base de datos con las nuevas tablas y campos

### Wizard de Onboarding (3 Pasos)
- [ ] Paso 1: Registro del usuario (OAuth Manus) - automáticamente se convierte en Admin
- [ ] Paso 2: Información de organización (nombre, tipo de negocio, logo opcional)
- [ ] Paso 3: Generación automática de usuarios (cantidad 1-20, genera username/password)
- [ ] Mostrar tabla con credenciales generadas (username, password temporal)
- [ ] Permitir descargar CSV con credenciales
- [ ] Enviar email al admin con todas las credenciales generadas

### Sistema de Roles y Permisos
- [ ] Definir enum de roles: ADMIN, CO_ADMIN, VENDEDOR
- [ ] Implementar middleware de autorización por rol
- [ ] Admin: Control total + gestión de organización y usuarios
- [ ] Co-Admin: Control total excepto cambiar logo/nombre/gestionar usuarios
- [ ] Vendedor: Solo lectura + crear (NO editar/eliminar)
- [ ] Crear procedimientos protectedAdminProcedure, protectedCoAdminProcedure, protectedVendedorProcedure

### Backend - Routers y Lógica
- [x] Crear middleware `orgProcedure` que inyecta organizationId en el contexto
- [x] Actualizar TODOS los routers para usar orgProcedure y filtrar por organizationId
- [x] Crear router `organizations` con endpoints:
  - [x] checkMembership: Verificar si usuario tiene organización
  - [x] create: Crear organización y generar usuarios automáticos
  - [x] getMyOrganization: Obtener organización actual
  - [x] getMembers: Listar miembros de la organización
  - [ ] updateMember: Cambiar rol de un miembro
  - [ ] deleteMember: Eliminar miembro

### Filtrado de Datos por Organización
- [x] Actualizar todos los routers de clients para filtrar por organizationId
- [x] Actualizar todos los routers de events para filtrar por organizationId
- [x] Actualizar todos los routers de tasks para filtrar por organizationId
- [x] Actualizar todos los routers de activityLogs para filtrar por organizationId
- [x] Actualizar todos los routers de documents para filtrar por organizationId
- [x] Actualizar todos los routers de constructionProjects para filtrar por organizationId
- [x] Actualizar dashboard queries para filtrar por organizationId

### Panel de Gestión de Usuarios (Solo Admin)
- [ ] Crear página de gestión de usuarios
- [ ] Listar todos los miembros de la organización con sus roles
- [ ] Permitir agregar nuevos usuarios (hasta límite de 20)
- [ ] Permitir cambiar rol de usuarios existentes
- [ ] Permitir eliminar usuarios
- [ ] Permitir resetear contraseñas de usuarios
- [ ] Mostrar estadísticas de uso por usuario

### Branding Personalizado
- [ ] Permitir subir logo personalizado por organización
- [ ] Mostrar logo de organización en dashboard (reemplazar APP_LOGO)
- [ ] Permitir cambiar nombre de organización (solo Admin)
- [ ] Actualizar título de página con nombre de organización

### Autenticación y Contexto
- [ ] Actualizar context.ts para incluir organizationId del usuario
- [ ] Crear hook useOrganization() para acceder a datos de organización
- [ ] Actualizar useAuth() para incluir role y organizationId
- [ ] Implementar verificación de permisos en frontend

## Implementación de Onboarding Funcional
- [x] Crear componente OnboardingWizard con 3 pasos
- [x] Paso 2: Formulario de información de organización (nombre, tipo de negocio, logo)
- [x] Paso 3: Selector de cantidad de usuarios y generación automática
- [x] Mostrar tabla de credenciales generadas con opción de copiar/descargar
- [x] Implementar lógica de redirección en App.tsx o componente raíz
- [x] Verificar membership con trpc.organizations.checkMembership
- [x] Redirigir a /onboarding si no tiene organización
- [x] Redirigir a /dashboard si ya tiene organización
- [x] Actualizar context para incluir organizationMember con organizationId y role

## Sistema de Autenticación Dual
- [x] Agregar campo `password` (hash) a tabla organizationMembers
- [x] Crear endpoint `auth.loginWithCredentials` (username + password)
- [x] Implementar hashing de contraseñas con bcrypt
- [x] Crear página de Login con dos opciones:
  - [x] Formulario "Iniciar Sesión" (username + password)
  - [x] Botón "Crear Organización" (OAuth)
- [x] Actualizar generación de usuarios para hashear contraseñas
- [x] Implementar sesión persistente para ambos tipos de auth
- [x] Actualizar AuthGuard para soportar ambos flujos
- [x] Crear endpoint para cambiar contraseña de usuario

## Panel de Gestión de Usuarios (Solo Admin)
- [x] Crear endpoint `organizations.updateMemberRole` (cambiar rol de miembro)
- [x] Crear endpoint `organizations.deleteMember` (eliminar miembro)
- [x] Crear endpoint `organizations.addMember` (agregar nuevo miembro manualmente)
- [x] Crear endpoint `organizations.resetMemberPassword` (resetear contraseña de miembro)
- [x] Crear página `/users` para gestión de usuarios
- [x] Mostrar tabla de todos los miembros con: username, rol, fecha de creación
- [x] Implementar dropdown para cambiar rol de cada miembro
- [x] Implementar botón de eliminar miembro con confirmación
- [x] Implementar formulario para agregar nuevo miembro
- [x] Implementar botón de resetear contraseña que genere nueva temporal

## Restricciones de Permisos por Rol
- [x] Crear `adminOrgProcedure` que solo permite rol ADMIN
- [x] Crear `coAdminOrgProcedure` que permite ADMIN y CO_ADMIN
- [x] Actualizar procedures de eliminación para usar adminOrgProcedure o coAdminOrgProcedure
- [x] Crear hook `usePermissions()` en frontend para verificar permisos
- [x] Ocultar botones de editar/eliminar para rol VENDEDOR
- [x] Mostrar badge de rol en el header del dashboard
- [x] Agregar restricciones en ClientProfile, Clients, etc.

## Funcionalidad de Cambio de Contraseña
- [x] Crear endpoint `auth.changePassword` (contraseña actual + nueva)
- [x] Crear sección en Profile para cambio de contraseña
- [x] Implementar formulario con: contraseña actual, nueva contraseña, confirmar nueva
- [x] Validar complejidad de contraseña (mínimo 8 caracteres)
- [x] Mostrar mensajes de éxito/error

## Corrección de Flujo de Creación de Organización
- [x] Corregir botón "Crear Organización" en Login.tsx para redirigir a OAuth con returnUrl=/onboarding
- [x] Verificar que después de OAuth el usuario sea redirigido automáticamente a /onboarding
- [x] Asegurar que el wizard de onboarding funcione correctamente después de autenticación OAuth

## Corrección de Login de Usuarios Generados
- [x] Investigar por qué usuario1@andres.internal con contraseña 1m0ubr6c no puede iniciar sesión
- [x] Verificar que el usuario existe en la tabla organizationMembers
- [x] Verificar que la contraseña esté correctamente hasheada con bcrypt
- [x] Verificar que el endpoint loginWithCredentials compare correctamente las contraseñas
- [x] Corregir el problema y probar el login exitoso
- [x] Mejorar generación de contraseñas para usar función generatePassword() que garantiza longitud exacta

## Corrección de Redirección de Login
- [x] Investigar por qué el botón "Iniciar Sesión" redirige a página principal (/) en lugar del dashboard
- [x] Verificar que el endpoint loginWithCredentials retorne correctamente después de autenticar
- [x] Corregir la redirección para que lleve al dashboard después del login exitoso
- [x] Asegurar que AuthGuard no interfiera con la redirección post-login

## Mostrar Nombre de Organización en Dashboard
- [x] Investigar dónde se muestra el título en DashboardLayout.tsx (línea 215)
- [x] Obtener el nombre de la organización del usuario desde trpc.organizations.getMyOrganization
- [x] Reemplazar APP_TITLE por el nombre de la organización en el header del dashboard
- [x] Manejar estado de carga mientras se obtiene la información de la organización

## Selector de Usuarios en Formulario de Nueva Tarea
- [x] Agregar query para obtener todos los usuarios de la organización
- [x] Implementar dropdown de selección de usuario en NewTaskDialog
- [x] Actualizar el campo assignedTo para guardar el userId seleccionado
- [ ] Mostrar nombre del usuario asignado en lugar del ID en la lista de tareas

## Página de Calendario con Gestión de Eventos
- [x] Crear página completa de Calendario en client/src/pages/Calendar.tsx
- [x] Implementar vista de calendario con eventos de la base de datos
- [x] Agregar botón para crear nuevo evento desde la página de calendario
- [x] Mostrar todos los eventos ordenados por fecha
- [x] Sincronizar eventos entre dashboard y página de calendario
- [x] Agregar ruta /calendar en App.tsx
- [x] Implementar sistema de alertas de contacto con prioridades (Verde/Amarillo/Naranja/Rojo)
- [x] Integrar ClientContactDialog para marcar clientes como contactados

## Restricciones de Permisos en Edición de Clientes
- [x] Investigar campo de estado del reclamo en ClientEdit.tsx (línea 305)
- [x] Implementar restricción: solo ADMIN y CO_ADMIN pueden editar estado del reclamo
- [x] Deshabilitar selector de estado del reclamo para VENDEDOR
- [x] Mostrar alerta informativa cuando VENDEDOR intenta editar estado del reclamo

## Selector de Usuarios en Edición de Clientes
- [x] Investigar campos de Vendedor y Ajustador en ClientEdit.tsx (línea 411)
- [x] Reemplazar inputs de texto por dropdowns de usuarios
- [x] Obtener lista de usuarios de la organización con trpc.organizations.getMembers
- [x] Mostrar username y rol de cada usuario en los selectores
- [x] Guardar username del usuario seleccionado

## Estados de Reclamo Personalizados (ADMIN/CO_ADMIN)
- [x] Diseñar esquema de tabla customClaimStatuses en drizzle/schema.ts
- [x] Crear migración de base de datos con pnpm db:push
- [x] Implementar endpoints tRPC para CRUD de estados personalizados (list, create, delete)
- [x] Crear componente ManageClaimStatusesDialog para agregar/eliminar estados
- [x] Agregar botón "Gestionar Estados" en ClientEdit (solo visible para ADMIN/CO_ADMIN)
- [x] Actualizar dropdown de Estado del Reclamo para mostrar estados predeterminados + personalizados
- [ ] Implementar validación: no permitir eliminar estados que estén en uso por clientes (TODO futuro)
- [x] Agregar restricción: solo ADMIN y CO_ADMIN pueden gestionar estados personalizados

## Tarjetas de Estados de Reclamo en Dashboard
- [x] Crear endpoint tRPC para obtener conteo de clientes agrupados por estado de reclamo
- [x] Endpoint debe incluir estados predeterminados y personalizados
- [x] Crear componente ClaimStatusCards para mostrar tarjetas de estados
- [x] Cada tarjeta muestra: nombre del estado + número de clientes en ese estado
- [x] Implementar diálogo/modal que se abre al hacer clic en una tarjeta
- [x] El diálogo muestra lista de clientes en ese estado específico
- [x] Al hacer clic en un cliente de la lista, navegar a su página de perfil
- [x] Las tarjetas se actualizan automáticamente cuando se agregan/eliminan estados personalizados
- [x] Agregar sección en Dashboard (DashboardLayout o página Home) para mostrar estas tarjetas

## Bug: Validación de Estados Personalizados en Actualización de Clientes
- [x] Investigar schema de validación Zod en router de clientes (clients.update)
- [x] Modificar validación de claimStatus para aceptar estados personalizados dinámicamente
- [x] Cambiar claimStatus de mysqlEnum a varchar(100) en drizzle/schema.ts
- [x] Aplicar migración de base de datos con pnpm db:push (2 migraciones aplicadas)
- [x] Actualizar validación Zod en clients.create y clients.update a z.string()
- [x] Dropdown muestra correctamente estados predeterminados + personalizados
- [x] Estados personalizados se pueden seleccionar sin errores de validación
- [ ] Nota: Error tipográfico APROVADA en vez de APROBADA en ClientEdit.tsx (línea 337)

## Mejoras en Formulario de Nuevo Cliente (ClientNew.tsx)
- [x] Agregar query para obtener estados personalizados de reclamo
- [x] Actualizar dropdown de Estado del Reclamo para mostrar estados predeterminados + personalizados
- [x] Agregar botón "Gestionar Estados" (solo visible para ADMIN y CO_ADMIN)
- [x] Integrar ManageClaimStatusesDialog en ClientNew
- [x] Convertir campo de Vendedor de input a dropdown con usuarios de la organización
- [x] Convertir campo de Ajustador Asignado de input a dropdown con usuarios de la organización
- [x] Sincronizar funcionalidad con ClientEdit para mantener consistencia
- [x] Agregar restricción: solo ADMIN y CO_ADMIN pueden cambiar estado del reclamo
- [x] Mostrar alerta informativa para VENDEDOR cuando intenta cambiar estado

## Mejora de UI de Página de Login
- [x] Separar botones de inicio de sesión para mayor claridad
- [x] Crear botón "Iniciar Sesión con Organización Existente" para usuarios con credenciales
- [x] Crear botón "Crear Nueva Organización" para nuevos usuarios (OAuth)
- [x] Mejorar diseño visual para diferenciar ambas opciones (azul para login, outline para crear)
- [x] Agregar descripciones claras de cada opción
- [x] Implementar navegación entre pantalla de selección y formulario de login
- [x] Agregar botón "Volver a opciones" en formulario de login

## Bug: Error al Crear Nuevo Cliente con Estado Personalizado
- [x] Investigar error de inserción en base de datos al crear cliente
- [x] Verificar campos requeridos en schema de clients
- [x] Revisar endpoint clients.create para identificar campos faltantes
- [x] Corregir valores por defecto o campos NULL en la inserción (agregar helper cleanClientData)
- [x] Convertir strings vacíos a NULL antes de insertar en la base de datos
- [x] Identificar que la columna claimStatus seguía siendo ENUM en la BD
- [x] Ejecutar ALTER TABLE para cambiar claimStatus de ENUM a VARCHAR(100)
- [x] Verificar que la BD acepta estados personalizados (inserción SQL exitosa)
- [x] Identificar problema en formulario ClientNew.tsx (claimStatus con 'as const' impedía cambios)
- [x] Revisar manejador de eventos del botón Guardar Cliente (funcionaba correctamente)
- [x] Verificar captura de valor de estado personalizado en el formulario (TypeScript bloqueaba cambios)
- [x] Eliminar 'as const' de claimStatus para permitir estados personalizados
- [x] Probar creación de cliente con estado personalizado desde el formulario
- [x] Verificar que la base de datos acepta estados personalizados (inserción SQL exitosa)
- [x] Eliminar 'as const' de claimStatus en ClientNew.tsx
- [ ] Nota: El formulario ClientNew no envía datos al hacer submit (problema pendiente de investigar)

## Investigación: Problema de Sincronización de Estados Personalizados
- [ ] Revisar si hay validación adicional en clients.create que verifica existencia de estados
- [ ] Verificar si hay constraint de foreign key entre clients.claimStatus y customClaimStatuses
- [ ] Investigar por qué el formulario ClientNew no envía datos al hacer submit
- [ ] Revisar si el problema es de validación en frontend o backend
- [ ] Probar crear cliente con estado predeterminado para aislar el problema
- [ ] Verificar que los estados personalizados se están cargando correctamente en el dropdown

## Bug: Formulario ClientNew no ejecuta handleSubmit
- [x] Investigar si ManageClaimStatusesDialog dentro del formulario causa conflicto
- [x] Verificar si hay botones anidados que bloquean el submit (identificado: botones sin type="button")
- [x] Revisar estructura HTML del formulario para identificar elementos problemáticos
- [x] Agregar type="button" a todos los botones en ManageClaimStatusesDialog
- [ ] Probar creación de cliente después de corregir estructura

## Bug Crítico: Error al Seleccionar Estado Personalizado
- [ ] Investigar error que ocurre al seleccionar un estado de reclamo personalizado (no predefinido) en formulario de nuevo cliente
- [ ] Identificar causa raíz del problema con estados personalizados
- [ ] Aplicar corrección para permitir creación de clientes con estados personalizados
- [ ] Verificar que la corrección funciona correctamente con todos los estados personalizados

## Mejora de Responsividad: Página de Login
- [x] Revisar código actual de Login.tsx
- [x] Aplicar mejoras de responsividad con Tailwind CSS para móviles, tablets y laptops
- [x] Verificar adaptabilidad en diferentes tamaños de pantalla
- [x] Crear checkpoint con los cambios

## Corrección Urgente: Textos se Salen del Marco en Login (Móviles)
- [x] Investigar problema de desbordamiento de texto en dispositivos móviles
- [x] Aplicar word-wrap, text-wrap y max-width para contener textos largos
- [x] Ajustar padding y márgenes para evitar desbordamiento horizontal
- [x] Verificar en múltiples tamaños de pantalla (320px, 375px, 414px)
- [x] Crear checkpoint con la corrección

## Implementación de Multiidioma (Español/Inglés) - Login
- [x] Instalar i18next, react-i18next y i18next-browser-languagedetector
- [x] Crear estructura de carpetas para traducciones (client/src/locales/)
- [x] Crear archivos de traducción es.json y en.json
- [x] Configurar i18next en la aplicación
- [x] Adaptar componente Login para usar traducciones
- [x] Agregar selector de idioma (dropdown o toggle) en Login
- [x] Guardar preferencia de idioma en localStorage
- [x] Probar cambio de idioma en tiempo real
- [x] Crear checkpoint con la implementación

## Documentación Técnica Completa del CRM
- [ ] Analizar estructura completa del proyecto y recopilar toda la información
- [ ] Documentar arquitectura general, stack tecnológico y configuración inicial
- [ ] Documentar base de datos: esquemas, tablas, relaciones y migraciones
- [ ] Documentar backend: tRPC, routers, procedimientos y autenticación
- [ ] Documentar frontend: componentes, páginas, hooks y estilos
- [ ] Documentar todas las integraciones: OAuth, i18next, mapas, storage, etc.
- [ ] Documentar flujos de usuario completos y casos de uso
- [ ] Crear guía de deployment, configuración de producción y troubleshooting
- [ ] Revisar, compilar y formatear documentación final
- [ ] Entregar documentación completa en formato Markdown
