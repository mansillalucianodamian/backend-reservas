import { ServerError } from '../error.js';
import ReservaRepository from '../repositories/reserva.repository.js';
import NotificationService from './NotificationService.js';

class ReservaService {
    static async getAll() {
        return await ReservaRepository.getAll();
    }

    static async getByUserId(userId) {
        return await ReservaRepository.getByUserId(userId);
    }

    static async getById(id) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');
        return reserva;
    }

    static async create(data) {
        const { usuario_id, fecha, hora } = data;

        if (!usuario_id || !fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: usuario_id, fecha, hora');
        }

        const reservaExistente = await ReservaRepository.findByFechaHora(fecha, hora);
        if (reservaExistente) {
            throw new ServerError(400, 'El horario ya está ocupado o bloqueado');
        }

        return await ReservaRepository.create({
            usuario_id,
            fecha,
            hora,
            estado: 'Pendiente'
        });
    }

    static async update(id, data) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        // Solo permitimos actualizar fecha, hora o estado
        const { fecha, hora, estado } = data;
        return await ReservaRepository.updateById(id, { fecha, hora, estado });
    }

    static async delete(id) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');
        return await ReservaRepository.deleteById(id);
    }
    static async aprobar(id) {
        // Traer la reserva original
        const reserva = await ReservaRepository.getById(id);
        console.log("Reserva original desde BD:", reserva);

        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado !== 'Pendiente') {
            throw new ServerError(400, 'Solo se pueden aprobar reservas pendientes');
        }

        // Actualizar estado
        await ReservaRepository.updateById(id, { estado: 'Aprobado' });

        // Volver a traer la reserva completa ya aprobada
        const reservaActualizada = await ReservaRepository.getById(id);
        console.log("Reserva después de aprobar:", reservaActualizada);

        // Normalizar hora (ej: "10:00:00" → "10:00")
        if (reservaActualizada.hora) {
            reservaActualizada.hora = reservaActualizada.hora.slice(0, 5);
            console.log("Hora normalizada:", reservaActualizada.hora);
        } else {
            console.error("La reserva no tiene hora definida!");
        }


        return reservaActualizada;
    }


    static async cancelar(id, user) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado === 'Cancelado') {
            throw new ServerError(400, 'La reserva ya está cancelada');
        }

        // Si es super admin → estado Cancelado
        if (user.rol === 'super_admin') {
            return await ReservaRepository.updateById(id, { estado: 'Cancelado' });
        }

        // Si es usuario común → eliminar la reserva para liberar el horario
        if (user.rol === 'usuario' || user.rol === 'recepcionista') {
            await ReservaRepository.deleteById(id);
            return { ok: true, message: 'Reserva eliminada, horario disponible' };
        }

        throw new ServerError(403, 'No autorizado para cancelar');
    }



    static async bloquear(data) {
        const { fecha, hora, motivo } = data;

        if (!fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: fecha y hora');
        }

        const reservaExistente = await ReservaRepository.findByFechaHora(fecha, hora);

        if (reservaExistente) {
            const estadoAnterior = reservaExistente.estado;

            await ReservaRepository.updateById(reservaExistente.id, {
                estado: 'Bloqueado',
                motivo: motivo || 'Bloqueo de horario'
            });

            if (estadoAnterior === 'Pendiente' || estadoAnterior === 'Aprobado') {
                await NotificationService.enviarAdvertencia(
                    reservaExistente.usuario_id,
                    motivo || 'Bloqueo de horario',
                    reservaExistente.fecha,
                    reservaExistente.hora
                );
            }

            return { ...reservaExistente, estado: 'Bloqueado', motivo: motivo || 'Bloqueo de horario' };
        }

        return await ReservaRepository.create({
            usuario_id: null,
            fecha,
            hora,
            motivo: motivo || 'Bloqueo de horario',
            estado: 'Bloqueado'
        });
    }

    static async getDisponibles(fecha) {
        const todosHorarios = [
            "08:30", "10:00", "11:30", "13:00",
            "14:30", "16:00", "17:30", "19:00", "20:30"
        ];

        const reservas = await ReservaRepository.getByFecha(fecha);

        // Normalizamos estado y hora
        const ocupados = reservas
            .filter(r => {
                const estado = (r.estado || "").toLowerCase();
                return estado === "pendiente" || estado === "aprobado" || estado === "bloqueado";
            })
            .map(r => r.hora.trim().substring(0, 5)); // "13:00:00" → "13:00"

        return todosHorarios.filter(h => !ocupados.includes(h));
    }
    static async getPendientes() {
        return await ReservaRepository.getPendientes();
    }
}

export default ReservaService;
