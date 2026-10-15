import ENVIROMENT from "../config/enviroment.config.js";
import { ServerError } from "../error.js";
import AuthService from "../services/AuthService.js";
import PasswordService from "../services/PasswordService.js";

class AuthController {
    static async register(req, res) {
        try {
            // Desestructuramos el body
            const { nombre, apellido, dni, telefono, email, password } = req.body;

            // Obtener el host de origen dinámicamente
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.get('host');
            const originHost = host ? `${protocol}://${host}` : null;

            // Pasamos el objeto al servicio (rol es 'usuario' por defecto)
            await AuthService.register({
                nombre,
                apellido,
                dni,
                telefono,
                email,
                password
            }, originHost);

            // Respuesta de éxito
            return res.status(201).json({
                ok: true,
                message: 'Usuario registrado con éxito',
                status: 201
            });
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({
                    ok: false,
                    message: error.message,
                    status: error.status
                });
            } else {
                console.error('ERROR AL REGISTRAR', error);
                return res.status(500).json({
                    ok: false,
                    message: 'Error interno del servidor',
                    status: 500
                });
            }
        }
    }


    static async verifyEmail(req, res) {
        try {
            const { token } = req.params;
            await AuthService.verifyEmail(token);
            
            let redirectUrl = `${ENVIROMENT.URL_FRONTEND}/login?verified=true`;
            if (req.get('host') && !req.get('host').includes('localhost')) {
                const protocol = req.headers['x-forwarded-proto'] || 'http';
                redirectUrl = `${protocol}://${req.get('host')}/login?verified=true`;
            }
            return res.redirect(redirectUrl);
        } catch (error) {
            console.error('ERROR AL VERIFICAR EMAIL', error);
            
            let redirectUrl = `${ENVIROMENT.URL_FRONTEND}/login?verified=false&error=${encodeURIComponent(error.message || 'Error al verificar email')}`;
            if (req.get('host') && !req.get('host').includes('localhost')) {
                const protocol = req.headers['x-forwarded-proto'] || 'http';
                redirectUrl = `${protocol}://${req.get('host')}/login?verified=false&error=${encodeURIComponent(error.message || 'Error al verificar email')}`;
            }
            return res.redirect(redirectUrl);
        }
    }


    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Ahora AuthService.login devuelve { auth_token, user }
            const { auth_token, user } = await AuthService.login(email, password);

            return res.status(200).json({
                ok: true,
                message: 'Usuario logueado con éxito',
                token: auth_token,   // JWT firmado
                user                 // datos básicos del usuario (id, nombre, apellido, email, rol)
            });
        } catch (error) {
            console.error('Error al loguear', error);

            return res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error interno del servidor'
            });
        }
    }


    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            
            let frontendUrl = ENVIROMENT.URL_FRONTEND || 'http://localhost:4200';
            
            // Si URL_FRONTEND es localhost o 127.0.0.1 (valores predeterminados) pero la petición proviene de un host real (producción),
            // se construye de manera dinámica usando el host de la petición.
            if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
                const host = req.get('host');
                if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
                    const protocol = req.headers['x-forwarded-proto'] || 'http';
                    frontendUrl = `${protocol}://${host}`;
                }
            }

            const result = await PasswordService.forgotPassword(email, frontendUrl);
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al enviar correo de recuperación'
            });
        }
    }

    static async resetPassword(req, res) {
        try {
            const { reset_token } = req.params;
            const { new_password } = req.body;
            const result = await PasswordService.resetPassword(reset_token, new_password);
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al restablecer contraseña'
            });
        }
    }


}

export default AuthController;
