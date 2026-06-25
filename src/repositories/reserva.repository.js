import { pool } from '../config/db.js';

class ReservaRepository {
    static async findByFechaHora(fecha, hora) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE fecha = ? AND hora = ?',
                [fecha, hora]
            );

            // Si no hay reservas, devolvemos null
            if (!rows || rows.length === 0) {
                return null;
            }

            // Normalizamos el resultado
            return rows.map(r => ({
                id: r.id,
                usuario_id: r.usuario_id,
                fecha: r.fecha,
                hora: r.hora.trim().substring(0, 5), // "08:00:00" → "08:00"
                estado: (r.estado || '').toLowerCase()
            }));
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar la reserva en fecha/hora', error);
            throw error;
        }
    }


    static async create(reserva) {
        const { usuario_id, fecha, hora, estado, motivo } = reserva;
        try {
            // Si viene motivo (bloqueo), lo insertamos; si no, lo dejamos en NULL
            const [result] = await pool.query(
                'INSERT INTO reservas (usuario_id, fecha, hora, estado, motivo) VALUES (?, ?, ?, ?, ?)',
                [usuario_id, fecha, hora, estado, motivo || null]
            );

            return {
                id: result.insertId,
                usuario_id,
                fecha,
                hora,
                estado,
                motivo: motivo || null
            };
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo crear la reserva', error);
            throw error;
        }
    }
    static async getAll() {
        try {
            const [rows] = await pool.query(`
      SELECT 
        r.id,
        r.fecha,
        r.hora,
        r.estado,
        r.usuario_id,
        CONCAT(u.apellido, ', ', u.nombre) AS usuario
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
    `);
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la lista de reservas', error);
            throw error;
        }
    }

    static async findByUsuarioYFecha(usuario_id, fecha) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE usuario_id = ? AND fecha = ? AND estado != "Cancelado"',
                [usuario_id, fecha]
            );
            return rows; // devuelve todas las reservas de ese usuario en esa fecha
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar reservas por usuario/fecha', error);
            throw error;
        }
    }
    static async findByUsuarioYSemana(usuario_id, inicioSemana, finSemana) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE usuario_id = ? AND fecha BETWEEN ? AND ? AND estado != "Cancelado"',
                [usuario_id, inicioSemana.toISOString().split('T')[0], finSemana.toISOString().split('T')[0]]
            );
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar reservas por semana', error);
            throw error;
        }
    }

    static async getByUserId(userId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE usuario_id = ?',
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener las reservas del usuario ' + userId, error);
            throw error;
        }
    }

    static async getById(reserva_id) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE id = ?',
                [reserva_id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la reserva con id ' + reserva_id, error);
            throw error;
        }
    }

    static async updateById(reserva_id, update_reserva) {
        try {
            const keys = Object.keys(update_reserva);
            const values = Object.values(update_reserva);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            await pool.query(
                `UPDATE reservas SET ${setClause} WHERE id = ?`,
                [...values, reserva_id]
            );
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo actualizar la reserva con id ' + reserva_id, error);
            throw error;
        }
    }

    static async deleteById(reserva_id) {
        try {
            const [result] = await pool.query(
                'DELETE FROM reservas WHERE id = ?',
                [reserva_id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo eliminar la reserva con id ' + reserva_id, error);
            throw error;
        }
    }
    static async getByFecha(fecha) {
        try {
            const [rows] = await pool.query(
                "SELECT id, usuario_id, fecha, hora, estado FROM reservas WHERE fecha = ?",
                [fecha]
            );
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener reservas por fecha', error);
            throw error;
        }
    }
    static async getPendientes() {
        try {
            const [rows] = await pool.query(`
      SELECT 
        r.id,
        r.fecha,
        r.hora,
        r.estado,
        r.usuario_id,
        CONCAT(u.apellido, ', ', u.nombre) AS usuario
      FROM reservas r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      WHERE r.estado = 'Pendiente'
    `);
            return rows; // 👈 siempre array
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener reservas pendientes', error);
            throw error;
        }
    }
}

export default ReservaRepository;
