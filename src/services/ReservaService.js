import { ServerError } from '../error.js';
import DefaultReservaRepository, { ReservaRepository } from '../repositories/reserva.repository.js';
import NotificationService from './NotificationService.js';
import DefaultConfigRepository from '../repositories/config.repository.js';
import { pool as defaultPool } from '../config/db.js';
import { defaultStrategyRegistry, ResourceStrategyRegistry } from './strategies/index.js';

export class ReservaService {
    constructor(
        reservaRepo = DefaultReservaRepository,
        configRepo = DefaultConfigRepository,
        notificationService = NotificationService,
        dbPool = defaultPool,
        strategyRegistry = defaultStrategyRegistry
    ) {
        this.reservaRepo = reservaRepo;
        this.configRepo = configRepo;
        this.notificationService = notificationService;
        this.pool = dbPool;
        this.strategyRegistry = strategyRegistry;
    }

    async getAll(filters) {
        return await this.reservaRepo.getAll(filters);
    }

    async getByUserId(userId) {
        return await this.reservaRepo.getByUserId(userId);
    }

    async getById(id, user = null) {
        const reserva = await this.reservaRepo.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        // Blindaje IDOR: usuario estándar solo puede consultar sus propias reservas
        if (user && !['super_admin', 'recepcionista'].includes(user.rol)) {
            if (reserva.usuario_id && Number(reserva.usuario_id) !== Number(user.id)) {
                throw new ServerError(403, 'Acceso denegado: no tienes permiso para acceder a esta reserva');
            }
        }

        return reserva;
    }

    /**
     * Creación de reserva con Transaccionalidad ACID y Prevención de Double Booking (CON-01).
     * Usa conexión dedicada, beginTransaction, FOR UPDATE para bloqueo de fila, y commit/rollback.
     */
    async create(data) {
        const { usuario_id, usuario_rol, fecha, hora, tipo = 'cancha', motivo, con_aire = 0 } = data;

        if (!usuario_id || !fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: usuario_id, fecha, hora');
        }

        // 1. Validar reglas de dominio mediante la estrategia correspondiente (SOLID - SRP & OCP)
        const strategy = this.strategyRegistry.get(tipo);
        await strategy.validarDisponibilidad(data, { reservaRepo: this.reservaRepo });

        // 🔒 Manejo de transacción ACID con conexión dedicada
        let connection = null;
        let managedTransaction = false;

        if (this.pool && typeof this.pool.getConnection === 'function') {
            try {
                connection = await this.pool.getConnection();
                if (connection && typeof connection.beginTransaction === 'function') {
                    await connection.beginTransaction();
                    managedTransaction = true;
                }
            } catch (err) {
                connection = null;
                managedTransaction = false;
            }
        }

        let nuevaReserva;
        try {
            // 2. Validar que el horario no esté ocupado con FOR UPDATE dentro de la transacción
            const reservaExistente = await this.reservaRepo.findByFechaHora(fecha, hora, tipo, connection);
            if (reservaExistente) {
                throw new ServerError(409, 'El horario ya está ocupado o bloqueado');
            }

            // 3. Crear la reserva
            nuevaReserva = await this.reservaRepo.create({
                usuario_id,
                tipo,
                fecha,
                hora,
                estado: 'Pendiente',
                motivo: motivo || null,
                con_aire: con_aire ? 1 : 0
            }, connection);

            if (managedTransaction && connection) {
                await connection.commit();
            }
        } catch (error) {
            if (managedTransaction && connection) {
                await connection.rollback();
            }
            throw error;
        } finally {
            if (managedTransaction && connection && typeof connection.release === 'function') {
                connection.release();
            }
        }

        // 4. Enviar notificación fuera de la transacción para no retener bloqueos en la base de datos
        try {
            const { total: precio, plazoDias } = await strategy.calcularPrecio(data, { configRepo: this.configRepo });

            await this.notificationService.enviarConfirmacionReserva(
                usuario_id,
                nuevaReserva,
                1,
                precio,
                plazoDias
            );
        } catch (mailErr) {
            console.error('[NOTIFICATION]: Error al enviar confirmación de reserva:', mailErr.message);
        }

        return nuevaReserva;
    }

    async update(id, data, user = null) {
        const reserva = await this.reservaRepo.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        // Blindaje IDOR: un usuario común solo puede modificar su propia reserva
        if (user && !['super_admin', 'recepcionista'].includes(user.rol)) {
            if (reserva.usuario_id && Number(reserva.usuario_id) !== Number(user.id)) {
                throw new ServerError(403, 'Acceso denegado: no tienes permiso para modificar esta reserva');
            }
        }

        const { fecha, hora, estado } = data;
        return await this.reservaRepo.updateById(id, { fecha, hora, estado });
    }

    async delete(id, user = null) {
        const reserva = await this.reservaRepo.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        // Blindaje IDOR: un usuario común no puede eliminar reservas de otros
        if (user && !['super_admin', 'recepcionista'].includes(user.rol)) {
            if (reserva.usuario_id && Number(reserva.usuario_id) !== Number(user.id)) {
                throw new ServerError(403, 'Acceso denegado: no tienes permiso para eliminar esta reserva');
            }
        }

        return await this.reservaRepo.deleteById(id);
    }

    async aprobar(id) {
        const reserva = await this.reservaRepo.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado !== 'Pendiente') {
            throw new ServerError(400, 'Solo se pueden aprobar reservas pendientes');
        }

        await this.reservaRepo.updateById(id, {
            estado: 'Aprobado',
            fecha_aprobacion: new Date()
        });

        const reservaActualizada = await this.reservaRepo.getById(id);
        if (reservaActualizada.hora) {
            reservaActualizada.hora = reservaActualizada.hora.slice(0, 5);
        }

        await this.notificationService.enviarConfirmacionPago(
            reservaActualizada.usuario_id,
            reservaActualizada
        );

        return reservaActualizada;
    }

    async deshacerAprobacion(id, user) {
        const reserva = await this.reservaRepo.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado !== 'Aprobado') {
            throw new ServerError(400, 'Solo se puede deshacer la aprobación de reservas aprobadas');
        }

        if (user.rol === 'recepcionista') {
            if (reserva.fecha_aprobacion) {
                const fechaAprobacion = new Date(reserva.fecha_aprobacion);
                const minutosTranscurridos = (Date.now() - fechaAprobacion.getTime()) / (1000 * 60);

                if (minutosTranscurridos > 15) {
                    throw new ServerError(403, 'El período de gracia de 15 minutos para revertir la aprobación ha expirado. Por favor, solicita asistencia al Super Administrador.');
                }
            }
        }

        await this.reservaRepo.updateById(id, {
            estado: 'Pendiente',
            fecha_aprobacion: null
        });

        return await this.reservaRepo.getById(id);
    }

    async cancelar(id, user) {
        const reserva = await this.reservaRepo.getById(id);
        if (!reserva) throw new ServerError(404, 'Reserva no encontrada');

        if (reserva.estado === 'Cancelado') {
            throw new ServerError(400, 'La reserva ya está cancelada');
        }

        // Blindaje IDOR: un usuario común solo puede cancelar su propia reserva;
        // administradores y recepcionistas pueden cancelar cualquier reserva.
        if (user && !['super_admin', 'recepcionista'].includes(user.rol)) {
            if (reserva.usuario_id && Number(reserva.usuario_id) !== Number(user.id)) {
                throw new ServerError(403, 'Acceso denegado: no tienes permiso para cancelar la reserva de otro usuario');
            }
        }

        if (user && user.rol === 'super_admin') {
            await this.reservaRepo.updateById(id, { estado: 'Cancelado' });
            return { ok: true, tipo: reserva.tipo, con_aire: reserva.con_aire };
        }

        if (user && (user.rol === 'usuario' || user.rol === 'recepcionista')) {
            await this.reservaRepo.deleteById(id);
            return { ok: true, message: 'Reserva eliminada, horario disponible', tipo: reserva.tipo, con_aire: reserva.con_aire };
        }

        throw new ServerError(403, 'No autorizado para cancelar');
    }

    async bloquear(data) {
        const { fecha, hora, motivo, tipo = 'cancha', con_luz = false } = data;

        if (!fecha || !hora) {
            throw new ServerError(400, 'Faltan datos obligatorios: fecha y hora');
        }

        let horariosABloquear = [];

        if (Array.isArray(hora)) {
            horariosABloquear = hora.map(h => h.toString().trim().substring(0, 5));
        } else if (typeof hora === 'string' && (hora.toLowerCase() === 'todos' || hora.toLowerCase() === 'all')) {
            const strategy = this.strategyRegistry.get(tipo);
            horariosABloquear = strategy.getHorariosEstandar();
        } else {
            horariosABloquear = [hora.toString().trim().substring(0, 5)];
        }

        const resultados = [];

        for (const h of horariosABloquear) {
            const reservaExistente = await this.reservaRepo.findByFechaHora(fecha, h, tipo);

            if (reservaExistente) {
                const estadoAnterior = reservaExistente.estado;

                await this.reservaRepo.updateById(reservaExistente.id, {
                    estado: 'Bloqueado',
                    motivo: motivo || 'Bloqueo de horario',
                    con_luz: con_luz ? 1 : 0
                });

                if (estadoAnterior === 'Pendiente' || estadoAnterior === 'Aprobado') {
                    await this.notificationService.enviarAdvertencia(
                        reservaExistente.usuario_id,
                        motivo || 'Bloqueo de horario',
                        reservaExistente.fecha,
                        reservaExistente.hora,
                        reservaExistente.tipo
                    );
                }

                resultados.push({ ...reservaExistente, estado: 'Bloqueado', motivo: motivo || 'Bloqueo de horario', con_luz: con_luz ? 1 : 0 });
            } else {
                const nuevaReservaBloqueada = await this.reservaRepo.create({
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

    async getDisponibles(fecha, tipo = 'cancha') {
        const strategy = this.strategyRegistry.get(tipo);
        const todosHorarios = strategy.getHorariosEstandar();
        const reservas = await this.reservaRepo.getByFecha(fecha);

        if (typeof strategy.calcularDisponibilidadHorarios === 'function') {
            return strategy.calcularDisponibilidadHorarios(fecha, reservas, todosHorarios);
        }

        const ocupados = reservas
            .filter(r => r.tipo === tipo && ["pendiente", "aprobado", "bloqueado"].includes((r.estado || "").toLowerCase()))
            .map(r => r.hora.trim().substring(0, 5));

        return todosHorarios.map(h => ({
            hora: h,
            disponible: !ocupados.includes(h)
        }));
    }

    async getPendientes() {
        return await this.reservaRepo.getPendientes();
    }

    async getRecientesAprobadas() {
        return await this.reservaRepo.getRecientesAprobadas();
    }

    async bloquearMasivo(data) {
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
            const dayOfWeek = current.getDay();
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
            const blockResult = await this.bloquear({
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

    async getFechasOcupadas(tipo = 'quincho') {
        const fechas = await this.reservaRepo.getFechasOcupadas(tipo);
        if (tipo === 'quincho') {
            const hoy = new Date();
            const horaActualArg = new Date(hoy.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })).getHours();
            if (horaActualArg >= 10) {
                const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
                if (!fechas.includes(hoyStr)) {
                    fechas.push(hoyStr);
                }
            }
        }
        return fechas;
    }
}

const defaultReservaService = new ReservaService();

// Puentes estáticos para retrocompatibilidad total y soporte de vi.spyOn en pruebas existentes
ReservaService.getAll = (...args) => defaultReservaService.getAll(...args);
ReservaService.getByUserId = (...args) => defaultReservaService.getByUserId(...args);
ReservaService.getById = (...args) => defaultReservaService.getById(...args);
ReservaService.create = (...args) => defaultReservaService.create(...args);
ReservaService.update = (...args) => defaultReservaService.update(...args);
ReservaService.delete = (...args) => defaultReservaService.delete(...args);
ReservaService.aprobar = (...args) => defaultReservaService.aprobar(...args);
ReservaService.deshacerAprobacion = (...args) => defaultReservaService.deshacerAprobacion(...args);
ReservaService.cancelar = (...args) => defaultReservaService.cancelar(...args);
ReservaService.bloquear = (...args) => defaultReservaService.bloquear(...args);
ReservaService.getDisponibles = (...args) => defaultReservaService.getDisponibles(...args);
ReservaService.getPendientes = (...args) => defaultReservaService.getPendientes(...args);
ReservaService.getRecientesAprobadas = (...args) => defaultReservaService.getRecientesAprobadas(...args);
ReservaService.bloquearMasivo = (...args) => defaultReservaService.bloquearMasivo(...args);
ReservaService.getFechasOcupadas = (...args) => defaultReservaService.getFechasOcupadas(...args);

export default ReservaService;
