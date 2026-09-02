import ReservaService from "../services/ReservaService.js";
import { apagarLuz, apagarAireQuincho } from "../services/ShellyService.js";
import { programarReserva } from "../services/SchedulerService.js";


class ReservaController {
    static async getAll(req, res) {
        try {
            let reservas;

            if (req.user.rol === 'usuario') {
                // 🔹 Usuario común: solo sus reservas
                reservas = await ReservaService.getByUserId(req.user.id);
            } else if (req.user.rol === 'recepcionista' || req.user.rol === 'super_admin') {
                // 🔹 Recepcionista y superadmin: reservas filtradas según parámetros de consulta
                reservas = await ReservaService.getAll(req.query);
            } else {
                reservas = [];
            }

            console.log("👉 Rol:", req.user.rol, "Reservas desde DB:", reservas);
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
            const { fecha, hora, tipo = 'cancha', motivo, con_aire } = req.body;

            if (!fecha || !hora) {
                return res.status(400).json({
                    ok: false,
                    message: "Debe enviar fecha y hora"
                });
            }

            const result = await ReservaService.create({
                fecha,
                hora,
                tipo,
                usuario_id: userId,
                usuario_rol: req.user.rol,
                motivo,
                con_aire: con_aire ? 1 : 0
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

            // 🔹 Programar encendido 5 min antes y apagado 90 min después solo si es cancha
            if (reserva.tipo === 'cancha') {
                programarReserva(reserva);
            }

            res.json({ ok: true, reserva });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al aprobar reserva"
            });
        }
    }

    static async deshacerAprobacion(req, res) {
        try {
            const { id } = req.params;
            const reserva = await ReservaService.deshacerAprobacion(id, req.user);
            res.json({ ok: true, reserva, message: "Aprobación revertida con éxito" });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al deshacer aprobación de reserva"
            });
        }
    }

    static async cancelar(req, res, next) {
        try {
            const result = await ReservaService.cancelar(req.params.id, req.user);

            // Responder rápido al cliente
            res.json({ ok: true, ...result });

            // Intentar apagar Shelly en segundo plano solo si es cancha
            if (result.tipo === 'cancha') {
                apagarLuz().catch(err => console.error("Shelly no disponible:", err.message));
            } else if (result.tipo === 'quincho' && result.con_aire) {
                apagarAireQuincho().catch(err => console.error("Shelly quincho no disponible:", err.message));
            }
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

    static async bloquearMasivo(req, res) {
        try {
            const result = await ReservaService.bloquearMasivo({ ...req.body, tipo: 'cancha' });
            res.status(201).json({ ok: true, resultado: result });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al realizar el bloqueo masivo"
            });
        }
    }

    static async getDisponibles(req, res) {
        try {
            const { fecha } = req.params;
            const { tipo = 'cancha' } = req.query;

            if (!fecha) {
                return res.status(400).json({
                    ok: false,
                    message: "Debe enviar una fecha"
                });
            }

            const horarios = await ReservaService.getDisponibles(fecha, tipo);
            res.json({ ok: true, horarios });
        } catch (error) {
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || "Error al obtener horarios disponibles"
            });
        }
    }
    static async getPendientes(req, res) {
        try {
            const reservas = await ReservaService.getPendientes();
            console.log("📥 Reservas encontradas:", reservas);
            res.json({ ok: true, reservas });
        } catch (error) {
            console.error('[SERVER ERROR]:', error);
            res.status(500).json({ ok: false, message: 'Error al obtener reservas pendientes' });
        }
    }

    static async getRecientesAprobadas(req, res) {
        try {
            const reservas = await ReservaService.getRecientesAprobadas();
            res.json({ ok: true, reservas });
        } catch (error) {
            console.error('[SERVER ERROR]:', error);
            res.status(500).json({ ok: false, message: 'Error al obtener aprobaciones recientes' });
        }
    }

    static async getFechasOcupadas(req, res) {
        try {
            const { tipo = 'quincho' } = req.query;
            const fechas = await ReservaService.getFechasOcupadas(tipo);
            res.json({ ok: true, fechas });
        } catch (error) {
            console.error('[SERVER ERROR]:', error);
            res.status(error.status || 500).json({
                ok: false,
                message: error.message || 'Error al obtener fechas ocupadas'
            });
        }
    }
}

export default ReservaController;
