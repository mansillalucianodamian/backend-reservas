import { pool } from '../config/db.js';

class ConfigRepository {
    static async getByKey(key) {
        try {
            const [rows] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', [key]);
            if (!rows || rows.length === 0) return null;
            return rows[0].valor;
        } catch (error) {
            console.error(`[SERVER ERROR]: no se pudo obtener la configuración para la clave ${key}`, error);
            throw error;
        }
    }

    static async setByKey(key, value) {
        try {
            const [result] = await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE valor = ?`,
                [key, value.toString(), value.toString()]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`[SERVER ERROR]: no se pudo guardar la configuración para la clave ${key}`, error);
            throw error;
        }
    }
}

export default ConfigRepository;
