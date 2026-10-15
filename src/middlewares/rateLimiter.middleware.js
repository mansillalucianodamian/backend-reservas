import rateLimit from 'express-rate-limit';

/**
 * Limitador estricto para inicio de sesión (Protección contra Fuerza Bruta - OWASP).
 * Máximo 5 intentos cada 15 minutos por IP.
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        ok: false,
        message: 'Demasiados intentos de inicio de sesión desde esta IP. Por favor, intenta de nuevo en 15 minutos.'
    }
});

/**
 * Limitador general de la API (Protección contra DoS y Saturación de Recursos).
 * Máximo 100 peticiones por minuto por IP.
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 peticiones
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        ok: false,
        message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo en un minuto.'
    }
});
