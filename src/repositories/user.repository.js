import { pool as defaultPool } from '../config/db.js';

export class UserRepository {
    constructor(dbPool = defaultPool) {
        this.pool = dbPool;
    }

    async create(user, connection = null) {
        const executor = connection || this.pool;
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
            const [result] = await executor.query(
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

    async getAll(connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query('SELECT * FROM usuarios');
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la lista de usuarios', error);
            throw error;
        }
    }

    async getById(user_id, connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query('SELECT * FROM usuarios WHERE id = ?', [user_id]);
            return rows[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener el usuario con id ' + user_id, error);
            throw error;
        }
    }

    async getByEmail(email, connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query('SELECT * FROM usuarios WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener el usuario con email ' + email, error);
            throw error;
        }
    }

    async getByDni(dni, connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query('SELECT * FROM usuarios WHERE dni = ?', [dni]);
            return rows[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener el usuario con dni ' + dni, error);
            throw error;
        }
    }

    /**
     * Eliminación de usuario y sus reservas con Garantía Transaccional ACID (Regla 26).
     * Si la eliminación del usuario falla, se revierte la eliminación de sus reservas (Rollback).
     */
    async deleteById(user_id, customConnection = null) {
        let connection = customConnection;
        let managedTransaction = false;

        if (!connection && this.pool && typeof this.pool.getConnection === 'function') {
            try {
                connection = await this.pool.getConnection();
                if (connection && typeof connection.beginTransaction === 'function') {
                    await connection.beginTransaction();
                    managedTransaction = true;
                }
            } catch (connErr) {
                connection = null;
                managedTransaction = false;
            }
        }

        const executor = connection || this.pool;

        try {
            // 1. Eliminar reservas asociadas dentro de la transacción
            await executor.query('DELETE FROM reservas WHERE usuario_id = ?', [user_id]);

            // 2. Eliminar usuario dentro de la misma transacción
            const [result] = await executor.query('DELETE FROM usuarios WHERE id = ?', [user_id]);

            if (managedTransaction && connection) {
                await connection.commit();
            }
            return result.affectedRows > 0;
        } catch (error) {
            if (managedTransaction && connection) {
                await connection.rollback();
            }
            console.error('[SERVER ERROR]: no se pudo eliminar el usuario con id ' + user_id, error);
            throw error;
        } finally {
            if (managedTransaction && connection && typeof connection.release === 'function') {
                connection.release();
            }
        }
    }

    async updateById(user_id, update_user, connection = null) {
        const executor = connection || this.pool;
        try {
            const keys = Object.keys(update_user);
            const values = Object.values(update_user);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            await executor.query(`UPDATE usuarios SET ${setClause} WHERE id = ?`, [...values, user_id]);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo actualizar el usuario con id ' + user_id, error);
            throw error;
        }
    }
}

const defaultUserRepository = new UserRepository();

// Puentes estáticos para retrocompatibilidad total y soporte de testing
UserRepository.create = (...args) => defaultUserRepository.create(...args);
UserRepository.getAll = (...args) => defaultUserRepository.getAll(...args);
UserRepository.getById = (...args) => defaultUserRepository.getById(...args);
UserRepository.getByEmail = (...args) => defaultUserRepository.getByEmail(...args);
UserRepository.getByDni = (...args) => defaultUserRepository.getByDni(...args);
UserRepository.deleteById = (...args) => defaultUserRepository.deleteById(...args);
UserRepository.updateById = (...args) => defaultUserRepository.updateById(...args);

export default UserRepository;