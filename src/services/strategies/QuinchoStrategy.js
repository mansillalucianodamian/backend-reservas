import { ServerError } from '../../error.js';

/**
 * Estrategia de Dominio para Reservas de Quincho (SOLID - SRP & OCP).
 * Encapsula las reglas de exclusividad diaria, restricción horaria (mismo día < 10:00 AM)
 * y cálculo tarifario (tarifa base + opcional aire acondicionado).
 */
export class QuinchoStrategy {
    get tipo() {
        return 'quincho';
    }

    /**
     * Retorna los horarios de inicio posibles para el quincho (08:00 a 22:00 hs).
     * El alquiler es único por día sin importar el horario de salida.
     */
    getHorariosEstandar() {
        return [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00',
            '18:00', '19:00', '20:00', '21:00', '22:00'
        ];
    }

    /**
     * Valida disponibilidad y reglas específicas para Quincho:
     * - Exclusividad: Solo 1 reserva activa por día (en cualquier horario).
     * - Restricción: No se permite reservar el mismo día si ya pasaron las 10:00 AM (hora argentina).
     */
    async validarDisponibilidad(data, { reservaRepo, connection = null }) {
        const { fecha } = data;
        const cleanFecha = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;

        // 1. Exclusividad diaria (máximo 1 turno por día)
        const reservasFecha = await reservaRepo.getByFecha(cleanFecha, connection);
        const tieneReservaActiva = (reservasFecha || []).some(r =>
            r.tipo === 'quincho' &&
            !['cancelado', 'cancelada', 'rechazado', 'rechazada'].includes((r.estado || '').toLowerCase())
        );

        if (tieneReservaActiva) {
            throw new ServerError(409, 'El quincho ya cuenta con una reserva registrada para este día. Solo se permite un turno por día.');
        }

        // 2. Restricción de reserva el mismo día después de las 10:00 AM
        const ahora = new Date();
        const fechaArgStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }); // YYYY-MM-DD
        if (cleanFecha === fechaArgStr) {
            const horaActualArg = parseInt(
                ahora.toLocaleTimeString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false, hour: '2-digit' }),
                10
            );
            if (horaActualArg >= 10) {
                throw new ServerError(400, 'El alquiler del quincho para el día de hoy ya no se encuentra disponible.');
            }
        }
    }

    /**
     * Cálculo de precio: tarifa base + adicional opcional por aire acondicionado.
     */
    async calcularPrecio(data, { configRepo }) {
        let precioBase = 21500;
        let precioAire = 10000;

        try {
            const precioStr = await configRepo.getByKey('precio_quincho');
            if (precioStr) precioBase = parseInt(precioStr, 10);
        } catch (err) {
            console.error('[QUINCHO STRATEGY]: Error al consultar precio_quincho:', err);
        }

        try {
            const precioAireStr = await configRepo.getByKey('precio_aire_quincho');
            if (precioAireStr) precioAire = parseInt(precioAireStr, 10);
        } catch (err) {
            console.error('[QUINCHO STRATEGY]: Error al consultar precio_aire_quincho:', err);
        }

        const conAire = Boolean(data.con_aire === 1 || data.con_aire === true || data.con_aire === '1');
        const total = precioBase + (conAire ? precioAire : 0);

        return {
            total,
            plazoDias: null,
            base: precioBase,
            adicionalAire: conAire ? precioAire : 0
        };
    }

    /**
     * Calcula la disponibilidad horaria para un día específico
     */
    calcularDisponibilidadHorarios(fecha, reservas, todosHorarios = this.getHorariosEstandar()) {
        const cleanFecha = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
        const ocupados = (reservas || []).filter(r =>
            r.tipo === 'quincho' && ['pendiente', 'aprobado', 'bloqueado'].includes((r.estado || '').toLowerCase())
        );

        let diaOcupado = ocupados.length > 0;

        const ahora = new Date();
        const fechaArgStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
        if (cleanFecha === fechaArgStr) {
            const horaActualArg = parseInt(
                ahora.toLocaleTimeString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false, hour: '2-digit' }),
                10
            );
            if (horaActualArg >= 10) {
                diaOcupado = true;
            }
        }

        return todosHorarios.map(h => ({
            hora: h,
            disponible: !diaOcupado
        }));
    }
}
