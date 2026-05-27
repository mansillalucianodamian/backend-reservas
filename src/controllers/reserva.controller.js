import ReservaService from "../services/ReservaService.js";
import { programarReserva } from "../services/SchedulerService.js";
import { apagarLuz } from "../services/ShellyService.js";


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
            const reserva = await ReservaService.aprobar(id);

            // 🔹 Programar encendido 5 min antes y apagado 90 min después
            programarReserva(reserva);

            res.json({ ok: true, reserva });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al aprobar reserva"
            });
        }
    }

    static async cancelar(req, res, next) {
        try {
            const result = await ReservaService.cancelar(req.params.id, req.user);

            // Responder rápido al cliente
            res.json({ ok: true, ...result });

            // Intentar apagar Shelly en segundo plano
            apagarLuz().catch(err => console.error("Shelly no disponible:", err.message));
        } catch (err) {
            next(err);
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
