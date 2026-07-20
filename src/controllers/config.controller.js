import ConfigRepository from "../repositories/config.repository.js";

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
}

export default ConfigController;
