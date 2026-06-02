/**
 * Middleware de autorización por rol
 * @param {...string} rolesPermitidos - Lista de roles que pueden acceder a la ruta
 */
export const roleMiddleware = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ ok: false, message: 'No autenticado' });
        }

        const rolUsuario = req.user.rol?.toLowerCase();
        console.log("🔍 roleMiddleware revisando rol:", rolUsuario);

        const rolesNormalizados = rolesPermitidos.map(r => r.toLowerCase());

        if (!rolesNormalizados.includes(rolUsuario)) {
            console.log("❌ Rol no autorizado:", rolUsuario);
            return res.status(403).json({ ok: false, message: 'No autorizado' });
        }

        console.log("✅ roleMiddleware OK, rol permitido:", rolUsuario);
        next();
    };
};


