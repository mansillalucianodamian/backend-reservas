import { ServerError } from '../error.js';
import ReservaRepository from '../repositories/reserva.repository.js';
import NotificationService from './NotificationService.js';



class ReservaService {
    static async getAll() {
        return await ReservaRepository.getAll();
    }

    static async getById(id) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');
        return reserva;
    }

    static async create(data) {
        const { usuario_id, fecha, hora, motivo } = data;

        // Validar campos obligatorios
        if (!usuario_id || !fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: usuario_id, fecha, hora');
        }

        // Verificar disponibilidad del horario
        const reservaExistente = await ReservaRepository.findByFechaHora(fecha, hora);
        if (reservaExistente) {
            throw new ServerError(400, 'El horario ya está ocupado o bloqueado');
        }

        // Crear reserva con estado inicial "Pendiente"
        return await ReservaRepository.create({
            usuario_id,
            fecha,
            hora,
            motivo: motivo || null,
            estado: 'Pendiente'
        });
    }

    static async update(id, data) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        return await ReservaRepository.updateById(id, data);
    }

    static async delete(id) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        return await ReservaRepository.deleteById(id);
    }

    static async aprobar(id) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado !== 'Pendiente') {
            throw new ServerError(400, 'Solo se pueden aprobar reservas pendientes');
        }

        return await ReservaRepository.updateById(id, { estado: 'Aprobado' });
    }

    static async cancelar(id) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado === 'Cancelado') {
            throw new ServerError(400, 'La reserva ya está cancelada');
        }

        return await ReservaRepository.updateById(id, { estado: 'Cancelado' });
    }

    static async bloquear(data) {
        const { fecha, hora, motivo } = data;

        if (!fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: fecha y hora');
        }

        const reservaExistente = await ReservaRepository.findByFechaHora(fecha, hora);

        if (reservaExistente) {
            const estadoAnterior = reservaExistente.estado;

            // Actualizamos la reserva existente a estado Bloqueado
            await ReservaRepository.updateById(reservaExistente.id, {
                estado: 'Bloqueado',
                motivo: motivo || 'Bloqueo de horario'
            });

            // Si estaba pendiente o aprobada, enviamos notificación al usuario
            if (estadoAnterior === 'Pendiente' || estadoAnterior === 'Aprobado') {
                await NotificationService.enviarAdvertencia(
                    reservaExistente.usuario_id,
                    motivo || 'Bloqueo de horario',
                    reservaExistente.fecha,
                    reservaExistente.hora
                );
            }

            return { ...reservaExistente, estado: 'Bloqueado', motivo };
        }

        // Si no existe nada en ese horario, creamos un nuevo bloqueo
        return await ReservaRepository.create({
            usuario_id: null,
            fecha,
            hora,
            motivo: motivo || 'Bloqueo de horario',
            estado: 'Bloqueado'
        });
    }


}

export default ReservaService;
