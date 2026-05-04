
/**
 * Middleware de autorización por rol
 * @param {...string} rolesPermitidos - Lista de roles que pueden acceder a la ruta
 */
export const roleMiddleware = (...rolesPermitidos) => {
    return (req, res, next) => {
        // Si no hay usuario en la request (no pasó por authMiddleware)
        if (!req.user) {
            return res.status(401).json({ ok: false, message: 'No autenticado' });
        }

        // Si el rol del usuario no está dentro de los permitidos
        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ ok: false, message: 'No autorizado' });
        }

        // Si pasa las validaciones, continúa a la ruta
        next();
    };
};
