import { ServerError } from '../error.js';
import ReservaRepository from '../repositories/reserva.repository.js';
import NotificationService from './NotificationService.js';
import ConfigRepository from '../repositories/config.repository.js';

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
        const { usuario_id, fecha, hora, tipo = 'cancha', motivo, con_aire = 0 } = data;

        if (!usuario_id || !fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: usuario_id, fecha, hora');
        }

        // 1. Si es cancha, verificar límite semanal de 2 turnos
        if (tipo === 'cancha') {
            const fechaObj = new Date(fecha);
            const inicioSemana = new Date(fechaObj);
            inicioSemana.setDate(fechaObj.getDate() - fechaObj.getDay());
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 6);

            const reservasSemana = await ReservaRepository.findByUsuarioYSemana(usuario_id, inicioSemana, finSemana);
            if (reservasSemana.length >= 2) {
                throw new ServerError(400, 'Ya tienes el máximo de 2 reservas de cancha para esta semana');
            }
        }

        // 2. Validar que el horario no esté ocupado para este tipo de recurso
        const reservaExistente = await ReservaRepository.findByFechaHora(fecha, hora, tipo);
        if (reservaExistente) {
            throw new ServerError(400, 'El horario ya está ocupado o bloqueado');
        }

        // 3. Crear la reserva
        const nuevaReserva = await ReservaRepository.create({
            usuario_id,
            tipo,
            fecha,
            hora,
            estado: 'Pendiente',
            motivo: motivo || null,
            con_aire: con_aire ? 1 : 0
        });

        let precio = 5000;
        if (tipo === 'quincho') {
            try {
                const precioStr = await ConfigRepository.getByKey('precio_quincho');
                if (precioStr) precio = parseInt(precioStr, 10);
                else precio = 21500;
            } catch (err) {
                console.error('Error al obtener el precio de quincho para la notificacion:', err);
                precio = 21500;
            }
            if (con_aire) {
                precio = precio * 2;
            }
        } else {
            let precioCancha = 5000;
            try {
                const precioStr = await ConfigRepository.getByKey('precio_cancha');
                if (precioStr) precioCancha = parseInt(precioStr, 10);
            } catch (err) {
                console.error('Error al obtener el precio de cancha para la notificacion:', err);
            }
            precio = precioCancha;
        }

        await NotificationService.enviarConfirmacionReserva(
            usuario_id,
            nuevaReserva,
            1,
            precio,
            3 // plazo de pago en días
        );

        return nuevaReserva;
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

        // Enviar notificación de confirmación de pago
        await NotificationService.enviarConfirmacionPago(
            reservaActualizada.usuario_id,
            reservaActualizada
        );

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
            await ReservaRepository.updateById(id, { estado: 'Cancelado' });
            return { ok: true, tipo: reserva.tipo };
        }

        // Si es usuario común → eliminar la reserva para liberar el horario
        if (user.rol === 'usuario' || user.rol === 'recepcionista') {
            await ReservaRepository.deleteById(id);
            return { ok: true, message: 'Reserva eliminada, horario disponible', tipo: reserva.tipo };
        }

        throw new ServerError(403, 'No autorizado para cancelar');
    }



    static async bloquear(data) {
        const { fecha, hora, motivo, tipo = 'cancha' } = data;

        if (!fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: fecha y hora');
        }

        let horariosABloquear = [];

        if (Array.isArray(hora)) {
            horariosABloquear = hora.map(h => h.toString().trim().substring(0, 5));
        } else if (typeof hora === 'string' && (hora.toLowerCase() === 'todos' || hora.toLowerCase() === 'all')) {
            if (tipo === 'quincho') {
                horariosABloquear = ['09:00', '19:00'];
            } else {
                horariosABloquear = [];
                for (let h = 7; h <= 24; h++) {
                    horariosABloquear.push(h === 24 ? '00:00' : `${h.toString().padStart(2, '0')}:00`);
                }
            }
        } else {
            horariosABloquear = [hora.toString().trim().substring(0, 5)];
        }

        const resultados = [];

        for (const h of horariosABloquear) {
            const reservaExistente = await ReservaRepository.findByFechaHora(fecha, h, tipo);

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
                        reservaExistente.hora,
                        reservaExistente.tipo
                    );
                }

                resultados.push({ ...reservaExistente, estado: 'Bloqueado', motivo: motivo || 'Bloqueo de horario' });
            } else {
                const nuevaReservaBloqueada = await ReservaRepository.create({
                    usuario_id: null,
                    tipo,
                    fecha,
                    hora: h,
                    motivo: motivo || 'Bloqueo de horario',
                    estado: 'Bloqueado'
                });
                resultados.push(nuevaReservaBloqueada);
            }
        }

        return resultados.length === 1 ? resultados[0] : resultados;
    }

    static async getDisponibles(fecha, tipo = 'cancha') {
        const todosHorarios = [];
        if (tipo === 'quincho') {
            todosHorarios.push('09:00', '19:00');
        } else {
            for (let h = 7; h <= 24; h++) {
                const hora = h === 24 ? '00:00' : `${h.toString().padStart(2, '0')}:00`;
                todosHorarios.push(hora);
            }
        }

        const reservas = await ReservaRepository.getByFecha(fecha);

        const ocupados = reservas
            .filter(r => r.tipo === tipo && ["pendiente", "aprobado", "bloqueado"].includes((r.estado || "").toLowerCase()))
            .map(r => r.hora.trim().substring(0, 5));

        // 👇 devolvemos todos los horarios con estado
        return todosHorarios.map(h => ({
            hora: h,
            disponible: !ocupados.includes(h)
        }));
    }



    static async getPendientes() {
        return await ReservaRepository.getPendientes();
    }
}

export default ReservaService;
