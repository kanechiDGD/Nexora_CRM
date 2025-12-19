# Configuración de Cloudflare R2 para URLs Públicas Permanentes

## Objetivo

Configurar el bucket de Cloudflare R2 para que los documentos subidos tengan URLs públicas permanentes sin expiración, garantizando acceso continuo a los archivos.

## Pasos de Configuración

### 1. Acceder al Dashboard de Cloudflare R2

1. Inicia sesión en tu cuenta de Cloudflare
2. Ve a **R2 Object Storage** en el panel lateral
3. Selecciona tu bucket (por defecto: `nexora`)

### 2. Habilitar Acceso Público

1. En la página del bucket, ve a la pestaña **Settings**
2. Busca la sección **Public Access**
3. Haz clic en **Allow Access** o **Connect Domain**
4. Tienes dos opciones:

   **Opción A: Usar dominio de Cloudflare (Recomendado para desarrollo)**
   - Haz clic en **Allow Access**
   - Cloudflare generará automáticamente una URL pública como: `https://pub-xxxxxx.r2.dev`
   - Copia esta URL

   **Opción B: Usar dominio personalizado (Recomendado para producción)**
   - Haz clic en **Connect Domain**
   - Ingresa un subdominio de tu dominio (ej: `cdn.tudominio.com`)
   - Sigue las instrucciones para configurar el registro DNS
   - La URL pública será: `https://cdn.tudominio.com`

### 3. Configurar Variables de Entorno

Actualiza tu archivo `.env` con la URL pública obtenida:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET_NAME=nexora
R2_PUBLIC_URL=https://pub-xxxxxx.r2.dev  # O tu dominio personalizado
```

### 4. Verificar la Configuración

1. Reinicia tu servidor
2. Sube un documento de prueba
3. Verifica que la URL generada sea pública y accesible sin autenticación
4. Confirma que la URL no contiene parámetros de firma (como `X-Amz-Signature`)

## Seguridad

Esta configuración es segura porque:

- **Las URLs son impredecibles**: Cada archivo tiene un nombre único con timestamp y string aleatorio
- **No hay listado público**: No es posible listar todos los archivos del bucket
- **Autenticación en la aplicación**: Solo usuarios autenticados pueden ver qué documentos existen
- **Organización por carpetas**: Los archivos están organizados por `organizationId` y `clientId`

## Ventajas de URLs Públicas Permanentes

✅ **Sin expiración**: Los enlaces funcionan para siempre
✅ **Mejor rendimiento**: No hay latencia adicional al generar URLs
✅ **Compartibles**: Los enlaces se pueden compartir, imprimir o guardar
✅ **Menor costo**: No hay llamadas adicionales a la API de R2
✅ **Simplicidad**: Menos código que mantener

## Notas Importantes

- Los archivos existentes con URLs presignadas seguirán funcionando hasta que expiren (7 días)
- Los nuevos archivos subidos después de esta configuración tendrán URLs permanentes
- Si necesitas migrar URLs antiguas, contacta al equipo de desarrollo
