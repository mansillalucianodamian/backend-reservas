import { pool } from '../config/db.js';
import { encenderLuz, apagarLuz } from './ShellyService.js';

let intervalId = null;

/**
 * Checks if there is any approved reservation active at the current moment
 * considering the 5-minute pre-start buffer and 60-minute duration.
 * @returns {Promise<boolean>}
 */
export async function checkActiveReservation() {
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
        const [rows] = await pool.query(
            "SELECT fecha, hora FROM reservas WHERE fecha IN (?, ?, ?) AND estado = 'Aprobado'",
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
            const endWindowMs = reservationStartMs + (60 * 60 * 1000); // 60 minutes booking duration (1 hour)

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
 * Executes a sync check and schedules recurring synchronization every 2 minutes.
 */
export function iniciarSincronizadorLuces() {
    if (intervalId) {
        clearInterval(intervalId);
    }

    console.log("[LIGHT SYNC SERVICE] Starting light synchronization loop (every 2 minutes)...");

    // Execute immediately on startup
    sincronizarLuces();

    // Set interval of 2 minutes (120,000 ms)
    intervalId = setInterval(sincronizarLuces, 120000);
}

/**
 * Queries database status and sets Shelly relay state accordingly.
 */
async function sincronizarLuces() {
    const deberiaEncender = await checkActiveReservation();
    console.log(`[LIGHT SYNC] Status check executed. Should light be active? ${deberiaEncender ? 'YES' : 'NO'}`);

    try {
        if (deberiaEncender) {
            await encenderLuz();
            console.log("[LIGHT SYNC] Shelly ON command sent successfully.");
        } else {
            await apagarLuz();
            console.log("[LIGHT SYNC] Shelly OFF command sent successfully.");
        }
    } catch (error) {
        console.error("[LIGHT SYNC] Error sending command to Shelly:", error.message);
    }
}

/**
 * Retained for backwards compatibility with controllers.
 * Individual RAM cron scheduling is no longer required as state synchronization handles it.
 */
export function programarReserva(reserva) {
    console.log(`[SCHEDULER] Reservation approved for ID ${reserva?.id}. Auto-sync loop will capture it on next tick.`);
}
