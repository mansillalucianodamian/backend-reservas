import ConfigRepository from "../repositories/config.repository.js";
import { getLuzStatus, encenderLuz, apagarLuz, getAireQuinchoStatus, encenderAireQuincho, apagarAireQuincho } from "../services/ShellyService.js";

class ConfigController {
    static async getPrecioCancha(req, res) {
        try {
            const precioStr = await ConfigRepository.getByKey('precio_cancha');
            const precio = precioStr ? parseInt(precioStr, 10) : 5000;
            return res.json({ ok: true, precio });
        } catch (error) {
            console.error('ERROR AL OBTENER PRECIO CANCHA', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener el precio de la cancha' });
        }
    }

    static async updatePrecioCancha(req, res) {
        try {
            const { precio } = req.body;
            
            // Validaciones básicas
            const precioNum = parseInt(precio, 10);
            if (isNaN(precioNum) || precioNum <= 0) {
                return res.status(400).json({ ok: false, message: 'El precio debe ser un número entero positivo' });
            }

            await ConfigRepository.setByKey('precio_cancha', precioNum);
            return res.json({ ok: true, message: 'Precio de cancha actualizado con éxito' });
        } catch (error) {
            console.error('ERROR AL ACTUALIZAR PRECIO CANCHA', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar el precio de la cancha' });
        }
    }

    static async getPrecioQuincho(req, res) {
        try {
            const precioStr = await ConfigRepository.getByKey('precio_quincho');
            const precio = precioStr ? parseInt(precioStr, 10) : 21500;
            const senaStr = await ConfigRepository.getByKey('sena_quincho');
            const sena = senaStr ? parseInt(senaStr, 10) : 0;
            const precioAireStr = await ConfigRepository.getByKey('precio_aire_quincho');
            const precio_aire = precioAireStr ? parseInt(precioAireStr, 10) : 10000;
            return res.json({ ok: true, precio, sena, precio_aire });
        } catch (error) {
            console.error('ERROR AL OBTENER CONFIG QUINCHO', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener la configuración del quincho' });
        }
    }

    static async updatePrecioQuincho(req, res) {
        try {
            const { precio, sena, precio_aire, precioAire } = req.body;
            
            const precioNum = parseInt(precio, 10);
            if (isNaN(precioNum) || precioNum <= 0) {
                return res.status(400).json({ ok: false, message: 'El precio del quincho debe ser un número entero positivo' });
            }

            const aireValor = precio_aire !== undefined ? precio_aire : precioAire;
            const precioAireNum = aireValor !== undefined ? parseInt(aireValor, 10) : NaN;
            if (aireValor !== undefined && (isNaN(precioAireNum) || precioAireNum < 0)) {
                return res.status(400).json({ ok: false, message: 'El precio del aire acondicionado debe ser un número mayor o igual a 0' });
            }

            await ConfigRepository.setByKey('precio_quincho', precioNum);
            if (sena !== undefined) {
                const senaNum = parseInt(sena, 10);
                if (!isNaN(senaNum) && senaNum >= 0) {
                    await ConfigRepository.setByKey('sena_quincho', senaNum);
                }
            }
            if (!isNaN(precioAireNum)) {
                await ConfigRepository.setByKey('precio_aire_quincho', precioAireNum);
            }
            return res.json({ ok: true, message: 'Tarifas del quincho actualizadas con éxito' });
        } catch (error) {
            console.error('ERROR AL ACTUALIZAR CONFIG QUINCHO', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar las tarifas del quincho' });
        }
    }

    static async getLucesStatus(req, res) {
        try {
            const tipo = req.params.tipo || 'cancha';
            const isQuincho = tipo === 'quincho';
            
            const dbKey = isQuincho ? 'override_aire_quincho' : 'override_luces_cancha';
            const mode = await ConfigRepository.getByKey(dbKey) || 'AUTO';
            
            let output = false;
            try {
                if (isQuincho) {
                    const status = await getAireQuinchoStatus();
                    output = status.output;
                } else {
                    const status = await getLuzStatus();
                    output = status.output;
                }
            } catch (err) {
                console.warn(`[CONFIG CONTROLLER] No se pudo obtener el estado real del Shelly (${tipo}):`, err.message);
            }

            return res.json({ ok: true, output, mode });
        } catch (error) {
            console.error('ERROR AL OBTENER ESTADO DE DISPOSITIVO', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener el estado del dispositivo' });
        }
    }

    static async updateLucesMode(req, res) {
        try {
            const tipo = req.params.tipo || 'cancha';
            const { mode } = req.body;
            const isQuincho = tipo === 'quincho';

            if (!['ON', 'OFF', 'AUTO'].includes(mode)) {
                return res.status(400).json({ ok: false, message: 'El modo de luces debe ser ON, OFF o AUTO' });
            }

            const dbKey = isQuincho ? 'override_aire_quincho' : 'override_luces_cancha';
            await ConfigRepository.setByKey(dbKey, mode);
            
            // Si el modo es forzado (ON/OFF), guardamos la marca de tiempo de activación
            if (mode === 'ON' || mode === 'OFF') {
                await ConfigRepository.setByKey(dbKey + '_updated_at', new Date().toISOString());
            }

            if (isQuincho) {
                if (mode === 'ON') {
                    try {
                        await encenderAireQuincho();
                    } catch (err) {
                        console.error('[CONFIG CONTROLLER] Error al encender aire quincho:', err.message);
                    }
                } else if (mode === 'OFF') {
                    try {
                        await apagarAireQuincho();
                    } catch (err) {
                        console.error('[CONFIG CONTROLLER] Error al apagar aire quincho:', err.message);
                    }
                }
            } else {
                if (mode === 'ON') {
                    try {
                        await encenderLuz();
                    } catch (err) {
                        console.error('[CONFIG CONTROLLER] Error al encender luz:', err.message);
                    }
                } else if (mode === 'OFF') {
                    try {
                        await apagarLuz();
                    } catch (err) {
                        console.error('[CONFIG CONTROLLER] Error al apagar luz:', err.message);
                    }
                }
            }

            return res.json({ ok: true, message: `Modo de dispositivo ${tipo} actualizado a ${mode}` });
        } catch (error) {
            console.error('ERROR AL ACTUALIZAR MODO DE DISPOSITIVO', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar el modo del dispositivo' });
        }
    }
}

export default ConfigController;
