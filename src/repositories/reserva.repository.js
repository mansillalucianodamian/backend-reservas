import { pool as defaultPool } from '../config/db.js';

export class ReservaRepository {
    constructor(dbPool = defaultPool) {
        this.pool = dbPool;
    }

    async findByFechaHora(fecha, hora, tipo = 'cancha', connection = null) {
        try {
            const executor = connection || this.pool;
            const sql = connection
                ? 'SELECT * FROM reservas WHERE fecha = ? AND hora = ? AND tipo = ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada") FOR UPDATE'
                : 'SELECT * FROM reservas WHERE fecha = ? AND hora = ? AND tipo = ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada")';
            const [rows] = await executor.query(sql, [fecha, hora, tipo]);

            if (!rows || rows.length === 0) {
                return null;
            }

            const mapped = rows.map(r => ({
                id: r.id,
                usuario_id: r.usuario_id,
                tipo: r.tipo,
                fecha: r.fecha,
                hora: r.hora ? r.hora.trim().substring(0, 5) : r.hora,
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

    async create(reserva, connection = null) {
        const executor = connection || this.pool;
        const { usuario_id, fecha, hora, estado, motivo, tipo = 'cancha', con_aire = 0, con_luz = 0 } = reserva;
        try {
            const [result] = await executor.query(
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

    async getAll(filters = {}, connection = null) {
        const executor = connection || this.pool;
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
                u.dni,
                u.telefono,
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

            const [rows] = await executor.query(sql, params);
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la lista de reservas', error);
            throw error;
        }
    }

    async findByUsuarioYFecha(usuario_id, fecha, connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query(
                'SELECT * FROM reservas WHERE usuario_id = ? AND fecha = ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada", "Bloqueado", "Bloqueada")',
                [usuario_id, fecha]
            );
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar reservas por usuario/fecha', error);
            throw error;
        }
    }

    async findByUsuarioYSemana(usuario_id, inicioSemana, finSemana, connection = null) {
        const executor = connection || this.pool;
        try {
            const inicioStr = typeof inicioSemana === 'string' ? inicioSemana : (inicioSemana instanceof Date ? inicioSemana.toISOString().split('T')[0] : String(inicioSemana));
            const finStr = typeof finSemana === 'string' ? finSemana : (finSemana instanceof Date ? finSemana.toISOString().split('T')[0] : String(finSemana));
            const [rows] = await executor.query(
                'SELECT * FROM reservas WHERE usuario_id = ? AND tipo = "cancha" AND fecha BETWEEN ? AND ? AND estado NOT IN ("Cancelado", "Cancelada", "Rechazado", "Rechazada", "Bloqueado", "Bloqueada")',
                [usuario_id, inicioStr, finStr]
            );
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar reservas por semana', error);
            throw error;
        }
    }

    async getByUserId(userId, connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query(
                'SELECT * FROM reservas WHERE usuario_id = ?',
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener las reservas del usuario ' + userId, error);
            throw error;
        }
    }

    async getById(reserva_id, connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query(
                'SELECT * FROM reservas WHERE id = ?',
                [reserva_id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la reserva con id ' + reserva_id, error);
            throw error;
        }
    }

    async updateById(reserva_id, update_reserva, connection = null) {
        const executor = connection || this.pool;
        try {
            const keys = Object.keys(update_reserva);
            const values = Object.values(update_reserva);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            await executor.query(
                `UPDATE reservas SET ${setClause} WHERE id = ?`,
                [...values, reserva_id]
            );
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo actualizar la reserva con id ' + reserva_id, error);
            throw error;
        }
    }

    async deleteById(reserva_id, connection = null) {
        const executor = connection || this.pool;
        try {
            const [result] = await executor.query(
                'DELETE FROM reservas WHERE id = ?',
                [reserva_id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo eliminar la reserva con id ' + reserva_id, error);
            throw error;
        }
    }

    async getByFecha(fecha, connection = null) {
        const executor = connection || this.pool;
        try {
            const sql = connection
                ? 'SELECT id, usuario_id, tipo, fecha, hora, estado FROM reservas WHERE fecha = ? FOR UPDATE'
                : 'SELECT id, usuario_id, tipo, fecha, hora, estado FROM reservas WHERE fecha = ?';
            const [rows] = await executor.query(sql, [fecha]);
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener reservas por fecha', error);
            throw error;
        }
    }

    async getFechasOcupadas(tipo = 'quincho', connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query(
                `SELECT DISTINCT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha 
                 FROM reservas 
                 WHERE tipo = ? 
                   AND LOWER(estado) IN ('pendiente', 'aprobado', 'bloqueado')`,
                [tipo]
            );
            return rows.map(r => r.fecha);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener fechas ocupadas para ' + tipo, error);
            throw error;
        }
    }

    async getPendientes(connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query(`
              SELECT 
                r.id,
                r.tipo,
                r.fecha,
                r.hora,
                r.estado,
                r.usuario_id,
                r.motivo,
                r.con_aire,
                u.dni,
                u.telefono,
                CONCAT(u.apellido, ', ', u.nombre) AS usuario
              FROM reservas r
              LEFT JOIN usuarios u ON r.usuario_id = u.id
              WHERE r.estado = 'Pendiente'
            `);
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener reservas pendientes', error);
            throw error;
        }
    }

    async getRecientesAprobadas(connection = null) {
        const executor = connection || this.pool;
        try {
            const [rows] = await executor.query(`
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
                u.dni,
                u.telefono,
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

const defaultReservaRepository = new ReservaRepository();

// Puentes estáticos para retrocompatibilidad total y soporte de vi.spyOn en Vitest
ReservaRepository.findByFechaHora = (...args) => defaultReservaRepository.findByFechaHora(...args);
ReservaRepository.create = (...args) => defaultReservaRepository.create(...args);
ReservaRepository.getAll = (...args) => defaultReservaRepository.getAll(...args);
ReservaRepository.findByUsuarioYFecha = (...args) => defaultReservaRepository.findByUsuarioYFecha(...args);
ReservaRepository.findByUsuarioYSemana = (...args) => defaultReservaRepository.findByUsuarioYSemana(...args);
ReservaRepository.getByUserId = (...args) => defaultReservaRepository.getByUserId(...args);
ReservaRepository.getById = (...args) => defaultReservaRepository.getById(...args);
ReservaRepository.updateById = (...args) => defaultReservaRepository.updateById(...args);
ReservaRepository.deleteById = (...args) => defaultReservaRepository.deleteById(...args);
ReservaRepository.getByFecha = (...args) => defaultReservaRepository.getByFecha(...args);
ReservaRepository.getFechasOcupadas = (...args) => defaultReservaRepository.getFechasOcupadas(...args);
ReservaRepository.getPendientes = (...args) => defaultReservaRepository.getPendientes(...args);
ReservaRepository.getRecientesAprobadas = (...args) => defaultReservaRepository.getRecientesAprobadas(...args);

export default ReservaRepository;
