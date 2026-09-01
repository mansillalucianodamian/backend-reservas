import { pool } from '../config/db.js';

class ReservaRepository {
    static async findByFechaHora(fecha, hora, tipo = 'cancha') {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE fecha = ? AND hora = ? AND tipo = ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada")',
                [fecha, hora, tipo]
            );

            // Si no hay reservas, devolvemos null
            if (!rows || rows.length === 0) {
                return null;
            }

            // Normalizamos el resultado y devolvemos la primera coincidencia
            const mapped = rows.map(r => ({
                id: r.id,
                usuario_id: r.usuario_id,
                tipo: r.tipo,
                fecha: r.fecha,
                hora: r.hora.trim().substring(0, 5), // "08:00:00" → "08:00"
                estado: r.estado,
                con_aire: r.con_aire,
                con_luz: r.con_luz
            }));
            return mapped[0];
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar la reserva en fecha/hora', error);
            throw error;
        }
    }


    static async create(reserva) {
        const { usuario_id, fecha, hora, estado, motivo, tipo = 'cancha', con_aire = 0, con_luz = 0 } = reserva;
        try {
            // Si viene motivo (bloqueo), lo insertamos; si no, lo dejamos en NULL
            const [result] = await pool.query(
                'INSERT INTO reservas (usuario_id, tipo, fecha, hora, estado, motivo, con_aire, con_luz) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [usuario_id, tipo, fecha, hora, estado, motivo || null, con_aire ? 1 : 0, con_luz ? 1 : 0]
            );

            return {
                id: result.insertId,
                usuario_id,
                tipo,
                fecha,
                hora,
                estado,
                motivo: motivo || null,
                con_aire: con_aire ? 1 : 0,
                con_luz: con_luz ? 1 : 0
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
        r.tipo,
        r.fecha,
        r.hora,
        r.estado,
        r.usuario_id,
        r.motivo,
        r.con_aire,
        r.con_luz,
        r.fecha_aprobacion,
        CONCAT(u.apellido, ', ', u.nombre) AS usuario
      FROM reservas r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
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
                'SELECT * FROM reservas WHERE usuario_id = ? AND fecha = ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada", "Bloqueado", "Bloqueada")',
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
            const inicioStr = typeof inicioSemana === 'string' ? inicioSemana : (inicioSemana instanceof Date ? inicioSemana.toISOString().split('T')[0] : String(inicioSemana));
            const finStr = typeof finSemana === 'string' ? finSemana : (finSemana instanceof Date ? finSemana.toISOString().split('T')[0] : String(finSemana));
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE usuario_id = ? AND tipo = "cancha" AND fecha BETWEEN ? AND ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada", "Bloqueado", "Bloqueada")',
                [usuario_id, inicioStr, finStr]
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
                "SELECT id, usuario_id, tipo, fecha, hora, estado FROM reservas WHERE fecha = ?",
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
        r.tipo,
        r.fecha,
        r.hora,
        r.estado,
        r.usuario_id,
        r.con_aire,
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
