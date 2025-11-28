# CRM Public Adjusters

Sistema de CRM multi-tenant construido con React, TypeScript, tRPC y MySQL.

## 🚀 Características

- **Multi-tenant**: Múltiples organizaciones en una sola instancia
- **Type-safe**: TypeScript end-to-end con tRPC
- **Seguro**: Autenticación JWT, rate limiting, helmet
- **Moderno**: React 19, Vite, Tailwind CSS, Shadcn/UI

## 📋 Requisitos

- Node.js 20+
- MySQL 8.0+
- pnpm 10+

## 🛠️ Desarrollo Local

### 1. Clonar repositorio

```bash
git clone <repository-url>
cd crm-public-adjusters
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de base de datos:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=crm_db

JWT_SECRET=tu_secret_de_minimo_32_caracteres
```

### 4. Ejecutar migraciones

```bash
pnpm db:push
```

### 5. Iniciar servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📦 Build para Producción

### Método 1: Build estándar

```bash
# Build cliente y servidor
pnpm build

# Iniciar en modo producción
pnpm start
```

### Método 2: Docker

```bash
# Build imagen
docker build -t crm-public-adjusters .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e DATABASE_HOST=tu_host \
  -e DATABASE_USER=tu_usuario \
  -e DATABASE_PASSWORD=tu_password \
  -e DATABASE_NAME=crm_db \
  -e JWT_SECRET=tu_secret \
  crm-public-adjusters
```

## 🌐 Deployment

### Opción 1: Render.com (Recomendado)

1. Conecta tu repositorio a Render
2. Render detectará `render.yaml` automáticamente
3. Configura las variables de entorno en la UI
4. Deploy automático en cada push

**Variables de entorno requeridas:**
- `DATABASE_HOST`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `JWT_SECRET` (generado automáticamente)

### Opción 2: Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Deploy automático

**Nota**: Vercel es serverless, necesitarás una base de datos externa (PlanetScale, Railway, etc.)

### Opción 3: VPS (DigitalOcean, AWS, etc.)

```bash
# En el servidor
git clone <repository-url>
cd crm-public-adjusters
pnpm install
pnpm build

# Configurar PM2 para mantener la app corriendo
pnpm add -g pm2
pm2 start dist/index.js --name crm

# Configurar nginx como reverse proxy
# Ver: docs/nginx.conf.example
```

## 🗄️ Migraciones de Base de Datos

### Crear índices de optimización

Después del primer deploy, ejecuta:

```bash
mysql -u usuario -p nombre_db < drizzle/migrations/add_performance_indexes.sql
```

Esto creará índices compuestos que mejorarán significativamente el rendimiento.

## 🔒 Seguridad

La aplicación incluye:

- **Helmet**: Headers de seguridad HTTP
- **Rate Limiting**: 
  - Login: 5 intentos cada 15 minutos
  - API general: 100 requests cada 15 minutos
- **CORS**: Configurado para dominios permitidos
- **Cookies httpOnly**: Protección contra XSS
- **JWT**: Tokens de sesión seguros

### Configurar dominios permitidos (producción)

En `.env`:

```env
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

## 🏗️ Estructura del Proyecto

```
crm-public-adjusters/
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes UI
│   │   ├── pages/       # Páginas
│   │   ├── hooks/       # Hooks personalizados
│   │   └── lib/         # Utilidades
│   └── dist/            # Build de producción
│
├── server/              # Backend Node.js
│   ├── _core/           # Infraestructura
│   │   ├── security.ts  # Middlewares de seguridad
│   │   ├── rateLimiting.ts
│   │   └── index.ts     # Entry point
│   ├── routers.ts       # tRPC endpoints
│   └── db.ts            # Data access layer
│
├── drizzle/             # ORM y migraciones
│   ├── schema.ts        # Definición de tablas
│   └── migrations/      # Scripts SQL
│
└── shared/              # Código compartido
    └── const.ts
```

## 🧪 Testing

```bash
# Ejecutar tests
pnpm test

# Type checking
pnpm check
```

## 📊 Monitoreo

### Health Check

Endpoint: `GET /api/health`

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T05:00:00.000Z",
  "environment": "production"
}
```

### Logs

En producción, considera integrar:
- [Sentry](https://sentry.io) para error tracking
- [Datadog](https://datadoghq.com) para APM
- [LogDNA](https://logdna.com) para logs centralizados

## 🔧 Troubleshooting

### Error: "No se puede conectar a la base de datos"

Verifica:
1. Credenciales en `.env`
2. MySQL está corriendo
3. Firewall permite conexiones al puerto 3306

### Error: "Too Many Requests" al hacer login

El rate limiter está bloqueando. Espera 15 minutos o ajusta en `server/_core/rateLimiting.ts`.

### Cookies no se guardan en producción

Asegúrate de:
1. Estar usando HTTPS
2. `ALLOWED_ORIGINS` incluye tu dominio
3. El dominio de la cookie coincide con tu URL

## 📝 Licencia

MIT

## 👥 Soporte

Para issues y preguntas, abre un ticket en GitHub.
