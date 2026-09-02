import { pool } from '../config/db.js';
import { encenderLuz, apagarLuz, encenderAireQuincho, apagarAireQuincho, getLuzStatus, getAireQuinchoStatus } from './ShellyService.js';
import ConfigRepository from '../repositories/config.repository.js';
import NotificationService from './NotificationService.js';

let intervalId = null;

/**
 * Checks if there is any approved CANCHA reservation active at the current moment
 * considering the 5-minute pre-start buffer and 60-minute duration.
 * @returns {Promise<boolean>}
 */
export async function checkActiveCanchaReservation() {
    try {
        const overrideMode = await ConfigRepository.getByKey('override_luces_cancha');
        if (overrideMode === 'ON' || overrideMode === 'OFF') {
            const updatedAtStr = await ConfigRepository.getByKey('override_luces_cancha_updated_at');
            if (updatedAtStr) {
                const updatedAt = new Date(updatedAtStr);
                const diffMs = Date.now() - updatedAt.getTime();
                const twoHours = 2 * 60 * 60 * 1000;
                if (diffMs > twoHours) {
                    console.log(`[LIGHT SYNC] Override override_luces_cancha expiró (más de 2 horas). Restableciendo a AUTO.`);
                    await ConfigRepository.setByKey('override_luces_cancha', 'AUTO');
                } else {
                    return overrideMode === 'ON';
                }
            } else {
                return overrideMode === 'ON';
            }
        }
    } catch (err) {
        console.error("[LIGHT SYNC SERVICE] Error checking override_luces_cancha:", err);
    }

    const now = new Date();
    
    // Convert current time to Argentina timezone (GMT-3)
    const tz = "America/Argentina/Buenos_Aires";
    const nowStr = now.toLocaleString("en-US", { timeZone: tz });
    const localNow = new Date(nowStr);
    
    // Query reservations for yesterday, today, and tomorrow to handle midnight boundaries
    const dateYesterday = new Date(localNow.getTime() - 24 * 60 * 60 * 1000);
    const dateTomorrow = new Date(localNow.getTime() + 24 * 60 * 60 * 1000);
    
    const formatDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const datesToQuery = [
        formatDateStr(dateYesterday),
        formatDateStr(localNow),
        formatDateStr(dateTomorrow)
    ];

    try {
        // Filtramos por tipo = 'cancha' y estado = 'Aprobado', o estado = 'Bloqueado' con luz habilitada
        const [rows] = await pool.query(
            "SELECT fecha, hora FROM reservas WHERE fecha IN (?, ?, ?) AND tipo = 'cancha' AND (estado = 'Aprobado' OR (estado = 'Bloqueado' AND con_luz = 1))",
            datesToQuery
        );

        if (!rows || rows.length === 0) {
            return false;
        }

        const nowMs = now.getTime();

        for (const r of rows) {
            let fechaStr = r.fecha;
            if (r.fecha instanceof Date) {
                const y = r.fecha.getFullYear();
                const m = String(r.fecha.getMonth() + 1).padStart(2, '0');
                const d = String(r.fecha.getDate()).padStart(2, '0');
                fechaStr = `${y}-${m}-${d}`;
            } else if (typeof r.fecha === 'string' && r.fecha.includes('T')) {
                fechaStr = r.fecha.split('T')[0];
            }

            const [h, m] = r.hora.split(":").map(Number);
            
            // Build the reservation start time in Argentina's timezone
            // Using UTC + 3 hours shift to represent local Argentina time GMT-3
            const parts = fechaStr.split('-').map(Number);
            const utcStartMs = Date.UTC(parts[0], parts[1] - 1, parts[2], h, m, 0);
            const reservationStartMs = utcStartMs + (3 * 60 * 60 * 1000); 

            const startWindowMs = reservationStartMs - (5 * 60 * 1000); // 5 minutes buffer before start
            const endWindowMs = reservationStartMs + (60 * 60 * 1000) + (10 * 60 * 1000); // 60 minutes duration + 10 minutes buffer after end

            if (nowMs >= startWindowMs && nowMs < endWindowMs) {
                return true;
            }
        }
    } catch (error) {
        console.error("[LIGHT SYNC SERVICE] Error verifying active reservations:", error);
    }

    return false;
}

/**
 * Checks if there is any approved QUINCHO reservation active at the current moment
 * with AC service requested (con_aire = 1).
 * @returns {Promise<boolean>}
 */
export async function checkActiveQuinchoAireReservation() {
    try {
        const overrideMode = await ConfigRepository.getByKey('override_aire_quincho');
        if (overrideMode === 'ON' || overrideMode === 'OFF') {
            const updatedAtStr = await ConfigRepository.getByKey('override_aire_quincho_updated_at');
            if (updatedAtStr) {
                const updatedAt = new Date(updatedAtStr);
                const diffMs = Date.now() - updatedAt.getTime();
                const twoHours = 2 * 60 * 60 * 1000;
                if (diffMs > twoHours) {
                    console.log(`[QUINCHO SYNC] Override override_aire_quincho expiró (más de 2 horas). Restableciendo a AUTO.`);
                    await ConfigRepository.setByKey('override_aire_quincho', 'AUTO');
                } else {
                    return overrideMode === 'ON';
                }
            } else {
                return overrideMode === 'ON';
            }
        }
    } catch (err) {
        console.error("[QUINCHO SYNC SERVICE] Error checking override_aire_quincho:", err);
    }

    const now = new Date();
    
    // Convert current time to Argentina timezone (GMT-3)
    const tz = "America/Argentina/Buenos_Aires";
    const nowStr = now.toLocaleString("en-US", { timeZone: tz });
    const localNow = new Date(nowStr);
    
    // Query reservations for yesterday, today, and tomorrow to handle midnight boundaries
    const dateYesterday = new Date(localNow.getTime() - 24 * 60 * 60 * 1000);
    const dateTomorrow = new Date(localNow.getTime() + 24 * 60 * 60 * 1000);
    
    const formatDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const datesToQuery = [
        formatDateStr(dateYesterday),
        formatDateStr(localNow),
        formatDateStr(dateTomorrow)
    ];

    try {
        // Filtramos por tipo = 'quincho' y con_aire = 1
        const [rows] = await pool.query(
            "SELECT fecha, hora FROM reservas WHERE fecha IN (?, ?, ?) AND estado = 'Aprobado' AND tipo = 'quincho' AND con_aire = 1",
            datesToQuery
        );

        if (!rows || rows.length === 0) {
            return false;
        }

        const nowMs = now.getTime();

        for (const r of rows) {
            let fechaStr = r.fecha;
            if (r.fecha instanceof Date) {
                const y = r.fecha.getFullYear();
                const m = String(r.fecha.getMonth() + 1).padStart(2, '0');
                const d = String(r.fecha.getDate()).padStart(2, '0');
                fechaStr = `${y}-${m}-${d}`;
            } else if (typeof r.fecha === 'string' && r.fecha.includes('T')) {
                fechaStr = r.fecha.split('T')[0];
            }

            const [h, m] = r.hora.split(":").map(Number);
            
            // Build the reservation start time in Argentina's timezone
            // Using UTC + 3 hours shift to represent local Argentina time GMT-3
            const parts = fechaStr.split('-').map(Number);
            const utcStartMs = Date.UTC(parts[0], parts[1] - 1, parts[2], h, m, 0);
            const reservationStartMs = utcStartMs + (3 * 60 * 60 * 1000); 

            const startWindowMs = reservationStartMs - (5 * 60 * 1000); // 5 minutes buffer before start
            
            // Duración del turno: 6 horas para diurno (10:00 a 16:00), 6 horas para nocturno (19:00 a 01:00)
            let durationMs = 6 * 60 * 60 * 1000; // 6 horas estándar
            if (h === 10) {
                durationMs = 6 * 60 * 60 * 1000; // 10:00 a 16:00
            } else if (h === 19) {
                durationMs = 6 * 60 * 60 * 1000; // 19:00 a 01:00
            } else if (h === 9) {
                // Retrocompatibilidad con reservas previas creadas a las 09:00
                durationMs = 7 * 60 * 60 * 1000;
            }

            const endWindowMs = reservationStartMs + durationMs + (10 * 60 * 1000); // Duración + 10 min de gracia

            if (nowMs >= startWindowMs && nowMs < endWindowMs) {
                return true;
            }
        }
    } catch (error) {
        console.error("[QUINCHO SYNC SERVICE] Error verifying active reservations:", error);
    }

    return false;
}

/**
 * Retained for backwards compatibility.
 * @returns {Promise<boolean>}
 */
export async function checkActiveReservation() {
    return checkActiveCanchaReservation();
}

/**
 * Executes a sync check and schedules recurring synchronization every 2 minutes.
 */
export function iniciarSincronizadorLuces() {
    if (intervalId) {
        clearInterval(intervalId);
    }

    console.log("[LIGHT/QUINCHO SYNC SERVICE] Starting Shelly synchronization loop (every 2 minutes)...");

    // Execute immediately on startup
    sincronizarLuces();

    // Set interval of 2 minutes (120,000 ms)
    intervalId = setInterval(sincronizarLuces, 120000);
}

/**
 * Queries database status and sets Shelly relay states accordingly.
 */
async function sincronizarLuces() {
    // 0. Procesar cancelaciones automáticas de reservas de cancha expiradas
    await procesarCancelacionesAutomaticas();

    // 1. Sincronizar Luces Cancha (Existing Shelly)
    try {
        const deberiaEncenderCancha = await checkActiveCanchaReservation();
        console.log(`[LIGHT SYNC] Cancha check executed. Active? ${deberiaEncenderCancha ? 'YES' : 'NO'}`);
        
        let status = null;
        try {
            status = await getLuzStatus();
            console.log(`[LIGHT SYNC] Cancha status: output=${status.output}, source=${status.source}`);
        } catch (err) {
            console.warn(`[LIGHT SYNC] No se pudo obtener el estado del Shelly de la cancha: ${err.message}. Se procederá con el comando directo.`);
        }

        if (deberiaEncenderCancha) {
            if (!status || status.output === false) {
                await encenderLuz();
                console.log("[LIGHT SYNC] Cancha Shelly ON command sent successfully.");
            } else {
                console.log("[LIGHT SYNC] Cancha Shelly ya está ENCENDIDO. Omitiendo comando.");
            }
        } else {
            // No hay reserva activa
            if (!status) {
                console.log("[LIGHT SYNC] No se pudo obtener el estado del Shelly de la cancha. Omitiendo apagado automático para evitar cortes accidentales.");
            } else if (status.output === true) {
                if (status.source !== 'SHC' && status.source !== 'http') {
                    console.log("[LIGHT SYNC] Cancha Shelly encendido MANUALMENTE (físico/app/externo). Conservando encendido.");
                } else {
                    await apagarLuz();
                    console.log("[LIGHT SYNC] Cancha Shelly OFF command sent successfully.");
                }
            } else {
                console.log("[LIGHT SYNC] Cancha Shelly ya está APAGADO. Omitiendo comando.");
            }
        }
    } catch (error) {
        console.error("[LIGHT SYNC] Error en la sincronización de luces:", error.message);
    }

    // 2. Sincronizar Aire Quincho (New Shelly)
    try {
        const deberiaEncenderQuincho = await checkActiveQuinchoAireReservation();
        console.log(`[QUINCHO AC SYNC] Quincho check executed. Active? ${deberiaEncenderQuincho ? 'YES' : 'NO'}`);
        
        let status = null;
        try {
            status = await getAireQuinchoStatus();
            console.log(`[QUINCHO AC SYNC] Quincho status: output=${status.output}, source=${status.source}`);
        } catch (err) {
            console.warn(`[QUINCHO AC SYNC] No se pudo obtener el estado del Shelly del quincho: ${err.message}. Se procederá con el comando directo.`);
        }

        if (deberiaEncenderQuincho) {
            if (!status || status.output === false) {
                await encenderAireQuincho();
                console.log("[QUINCHO AC SYNC] Quincho Shelly ON command sent successfully.");
            } else {
                console.log("[QUINCHO AC SYNC] Quincho Shelly ya está ENCENDIDO. Omitiendo comando.");
            }
        } else {
            // No hay reserva activa con aire
            if (!status) {
                console.log("[QUINCHO AC SYNC] No se pudo obtener el estado del Shelly del quincho. Omitiendo apagado automático.");
            } else if (status.output === true) {
                if (status.source !== 'SHC' && status.source !== 'http') {
                    console.log("[QUINCHO AC SYNC] Quincho Shelly encendido MANUALMENTE (físico/app/externo). Conservando encendido.");
                } else {
                    await apagarAireQuincho();
                    console.log("[QUINCHO AC SYNC] Quincho Shelly OFF command sent successfully.");
                }
            } else {
                console.log("[QUINCHO AC SYNC] Quincho Shelly ya está APAGADO. Omitiendo comando.");
            }
        }
    } catch (error) {
        console.error("[QUINCHO AC SYNC] Error en la sincronización del aire del quincho:", error.message);
    }
}

/**
 * Retained for backwards compatibility with controllers.
 */
export function programarReserva(reserva) {
    console.log(`[SCHEDULER] Reservation approved for ID ${reserva?.id}. Auto-sync loop will capture it on next tick.`);
}

/**
 * Busca reservas de tipo 'cancha' en estado 'Pendiente' con más de 48 horas de antigüedad
 * y las cambia a estado 'Cancelado', liberando el horario y notificando al usuario.
 */
export async function procesarCancelacionesAutomaticas() {
    try {
        console.log("[AUTO-CANCEL] Ejecutando control de reservas expiradas (48 hs)...");
        // Buscamos reservas de cancha pendientes creadas hace más de 48 horas
        const query = `
            SELECT r.*, u.nombre, u.email 
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.tipo = 'cancha' 
              AND r.estado = 'Pendiente' 
              AND r.created_at < NOW() - INTERVAL 48 HOUR
        `;
        const [reservasExpiradas] = await pool.query(query);
        
        if (!reservasExpiradas || reservasExpiradas.length === 0) {
            console.log("[AUTO-CANCEL] No se detectaron reservas de cancha expiradas.");
            return;
        }
        
        console.log(`[AUTO-CANCEL] Se encontraron ${reservasExpiradas.length} reservas de cancha expiradas.`);
        
        for (const r of reservasExpiradas) {
            // Actualizar estado a 'Cancelado'
            await pool.query(
                "UPDATE reservas SET estado = 'Cancelado' WHERE id = ?",
                [r.id]
            );
            console.log(`[AUTO-CANCEL] Reserva ID ${r.id} cancelada por falta de pago.`);
            
            // Enviar notificación de cancelación por falta de pago
            try {
                await NotificationService.enviarAdvertencia(
                    r.usuario_id,
                    "Expiración del plazo de pago de 48 horas (reserva cancelada automáticamente)",
                    r.fecha,
                    r.hora,
                    r.tipo
                );
                console.log(`[AUTO-CANCEL] Correo de cancelación enviado con éxito al usuario de la reserva ID ${r.id}.`);
            } catch (notiErr) {
                console.error(`[AUTO-CANCEL] Error al notificar cancelación de reserva ID ${r.id}:`, notiErr);
            }
        }
    } catch (error) {
        console.error("[AUTO-CANCEL] Error general en el proceso de cancelación automática:", error);
    }
}
