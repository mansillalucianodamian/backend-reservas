import { pool } from '../config/db.js';

class ReservaRepository {
    static async findByFechaHora(fecha, hora) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM reservas WHERE fecha = ? AND hora = ?',
                [fecha, hora]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo verificar la reserva en fecha/hora', error);
            throw error;
        }
    }


    static async create(reserva) {
        const { usuario_id, fecha, hora, motivo, estado } = reserva;
        try {
            const [result] = await pool.query(
                'INSERT INTO reservas (usuario_id, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?)',
                [usuario_id, fecha, hora, motivo, estado]
            );

            return {
                id: result.insertId,
                usuario_id,
                fecha,
                hora,
                motivo,
                estado
            };
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo crear la reserva', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT * FROM reservas');
            return rows;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo obtener la lista de reservas', error);
            throw error;
        }
    }

    static async getById(reserva_id) {
        try {
            const [rows] = await pool.query('SELECT * FROM reservas WHERE id = ?', [reserva_id]);
            return rows[0];
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
            await pool.query(`UPDATE reservas SET ${setClause} WHERE id = ?`, [...values, reserva_id]);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo actualizar la reserva con id ' + reserva_id, error);
            throw error;
        }
    }

    static async deleteById(reserva_id) {
        try {
            const [result] = await pool.query('DELETE FROM reservas WHERE id = ?', [reserva_id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo eliminar la reserva con id ' + reserva_id, error);
            throw error;
        }
    }
}

export default ReservaRepository;
