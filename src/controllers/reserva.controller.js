import ReservaService from "../services/ReservaService.js";

class ReservaController {
    static async getAll(req, res) {
        try {
            const userId = req.user.id;
            const reservas = await ReservaService.getByUserId(userId);
            res.json({ ok: true, reservas });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al obtener reservas"
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const reserva = await ReservaService.getById(id);
            res.json({ ok: true, reserva });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al obtener reserva"
            });
        }
    }

    static async create(req, res) {
        try {
            const userId = req.user.id;
            const { fecha, hora } = req.body;

            if (!fecha || !hora) {
                return res.status(400).json({
                    ok: false,
                    message: "Debe enviar fecha y hora"
                });
            }

            const result = await ReservaService.create({
                fecha,
                hora,
                usuario_id: userId
            });

            res.status(201).json({ ok: true, reserva: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al crear reserva"
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const result = await ReservaService.update(id, req.body);
            res.json({ ok: true, reserva: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al actualizar reserva"
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await ReservaService.delete(id);
            res.json({ ok: true, message: "Reserva eliminada con éxito" });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al eliminar reserva"
            });
        }
    }

    static async aprobar(req, res) {
        try {
            const { id } = req.params;
            const result = await ReservaService.aprobar(id);
            res.json({ ok: true, reserva: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al aprobar reserva"
            });
        }
    }

    static async cancelar(req, res) {
        try {
            const { id } = req.params;
            const result = await ReservaService.cancelar(id);
            res.json({ ok: true, reserva: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al cancelar reserva"
            });
        }
    }

    static async bloquear(req, res) {
        try {
            const result = await ReservaService.bloquear(req.body);
            res.status(201).json({ ok: true, reserva: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al bloquear horario"
            });
        }
    }

    static async getDisponibles(req, res) {
        try {
            const { fecha } = req.params;

            if (!fecha) {
                return res.status(400).json({
                    ok: false,
                    message: "Debe enviar una fecha"
                });
            }

            // Llamamos al servicio para obtener horarios libres
            const horarios = await ReservaService.getDisponibles(fecha);

            res.json({ ok: true, horarios });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al obtener horarios disponibles"
            });
        }
    }
}
export default ReservaController;
