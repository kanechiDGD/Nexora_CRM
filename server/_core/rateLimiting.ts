import rateLimit from 'express-rate-limit';

// Rate limiter para endpoints de autenticación
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos
    message: 'Demasiados intentos de inicio de sesión, intenta de nuevo en 15 minutos',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter general para API
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por ventana
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter estricto para operaciones sensibles
export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // 10 intentos
    message: 'Límite de solicitudes excedido, intenta en una hora',
    standardHeaders: true,
    legacyHeaders: false,
});
