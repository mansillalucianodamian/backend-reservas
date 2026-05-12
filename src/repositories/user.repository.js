import { pool } from '../config/db.js';

class UserRepository {
    static async create(user) {
        const {
            nombre,
            apellido,
            dni,
            telefono,
            email,
            password,
            rol
        } = user;
        try {
            const [result] = await pool.query(
                `INSERT INTO usuarios 
         (nombre, apellido, dni, telefono, email, password, verified_email, rol) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [nombre, apellido, dni, telefono, email, password, false, rol]
            );

            return {
                id: result.insertId,
                nombre,
                apellido,
                dni,
                telefono,
                email,
                password,
                verified_email: false,
                rol
            };
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo crear el usuario', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT * FROM usuarios');
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la lista de usuarios', error);
            throw error;
        }
    }

    static async getById(user_id) {
        try {
            const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [user_id]);
            return rows[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener el usuario con id ' + user_id, error);
            throw error;
        }
    }

    static async getByEmail(email) {
        try {
            const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener el usuario con email ' + email, error);
            throw error;
        }
    }

    static async getByDni(dni) {
        try {
            const [rows] = await pool.query('SELECT * FROM usuarios WHERE dni = ?', [dni]);
            return rows[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener el usuario con dni ' + dni, error);
            throw error;
        }
    }

    static async deleteById(user_id) {
        try {
            const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [user_id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo eliminar el usuario con id ' + user_id, error);
            throw error;
        }
    }

    static async updateById(user_id, update_user) {
        try {
            const keys = Object.keys(update_user);
            const values = Object.values(update_user);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            await pool.query(`UPDATE usuarios SET ${setClause} WHERE id = ?`, [...values, user_id]);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo actualizar el usuario con id ' + user_id, error);
            throw error;
        }
    }
}

export default UserRepository;