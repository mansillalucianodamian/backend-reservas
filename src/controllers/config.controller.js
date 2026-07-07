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
}

export default ConfigController;
