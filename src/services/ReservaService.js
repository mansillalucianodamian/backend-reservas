import { ServerError } from '../error.js';
import ReservaRepository from '../repositories/reserva.repository.js';
import NotificationService from './NotificationService.js';
import ConfigRepository from '../repositories/config.repository.js';

class ReservaService {
    static async getAll(filters) {
        return await ReservaRepository.getAll(filters);
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
        const { usuario_id, usuario_rol, fecha, hora, tipo = 'cancha', motivo, con_aire = 0 } = data;

        if (!usuario_id || !fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: usuario_id, fecha, hora');
        }

        // 1. Si es cancha, verificar límite semanal (excluyendo a super_admin y recepcionista)
        if (tipo === 'cancha' && usuario_rol !== 'super_admin' && usuario_rol !== 'recepcionista') {
            const cleanFecha = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
            const partes = cleanFecha.split('-').map(Number);
            const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
            const diaSemana = fechaObj.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
            // Calcular Lunes de esa semana
            const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

            const lunes = new Date(partes[0], partes[1] - 1, partes[2] + diffLunes);
            const domingo = new Date(partes[0], partes[1] - 1, partes[2] + diffLunes + 6);

            const formatYMD = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dia = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dia}`;
            };

            const inicioStr = formatYMD(lunes);
            const finStr = formatYMD(domingo);

            // Verificar si el turno es de último momento (< 8 horas respecto al momento actual)
            const [horaH, horaM] = (hora || '00:00').split(':').map(Number);
            const turnoDateTime = new Date(partes[0], partes[1] - 1, partes[2], horaH || 0, horaM || 0, 0);
            const ahora = new Date();
            const diffHoras = (turnoDateTime.getTime() - ahora.getTime()) / (1000 * 60 * 60);
            const esUltimoMomento = diffHoras > 0 && diffHoras < 8;

            const reservasSemana = await ReservaRepository.findByUsuarioYSemana(usuario_id, inicioStr, finStr);
            const maxPermitido = esUltimoMomento ? 3 : 2;

            if (reservasSemana.length >= maxPermitido) {
                if (maxPermitido === 2) {
                    throw new ServerError(400, 'Ya tienes el máximo de 2 reservas de cancha para esta semana (Lunes a Domingo). Se habilita un 3er turno si faltan menos de 8 horas para el horario.');
                } else {
                    throw new ServerError(400, 'Ya alcanzaste el cupo máximo de 3 reservas de cancha para esta semana (incluyendo turno de último momento).');
                }
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

        const plazoDias = tipo === 'cancha' ? 2 : 3;

        await NotificationService.enviarConfirmacionReserva(
            usuario_id,
            nuevaReserva,
            1,
            precio,
            plazoDias
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

        // Actualizar estado y registrar fecha de aprobación
        await ReservaRepository.updateById(id, { 
            estado: 'Aprobado',
            fecha_aprobacion: new Date()
        });

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

    static async deshacerAprobacion(id, user) {
        const reserva = await ReservaRepository.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado !== 'Aprobado') {
            throw new ServerError(400, 'Solo se puede deshacer la aprobación de reservas aprobadas');
        }

        // Si es recepcionista, verificar período de gracia de 15 minutos
        if (user.rol === 'recepcionista') {
            if (reserva.fecha_aprobacion) {
                const fechaAprobacion = new Date(reserva.fecha_aprobacion);
                const minutosTranscurridos = (Date.now() - fechaAprobacion.getTime()) / (1000 * 60);

                if (minutosTranscurridos > 15) {
                    throw new ServerError(403, 'El período de gracia de 15 minutos para revertir la aprobación ha expirado. Por favor, solicita asistencia al Super Administrador.');
                }
            }
        }

        // Revertir a estado Pendiente y resetear fecha_aprobacion
        await ReservaRepository.updateById(id, { 
            estado: 'Pendiente',
            fecha_aprobacion: null 
        });

        const reservaActualizada = await ReservaRepository.getById(id);
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
            return { ok: true, tipo: reserva.tipo, con_aire: reserva.con_aire };
        }

        // Si es usuario común → eliminar la reserva para liberar el horario
        if (user.rol === 'usuario' || user.rol === 'recepcionista') {
            await ReservaRepository.deleteById(id);
            return { ok: true, message: 'Reserva eliminada, horario disponible', tipo: reserva.tipo, con_aire: reserva.con_aire };
        }

        throw new ServerError(403, 'No autorizado para cancelar');
    }



    static async bloquear(data) {
        const { fecha, hora, motivo, tipo = 'cancha', con_luz = false } = data;

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
                    motivo: motivo || 'Bloqueo de horario',
                    con_luz: con_luz ? 1 : 0
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

                resultados.push({ ...reservaExistente, estado: 'Bloqueado', motivo: motivo || 'Bloqueo de horario', con_luz: con_luz ? 1 : 0 });
            } else {
                const nuevaReservaBloqueada = await ReservaRepository.create({
                    usuario_id: null,
                    tipo,
                    fecha,
                    hora: h,
                    motivo: motivo || 'Bloqueo de horario',
                    estado: 'Bloqueado',
                    con_luz: con_luz ? 1 : 0
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

    static async getRecientesAprobadas() {
        return await ReservaRepository.getRecientesAprobadas();
    }

    static async bloquearMasivo(data) {
        const { fechaInicio, fechaFin, diasSemana, horas, motivo, con_luz = false } = data;

        if (!fechaInicio || !fechaFin || !diasSemana || !horas || !Array.isArray(diasSemana) || !Array.isArray(horas)) {
            throw new ServerError(400, 'Faltan parámetros obligatorios o formato inválido');
        }

        const [startYear, startMonth, startDay] = fechaInicio.split('-').map(Number);
        const [endYear, endMonth, endDay] = fechaFin.split('-').map(Number);

        let current = new Date(startYear, startMonth - 1, startDay);
        const end = new Date(endYear, endMonth - 1, endDay);

        const fechasABloquear = [];
        while (current <= end) {
            const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
            if (diasSemana.includes(dayOfWeek)) {
                const yyyy = current.getFullYear();
                const mm = String(current.getMonth() + 1).padStart(2, '0');
                const dd = String(current.getDate()).padStart(2, '0');
                fechasABloquear.push(`${yyyy}-${mm}-${dd}`);
            }
            current.setDate(current.getDate() + 1);
        }

        let totalBloqueados = 0;
        const detalles = [];

        for (const fecha of fechasABloquear) {
            const blockResult = await ReservaService.bloquear({
                fecha,
                hora: horas,
                motivo: motivo || 'Bloqueo de horario masivo',
                tipo: 'cancha',
                con_luz
            });

            if (Array.isArray(blockResult)) {
                totalBloqueados += blockResult.length;
                detalles.push(...blockResult);
            } else if (blockResult) {
                totalBloqueados += 1;
                detalles.push(blockResult);
            }
        }

        return {
            totalBloqueados,
            fechasAfectadas: fechasABloquear,
            detalles
        };
    }
}

export default ReservaService;
