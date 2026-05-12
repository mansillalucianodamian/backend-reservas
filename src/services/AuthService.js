import ENVIROMENT from "../config/enviroment.config.js";
import mailTransporter from "../config/mailTransporter.config.js";
import { ServerError } from "../error.js";
import UserRepository from "../repositories/user.repository.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuthService {
    static async register(userData) {
        const { nombre, apellido, dni, telefono, email, password, rol } = userData;

        // Verificar si el email ya existe
        const user = await UserRepository.getByEmail(email);
        if (user) {
            throw new ServerError(409, 'Email ya en uso');
        }
        // Verificar si el DNI ya existe
        const userByDni = await UserRepository.getByDni(dni);
        if (userByDni) {
            throw new ServerError(409, 'El DNI ya está registrado');
        }

        // Encriptar contraseña
        const password_hashed = await bcrypt.hash(password, 12);

        // Crear usuario en MySQL
        const user_created = await UserRepository.create({
            nombre,
            apellido,
            dni,
            telefono,
            email,
            password: password_hashed,
            rol
        });

        const user_id_created = user_created.id;

        // Generar token de verificación
        const verification_token = jwt.sign(
            { user_id: user_id_created },
            ENVIROMENT.JWT_SECRET
        );

        // Enviar mail de verificación
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

            if (!user_id) {
                throw new ServerError(400, 'Acción denegada, token con datos insuficientes');
            }

            const user_found = await UserRepository.getById(user_id);
            if (!user_found) {
                throw new ServerError(404, 'Usuario no encontrado');
            }
            if (user_found.verified_email) {
                throw new ServerError(400, 'Usuario ya validado');
            }

            await UserRepository.updateById(user_id, { verified_email: true });
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, 'Token inválido');
            }
            throw error;
        }
    }

    static async login(email, password) {
        // 1. Buscar usuario por email
        const user_found = await UserRepository.getByEmail(email);
        if (!user_found) {
            throw new ServerError(404, 'Usuario con este mail no encontrado');
        }

        // 2. Validar que el email esté verificado
        if (!user_found.verified_email) {
            throw new ServerError(401, 'Usuario con mail no verificado');
        }

        // 3. Comparar contraseñas (bcrypt)
        const is_same_password = await bcrypt.compare(password, user_found.password);
        if (!is_same_password) {
            throw new ServerError(401, 'Usuario o Contraseña inválida');
        }

        // 4. Armar payload del JWT con datos clave del usuario
        const payload = {
            user_id: user_found.id,
            nombre: user_found.nombre,
            apellido: user_found.apellido,
            email: user_found.email,
            rol: user_found.rol
        };

        // 5. Firmar el token con secreto y expiración
        const auth_token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // clave secreta definida en tu .env
            { expiresIn: '24h' }    // duración del token
        );

        // 6. Devolver token y datos básicos del usuario
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
