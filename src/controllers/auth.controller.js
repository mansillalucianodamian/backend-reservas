import ENVIROMENT from "../config/enviroment.config.js";
import { ServerError } from "../error.js";
import AuthService from "../services/AuthService.js";
import PasswordService from "../services/PasswordService.js";

class AuthController {
    static async register(req, res) {
        try {
            // Desestructuramos el body
            const { nombre, apellido, dni, telefono, email, password, rol } = req.body;

            // Pasamos el objeto completo al servicio
            await AuthService.register({
                nombre,
                apellido,
                dni,
                telefono,
                email,
                password,
                rol
            });

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
            const { token } = req.params; // lo tomamos de params
            await AuthService.verifyEmail(token);
            res.json({ ok: true, message: 'Email verificado con éxito' });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al verificar email'
            });
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
            const result = await PasswordService.forgotPassword(email);
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
