import helmet from 'helmet';
import type { Express } from 'express';

/**
 * Configura middlewares de seguridad para la aplicación
 */
export function setupSecurityMiddlewares(app: Express) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Helmet: Headers de seguridad HTTP
    app.use(
        helmet({
            // Content Security Policy configurado para producción
            contentSecurityPolicy: isProduction ? {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline necesario para Vite
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:", "blob:"], // Permitir imágenes externas
                    fontSrc: ["'self'", "data:"],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                },
            } : false, // Deshabilitado en desarrollo
            crossOriginEmbedderPolicy: false,
        })
    );

    // CORS: Configurar orígenes permitidos
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:5173', // Vite dev server
    ];

    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }

        next();
    });

    // Prevenir clickjacking
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    });

    // Prevenir MIME type sniffing
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
    });
}
