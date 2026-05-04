import UserService from "../services/UserService.js";


class UserController {
    static async getAll(req, res) {
        try {
            const users = await UserService.getAll();
            res.json({ ok: true, users });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al obtener usuarios'
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const user = await UserService.getById(id);
            res.json({ ok: true, user });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al obtener usuario'
            });
        }
    }

    static async create(req, res) {
        try {
            const result = await UserService.create(req.body);
            res.status(201).json({ ok: true, user: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al crear usuario'
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const result = await UserService.update(id, req.body);
            res.json({ ok: true, user: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al actualizar usuario'
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await UserService.delete(id);
            res.json({ ok: true, message: 'Usuario eliminado con éxito' });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al eliminar usuario'
            });
        }
    }

    static async assignRole(req, res) {
        try {
            const { id } = req.params;
            const { rol } = req.body;
            const result = await UserService.assignRole(id, rol);
            res.json({ ok: true, user: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al asignar rol'
            });
        }
    }
}

export default UserController;
