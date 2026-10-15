import ConfigService from "../services/ConfigService.js";
import { ServerError } from "../error.js";

/**
 * Controlador de Configuración (Clean Architecture - ARC-02 / ARC-03).
 * Delega toda la lógica de negocio, persistencia e IoT a ConfigService.
 */
class ConfigController {
    static async ping(req, res) {
        try {
            const result = await ConfigService.ping();
            return res.json({ message: 'Conexión OK', result });
        } catch (error) {
            console.error('[PING CONTROLLER ERROR]:', error);
            return res.status(500).json({ error: 'Error en la conexión a MySQL' });
        }
    }

    static async getPrecioCancha(req, res) {
        try {
            const precio = await ConfigService.getPrecioCancha();
            return res.json({ ok: true, precio });
        } catch (error) {
            console.error('ERROR AL OBTENER PRECIO CANCHA', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener el precio de la cancha' });
        }
    }

    static async updatePrecioCancha(req, res) {
        try {
            const { precio } = req.body;
            const result = await ConfigService.updatePrecioCancha(precio);
            return res.json(result);
        } catch (error) {
            if (error instanceof ServerError) {
                return res.status(error.status).json({ ok: false, message: error.message });
            }
            console.error('ERROR AL ACTUALIZAR PRECIO CANCHA', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar el precio de la cancha' });
        }
    }

    static async getPrecioQuincho(req, res) {
        try {
            const config = await ConfigService.getPrecioQuincho();
            return res.json({ ok: true, ...config });
        } catch (error) {
            console.error('ERROR AL OBTENER CONFIG QUINCHO', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener la configuración del quincho' });
        }
    }

    static async updatePrecioQuincho(req, res) {
        try {
            const result = await ConfigService.updatePrecioQuincho(req.body);
            return res.json(result);
        } catch (error) {
            if (error instanceof ServerError) {
                return res.status(error.status).json({ ok: false, message: error.message });
            }
            console.error('ERROR AL ACTUALIZAR CONFIG QUINCHO', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar las tarifas del quincho' });
        }
    }

    static async getLucesStatus(req, res) {
        try {
            const tipo = req.params.tipo || 'cancha';
            const status = await ConfigService.getLucesStatus(tipo);
            return res.json({ ok: true, ...status });
        } catch (error) {
            console.error('ERROR AL OBTENER ESTADO DE DISPOSITIVO', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener el estado del dispositivo' });
        }
    }

    static async updateLucesMode(req, res) {
        try {
            const tipo = req.params.tipo || 'cancha';
            const { mode } = req.body;
            const result = await ConfigService.updateLucesMode(tipo, mode);
            return res.json(result);
        } catch (error) {
            if (error instanceof ServerError) {
                return res.status(error.status).json({ ok: false, message: error.message });
            }
            console.error('ERROR AL ACTUALIZAR MODO DE DISPOSITIVO', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar el modo del dispositivo' });
        }
    }
}

export default ConfigController;
