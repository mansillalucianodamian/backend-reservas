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
    static async getAll(filters = {}) {
        try {
            let sql = `
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
              WHERE 1=1
            `;
            const params = [];

            if (filters.fecha) {
                sql += ' AND r.fecha = ?';
                params.push(filters.fecha);
            }
            if (filters.tipo && filters.tipo !== 'todos') {
                sql += ' AND r.tipo = ?';
                params.push(filters.tipo);
            }
            if (filters.estado && filters.estado !== 'todos') {
                const estLower = filters.estado.toLowerCase();
                if (estLower === 'aprobado' || estLower === 'aprobada') {
                    sql += ' AND r.estado IN ("Aprobado", "Aprobada", "Confirmado", "Confirmada")';
                } else if (estLower === 'cancelado' || estLower === 'cancelada') {
                    sql += ' AND r.estado IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada")';
                } else if (estLower === 'pendiente') {
                    sql += ' AND r.estado = "Pendiente"';
                } else if (estLower === 'bloqueado' || estLower === 'bloqueada') {
                    sql += ' AND r.estado = "Bloqueado"';
                } else {
                    sql += ' AND r.estado = ?';
                    params.push(filters.estado);
                }
            }
            if (filters.hora && filters.hora !== 'todos') {
                sql += ' AND r.hora LIKE ?';
                params.push(`${filters.hora.substring(0, 5)}%`);
            }
            if (filters.busqueda && filters.busqueda.trim() !== '') {
                const q = filters.busqueda.trim();
                const qLike = `%${q}%`;
                sql += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.dni LIKE ? OR r.motivo LIKE ? OR r.id = ?)';
                params.push(qLike, qLike, qLike, qLike, isNaN(q) ? 0 : Number(q));
            }

            sql += ' ORDER BY r.fecha DESC, r.hora DESC';

            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(Number(filters.limit));
            }

            const [rows] = await pool.query(sql, params);
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

    static async getRecientesAprobadas() {
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
              WHERE r.estado = 'Aprobado' 
                AND r.fecha_aprobacion IS NOT NULL 
                AND r.fecha_aprobacion >= NOW() - INTERVAL 15 MINUTE
              ORDER BY r.fecha_aprobacion DESC
            `);
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener reservas recientes aprobadas', error);
            throw error;
        }
    }
}

export default ReservaRepository;
