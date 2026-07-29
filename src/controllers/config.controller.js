import ConfigRepository from "../repositories/config.repository.js";
import { getLuzStatus, encenderLuz, apagarLuz } from "../services/ShellyService.js";

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
            const sena = senaStr ? parseInt(senaStr, 10) : 5000;
            return res.json({ ok: true, precio, sena });
        } catch (error) {
            console.error('ERROR AL OBTENER CONFIG QUINCHO', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener la configuración del quincho' });
        }
    }

    static async updatePrecioQuincho(req, res) {
        try {
            const { precio, sena } = req.body;
            
            const precioNum = parseInt(precio, 10);
            const senaNum = parseInt(sena, 10);
            if (isNaN(precioNum) || precioNum <= 0 || isNaN(senaNum) || senaNum <= 0) {
                return res.status(400).json({ ok: false, message: 'El precio y la seña deben ser números enteros positivos' });
            }

            await ConfigRepository.setByKey('precio_quincho', precioNum);
            await ConfigRepository.setByKey('sena_quincho', senaNum);
            return res.json({ ok: true, message: 'Tarifas del quincho actualizadas con éxito' });
        } catch (error) {
            console.error('ERROR AL ACTUALIZAR CONFIG QUINCHO', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar las tarifas del quincho' });
        }
    }

    static async getLucesStatus(req, res) {
        try {
            const mode = await ConfigRepository.getByKey('override_luces_cancha') || 'AUTO';
            
            let output = false;
            try {
                const status = await getLuzStatus();
                output = status.output;
            } catch (err) {
                console.warn('[CONFIG CONTROLLER] No se pudo obtener el estado real del Shelly:', err.message);
            }

            return res.json({ ok: true, output, mode });
        } catch (error) {
            console.error('ERROR AL OBTENER ESTADO DE LUCES', error);
            return res.status(500).json({ ok: false, message: 'Error al obtener el estado de las luces' });
        }
    }

    static async updateLucesMode(req, res) {
        try {
            const { mode } = req.body;
            if (!['ON', 'OFF', 'AUTO'].includes(mode)) {
                return res.status(400).json({ ok: false, message: 'El modo de luces debe ser ON, OFF o AUTO' });
            }

            await ConfigRepository.setByKey('override_luces_cancha', mode);

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

            return res.json({ ok: true, message: `Modo de luces actualizado a ${mode}` });
        } catch (error) {
            console.error('ERROR AL ACTUALIZAR MODO DE LUCES', error);
            return res.status(500).json({ ok: false, message: 'Error al actualizar el modo de las luces' });
        }
    }
}

export default ConfigController;
