import UserRepository from '../repositories/user.repository.js';
import { ServerError } from '../error.js';
import bcrypt from 'bcrypt';

class UserService {
    static async getAll() {
        return await UserRepository.getAll();
    }

    static async getById(id) {
        const user = await UserRepository.getById(id);
        if (!user) throw new ServerError(404, 'Usuario no encontrado');
        return user;
    }

    static async create(data) {
        const { nombre, apellido, dni, telefono, email, password, rol } = data;

        // Encriptar contraseña
        const password_hashed = await bcrypt.hash(password, 12);

        return await UserRepository.create({
            nombre,
            apellido,
            dni,
            telefono,
            email,
            password: password_hashed,
            rol: rol || 'usuario'
        });
    }

    static async update(id, data) {
        const user = await UserRepository.getById(id);
        if (!user) throw new ServerError(404, 'Usuario no encontrado');

        return await UserRepository.updateById(id, data);
    }

    static async delete(id) {
        const user = await UserRepository.getById(id);
        if (!user) throw new ServerError(404, 'Usuario no encontrado');

        return await UserRepository.deleteById(id);
    }

    static async assignRole(id, rol) {
        const valid_roles = ['usuario', 'recepcionista', 'super_admin'];
        if (!valid_roles.includes(rol)) {
            throw new ServerError(400, 'Rol inválido');
        }

        return await UserRepository.updateById(id, { rol });
    }
}

export default UserService;
