import cron from "node-cron";
import { encenderLuz, apagarLuz } from "./ShellyService.js";

export function programarReserva(reserva) {
    console.log("Reserva recibida desde BD:", reserva);

    // Normalizar hora (ej: "14:30:00" → "14:30")
    const horaNormalizada = reserva.hora ? reserva.hora.slice(0, 5) : null;

    if (!reserva.fecha || !horaNormalizada) {
        console.error("Reserva inválida para cron:", reserva);
        return;
    }

    // Construir fecha/hora correctamente
    const fechaBase = new Date(reserva.fecha); // ya es un Date válido
    const [hora, minuto] = horaNormalizada.split(":").map(Number);
    fechaBase.setHours(hora);
    fechaBase.setMinutes(minuto);
    fechaBase.setSeconds(0);

    const fechaHoraReserva = fechaBase;

    const fechaHoraEncender = new Date(fechaHoraReserva.getTime() - (5 * 60 * 1000));
    const fechaHoraApagar = new Date(fechaHoraReserva.getTime() + (90 * 60 * 1000));

    console.log("Reserva programada:", {
        fecha: reserva.fecha,
        horaOriginal: reserva.hora,
        horaNormalizada,
        encender: fechaHoraEncender.toString(),
        apagar: fechaHoraApagar.toString()
    });

    // Cron jobs
    cron.schedule(
        `${fechaHoraEncender.getMinutes()} ${fechaHoraEncender.getHours()} ${fechaHoraEncender.getDate()} ${fechaHoraEncender.getMonth() + 1} *`,
        async () => {
            await encenderLuz();
            console.log("Shelly encendido 5 min antes de la reserva");
        }
    );

    cron.schedule(
        `${fechaHoraApagar.getMinutes()} ${fechaHoraApagar.getHours()} ${fechaHoraApagar.getDate()} ${fechaHoraApagar.getMonth() + 1} *`,
        async () => {
            await apagarLuz();
            console.log("Shelly apagado al finalizar la reserva (90 min)");
        }
    );
}
