import { ServerError } from '../../error.js';

/**
 * Estrategia de Dominio para Reservas de Cancha de Pádel (SOLID - SRP & OCP).
 * Encapsula las reglas de cupo semanal, turnos de último momento y cálculo tarifario.
 */
export class CanchaStrategy {
    get tipo() {
        return 'cancha';
    }

    /**
     * Retorna los horarios estándares habilitados para canchas (07:00 a 24:00/00:00).
     */
    getHorariosEstandar() {
        const horarios = [];
        for (let h = 7; h <= 24; h++) {
            horarios.push(h === 24 ? '00:00' : `${h.toString().padStart(2, '0')}:00`);
        }
        return horarios;
    }

    /**
     * Valida el cupo semanal de la cancha:
     * - Máximo 2 turnos por semana (Lunes a Domingo).
     * - Habilita un 3er turno si faltan menos de 8 horas para el horario ("último momento").
     * - Excluye a roles administrativos (super_admin, recepcionista).
     */
    async validarDisponibilidad(data, { reservaRepo, connection = null }) {
        const { usuario_id, usuario_rol, fecha, hora } = data;

        if (usuario_rol === 'super_admin' || usuario_rol === 'recepcionista') {
            return;
        }

        const cleanFecha = typeof fecha === 'string' ? fecha.split('T')[0] : fecha;
        const partes = cleanFecha.split('-').map(Number);
        const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]);
        const diaSemana = fechaObj.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
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

        const [horaH, horaM] = (hora || '00:00').split(':').map(Number);
        const turnoDateTime = new Date(partes[0], partes[1] - 1, partes[2], horaH || 0, horaM || 0, 0);
        const ahora = new Date();
        const diffHoras = (turnoDateTime.getTime() - ahora.getTime()) / (1000 * 60 * 60);
        const esUltimoMomento = diffHoras > 0 && diffHoras < 8;

        const reservasSemana = await reservaRepo.findByUsuarioYSemana(usuario_id, inicioStr, finStr, connection);
        const maxPermitido = esUltimoMomento ? 3 : 2;

        if (reservasSemana.length >= maxPermitido) {
            if (maxPermitido === 2) {
                throw new ServerError(400, 'Ya tienes el máximo de 2 reservas de cancha para esta semana (Lunes a Domingo). Se habilita un 3er turno si faltan menos de 8 horas para el horario.');
            } else {
                throw new ServerError(400, 'Ya alcanzaste el cupo máximo de 3 reservas de cancha para esta semana (incluyendo turno de último momento).');
            }
        }
    }

    /**
     * Cálculo de tarifa para cancha de pádel (tarifa fija consultada a ConfigRepository).
     */
    async calcularPrecio(data, { configRepo }) {
        let precioCancha = 5000;
        try {
            const precioStr = await configRepo.getByKey('precio_cancha');
            if (precioStr) precioCancha = parseInt(precioStr, 10);
        } catch (err) {
            console.error('[CANCHA STRATEGY]: Error al consultar precio_cancha:', err);
        }
        return {
            total: precioCancha,
            plazoDias: 2
        };
    }

    /**
     * Calcula la disponibilidad horaria para un día específico
     */
    calcularDisponibilidadHorarios(fecha, reservas, todosHorarios) {
        const ocupados = (reservas || [])
            .filter(r => r.tipo === 'cancha' && ['pendiente', 'aprobado', 'bloqueado'].includes((r.estado || '').toLowerCase()))
            .map(r => r.hora.trim().substring(0, 5));

        return todosHorarios.map(h => ({
            hora: h,
            disponible: !ocupados.includes(h)
        }));
    }
}
