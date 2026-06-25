
import mailTransporter from '../config/mailTransporter.config.js';
import UserRepository from '../repositories/user.repository.js';


class NotificationService {
    static async enviarAdvertencia(usuario_id, motivo, fecha, hora) {
        try {
            // Buscar el usuario en la BD
            const usuario = await UserRepository.getById(usuario_id);
            if (!usuario || !usuario.email) {
                console.warn(`[NOTIFICATION]: Usuario ${usuario_id} no tiene email registrado`);
                return;
            }

            // Armar mensaje
            const mailOptions = {
                from: '"Reservas Padel" <no-reply@padel.com>',
                to: usuario.email,
                subject: 'Tu turno fue bloqueado',
                text: `Hola ${usuario.nombre},

Tu turno del día ${fecha} a las ${hora} fue bloqueado por el administrador.

Motivo: ${motivo}

Por favor, reagendá otro turno.

Saludos,
Reservas Padel`
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

            const mailOptions = {
                from: '"Reservas Padel" <no-reply@padel.com>',
                to: usuario.email,
                subject: 'Confirmación de reserva',
                text: `📢 Confirmación de reserva

Has reservado la cancha de pádel para:
- 📅 Fecha: ${reserva.fecha}
- 🕒 Hora: ${reserva.hora}
- 🔢 Días reservados: ${dias}
- 💲 Total: $${total}

⏳ Tenés ${plazoDias} días para abonar.
Podés transferir al CBU 1234567890123456789012 (Alias: MUNICIPALIDAD.PADEL) 
y enviar el comprobante al 📧 pagos@municipalidad.com 
o acercarte a la municipalidad para pagar en ventanilla.

Gracias por usar nuestro sistema de reservas.`
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`[NOTIFICATION]: Correo de confirmación enviado a ${usuario.email}`);
        } catch (error) {
            console.error('[SERVER ERROR]: no se pudo enviar la confirmación de reserva', error);
        }
    }
}

export default NotificationService;
