import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mailTransporter from '../config/mailTransporter.config.js';
import ENVIROMENT from '../config/enviroment.config.js';
import UserRepository from '../repositories/user.repository.js';
import { ServerError } from '../error.js';
import { getPasswordResetEmailHtml } from '../utils/emailTemplates.js';

class PasswordService {
    // 👉 Paso 1: Solicitar recuperación
    static async forgotPassword(email, frontendUrl = ENVIROMENT.URL_FRONTEND) {
        const user = await UserRepository.getByEmail(email);
        if (!user) {
            throw new ServerError(404, 'Usuario no encontrado');
        }

        // Generar token temporal (expira en 1 hora)
        const reset_token = jwt.sign(
            { user_id: user.id },
            ENVIROMENT.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Guardar token y expiración en la base
        await UserRepository.updateById(user.id, {
            reset_token,
            reset_token_expiration: new Date(Date.now() + 3600000) // 1 hora
        });

        // Enviar correo con el link
        const link = `${frontendUrl}/reset-password/${reset_token}`;
        await mailTransporter.sendMail({
            from: ENVIROMENT.GMAIL_USER,
            to: email,
            subject: 'Restablece tu contraseña - Municipalidad',
            html: getPasswordResetEmailHtml(user.nombre, link)
        });

        return { ok: true, message: 'Correo de recuperación enviado' };
    }

    // 👉 Paso 2: Restablecer contraseña
    static async resetPassword(reset_token, new_password) {
        try {
            const payload = jwt.verify(reset_token, ENVIROMENT.JWT_SECRET);
            const user_id = payload.user_id;

            const user = await UserRepository.getById(user_id);
            if (!user || user.reset_token !== reset_token) {
                throw new ServerError(400, 'Token inválido o expirado');
            }

            // Verificar expiración
            if (user.reset_token_expiration && new Date() > user.reset_token_expiration) {
                throw new ServerError(400, 'Token expirado');
            }

            // Encriptar nueva contraseña
            const password_hashed = await bcrypt.hash(new_password, 12);

            // Actualizar usuario y limpiar token
            await UserRepository.updateById(user_id, {
                password: password_hashed,
                reset_token: null,
                reset_token_expiration: null
            });

            return { ok: true, message: 'Contraseña restablecida con éxito' };
        } catch (error) {
            throw new ServerError(400, 'Token inválido o expirado');
        }
    }
}

export default PasswordService;
