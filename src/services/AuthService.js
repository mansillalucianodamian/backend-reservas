import ENVIROMENT from "../config/enviroment.config.js";
import mailTransporter from "../config/mailTransporter.config.js";
import { ServerError } from "../error.js";
import UserRepository from "../repositories/user.repository.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuthService {
    static async register(userData) {
        const { nombre, apellido, dni, telefono, email, password, rol } = userData;

        const user = await UserRepository.getByEmail(email);
        if (user) throw new ServerError(409, 'Email ya en uso');

        const userByDni = await UserRepository.getByDni(dni);
        if (userByDni) throw new ServerError(409, 'El DNI ya está registrado');

        const password_hashed = await bcrypt.hash(password, 12);

        const user_created = await UserRepository.create({
            nombre,
            apellido,
            dni,
            telefono,
            email,
            password: password_hashed,
            rol
        });

        const verification_token = jwt.sign(
            { user_id: user_created.id },
            ENVIROMENT.JWT_SECRET
        );

        await mailTransporter.sendMail({
            from: ENVIROMENT.GMAIL_USER,
            to: email,
            subject: 'Verifica tu cuenta de mail',
            html: `
              <h1>Verifica tu cuenta de mail</h1>
              <a href="${ENVIROMENT.URL_BACKEND}/api/auth/verify-email/${verification_token}">Verificar</a>
            `
        });

        return user_created;
    }

    static async verifyEmail(verification_token) {
        try {
            const payload = jwt.verify(verification_token, ENVIROMENT.JWT_SECRET);
            const { user_id } = payload;

            if (!user_id) throw new ServerError(400, 'Acción denegada, token inválido');

            const user_found = await UserRepository.getById(user_id);
            if (!user_found) throw new ServerError(404, 'Usuario no encontrado');
            if (user_found.verified_email) throw new ServerError(400, 'Usuario ya validado');

            await UserRepository.updateById(user_id, { verified_email: true });
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, 'Token inválido');
            }
            throw error;
        }
    }

    static async login(email, password) {
        const user_found = await UserRepository.getByEmail(email);
        if (!user_found) throw new ServerError(404, 'Usuario con este mail no encontrado');

        if (!user_found.verified_email) throw new ServerError(401, 'Usuario con mail no verificado');

        const is_same_password = await bcrypt.compare(password, user_found.password);
        if (!is_same_password) throw new ServerError(401, 'Usuario o Contraseña inválida');

        const payload = {
            user_id: user_found.id,
            nombre: user_found.nombre,
            apellido: user_found.apellido,
            email: user_found.email,
            rol: user_found.rol
        };

        const auth_token = jwt.sign(
            payload,
            ENVIROMENT.JWT_SECRET,   // 👈 ahora usamos ENVIROMENT
            { expiresIn: '24h' }
        );

        return {
            auth_token,
            user: {
                id: user_found.id,
                nombre: user_found.nombre,
                apellido: user_found.apellido,
                email: user_found.email,
                rol: user_found.rol
            }
        };
    }
}

export default AuthService;
