import mailTransporter from '../config/mailTransporter.config.js';
import UserRepository from '../repositories/user.repository.js';
import ENVIROMENT from '../config/enviroment.config.js';
import { getBookingConfirmationEmailHtml, getReservationCancellationEmailHtml, getBookingApprovedEmailHtml, formatFecha } from '../utils/emailTemplates.js';

class NotificationService {
    static async enviarAdvertencia(usuario_id, motivo, fecha, hora, tipo = 'cancha') {
        try {
            // Buscar el usuario en la BD
            const usuario = await UserRepository.getById(usuario_id);
            if (!usuario || !usuario.email) {
                console.warn(`[NOTIFICATION]: Usuario ${usuario_id} no tiene email registrado`);
                return;
            }

            // Armar mensaje
            const mailOptions = {
                from: `"Municipalidad de Aldea San Antonio" <${ENVIROMENT.GMAIL_USER}>`,
                to: usuario.email,
                subject: `Aviso: Tu reserva del día ${formatFecha(fecha)} fue cancelada`,
                html: getReservationCancellationEmailHtml(usuario.nombre, { fecha, hora, motivo, tipo })
            };

            // Enviar correo usando el transporter ya configurado
            await mailTransporter.sendMail(mailOptions);
            console.log(`[NOTIFICATION]: Correo enviado a ${usuario.email}`);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo enviar la notificación', error);
        }
    }

    static async enviarConfirmacionReserva(usuario_id, reserva, dias, total, plazoDias) {
        try {
            const usuario = await UserRepository.getById(usuario_id);
            if (!usuario || !usuario.email) {
                console.warn(`[NOTIFICATION]: Usuario ${usuario_id} no tiene email registrado`);
                return;
            }

            const tipo = reserva.tipo || 'cancha';
            const subject = tipo === 'quincho'
                ? `Confirmación de reserva - Quincho Municipal del ${formatFecha(reserva.fecha)}`
                : `Confirmación de reserva - Turno del ${formatFecha(reserva.fecha)}`;

            const mailOptions = {
                from: `"Municipalidad de Aldea San Antonio" <${ENVIROMENT.GMAIL_USER}>`,
                to: usuario.email,
                subject,
                html: getBookingConfirmationEmailHtml(usuario.nombre, {
                    fecha: reserva.fecha,
                    hora: reserva.hora,
                    dias,
                    total,
                    plazoDias,
                    tipo,
                    motivo: reserva.motivo,
                    con_aire: reserva.con_aire
                })
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`[NOTIFICATION]: Correo de confirmación enviado a ${usuario.email}`);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo enviar la confirmación de reserva', error);
        }
    }

    static async enviarConfirmacionPago(usuario_id, reserva) {
        try {
            const usuario = await UserRepository.getById(usuario_id);
            if (!usuario || !usuario.email) {
                console.warn(`[NOTIFICATION]: Usuario ${usuario_id} no tiene email registrado`);
                return;
            }

            const tipo = reserva.tipo || 'cancha';
            const subject = tipo === 'quincho'
                ? `¡Reserva Aprobada! Quincho del ${formatFecha(reserva.fecha)}`
                : `¡Pago Recibido! Turno del ${formatFecha(reserva.fecha)} confirmado`;

            const mailOptions = {
                from: `"Municipalidad de Aldea San Antonio" <${ENVIROMENT.GMAIL_USER}>`,
                to: usuario.email,
                subject,
                html: getBookingApprovedEmailHtml(usuario.nombre, {
                    fecha: reserva.fecha,
                    hora: reserva.hora,
                    tipo,
                    motivo: reserva.motivo,
                    con_aire: reserva.con_aire
                })
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`[NOTIFICATION]: Correo de confirmación de pago enviado a ${usuario.email}`);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo enviar la confirmación de pago', error);
        }
    }
}

export default NotificationService;
