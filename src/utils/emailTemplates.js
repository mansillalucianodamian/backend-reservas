/**
 * HTML Email Templates with modern and responsive inline styling for the Municipality portal.
 */
export const formatFecha = (fechaInput) => {
  if (!fechaInput) return '';
  
  let year, month, day;
  
  if (fechaInput instanceof Date) {
    year = fechaInput.getUTCFullYear();
    month = fechaInput.getUTCMonth();
    day = fechaInput.getUTCDate();
  } else {
    const dateObj = new Date(fechaInput);
    if (isNaN(dateObj.getTime())) return fechaInput;
    
    year = dateObj.getFullYear();
    month = dateObj.getMonth();
    day = dateObj.getDate();
    
    if (typeof fechaInput === 'string' && fechaInput.includes('-') && fechaInput.length <= 10) {
      const parts = fechaInput.split('-');
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
    }
  }
  
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const localDate = new Date(year, month, day);
  const nombreDia = diasSemana[localDate.getDay()];
  const nombreMes = meses[month];
  
  return `${nombreDia} ${day.toString().padStart(2, '0')} de ${nombreMes} de ${year}`;
};

const formatHora = (horaInput) => {
  if (!horaInput) return '';
  if (typeof horaInput === 'string') {
    return horaInput.substring(0, 5);
  }
  return horaInput;
};

const baseTemplate = (contentHtml, preheaderText = '') => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Municipalidad - Reservas</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader text for email clients -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheaderText}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 20px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Municipalidad de Aldea San Antonio</h1>
              <p style="color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 6px 0 0 0; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase;">Portal de Deportes y Reservas</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 30px; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 24px; border-top: 1px solid #f3f4f6; text-align: center; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0; font-weight: 500;">Este es un correo automático. Por favor, no respondas directamente a este mensaje.</p>
              <p style="margin: 0 0 16px 0;">Para consultas, contáctanos a través del portal de Rentas o acércate a la municipalidad.</p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">&copy; 2026 Municipalidad de Aldea San Antonio. Todos los derechos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Template for Email Verification (Registration)
 */
export const getVerificationEmailHtml = (nombre, link) => {
  const content = `
    <h2 style="margin-top: 0; color: #1e3a8a; font-size: 20px; font-weight: 600; text-align: center;">¡Hola, ${nombre}!</h2>
    <p style="text-align: center; margin-bottom: 24px; color: #4b5563;">Gracias por registrarte en nuestro portal de reservas municipal. Para activar tu cuenta y poder realizar reservas de canchas y espacios (como el quincho), es necesario verificar tu dirección de correo electrónico.</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${link}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.2); transition: background-color 0.2s ease;">
        Confirmar Cuenta de Correo
      </a>
    </div>

    <p style="color: #4b5563; font-size: 14px; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
      Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
      <a href="${link}" style="color: #0284c7; text-decoration: none; word-break: break-all;">${link}</a>
    </p>
  `;
  return baseTemplate(content, 'Verifica tu cuenta del portal de reservas');
};

/**
 * Template for Password Reset
 */
export const getPasswordResetEmailHtml = (nombre, link) => {
  const content = `
    <h2 style="margin-top: 0; color: #1e3a8a; font-size: 20px; font-weight: 600; text-align: center;">Recuperación de Contraseña</h2>
    <p style="text-align: center; margin-bottom: 24px; color: #4b5563;">Hola ${nombre}, recibimos una solicitud para restablecer la contraseña de tu cuenta en el portal de reservas municipal.</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${link}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(2, 132, 199, 0.2); transition: background-color 0.2s ease;">
        Restablecer Contraseña
      </a>
    </div>

    <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #b45309;">
      <strong>Importante:</strong> Este enlace expira en 1 hora. Si tú no realizaste esta solicitud, puedes ignorar este correo de forma segura; tu contraseña actual seguirá funcionando.
    </div>

    <p style="color: #4b5563; font-size: 14px; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
      Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
      <a href="${link}" style="color: #0284c7; text-decoration: none; word-break: break-all;">${link}</a>
    </p>
  `;
  return baseTemplate(content, 'Instrucciones para restablecer tu contraseña');
};

/**
 * Template for Booking Confirmation
 */
export const getBookingConfirmationEmailHtml = (nombre, { fecha, hora, dias, total, plazoDias, tipo = 'cancha' }) => {
  const fechaFormateada = formatFecha(fecha);
  const horaFormateada = formatHora(hora);
  const isQuincho = tipo === 'quincho';
  
  const content = isQuincho ? `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 16px 0 8px 0; color: #1e3a8a; font-size: 22px; font-weight: 700;">¡Reserva de Quincho registrada!</h2>
      <p style="color: #4b5563; margin: 0; font-size: 15px;">Hola ${nombre}, registramos tu solicitud de reserva para el Quincho Municipal.</p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 24px 0; font-size: 15px;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 40%;">Espacio:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">Quincho Municipal</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563;">Fecha:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${fechaFormateada}</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563;">Turno / Horario:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${horaFormateada} hs</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; font-weight: 700; color: #1e3a8a;">Tarifa de uso:</td>
        <td style="padding: 16px 20px; font-weight: 700; color: #1e3a8a; font-size: 17px;">$${total} <span style="font-size: 13px; font-weight: normal; color: #6b7280;">(Se abona en la Municipalidad)</span></td>
      </tr>
    </table>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 24px 0; font-size: 14px;">
      <h3 style="margin: 0 0 10px 0; color: #1d4ed8; font-size: 15px; font-weight: 600;">
        Información Importante sobre Pago e Ingreso
      </h3>
      <p style="margin: 0 0 12px 0; color: #1e40af;">Te recordamos que la tarifa del quincho se abona <strong>posteriormente al uso</strong> (o al momento de coordinar el retiro de llaves en la Municipalidad).</p>
      
      <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: 500;">Puntos de atención e información:</p>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.6;">
        <li style="margin-bottom: 8px;">
          <strong>Atención Presencial y Retiro de Llaves:</strong> Acércate a las ventanillas de la Municipalidad de <strong>7:00 a 12:00 hs</strong>.
        </li>
        <li>
          <strong>Consultas por WhatsApp:</strong> Podés enviar un mensaje al <a href="https://wa.me/5493446503291" style="color: #1d4ed8; text-decoration: underline; font-weight: 600;">3446-503291</a> (atención de 7:00 a 13:00 hs).
        </li>
      </ul>
    </div>
  ` : `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 16px 0 8px 0; color: #1e3a8a; font-size: 22px; font-weight: 700;">¡Reserva recibida! (Pendiente de pago)</h2>
      <p style="color: #4b5563; margin: 0; font-size: 15px;">Hola ${nombre}, registramos tu solicitud de reserva de cancha. Recuerda que para confirmarla totalmente es necesario realizar el pago.</p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 24px 0; font-size: 15px;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 40%;">Fecha:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${fechaFormateada}</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563;">Horario:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${horaFormateada} hs</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563;">Turnos / Días:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${dias} ${dias === 1 ? 'turno' : 'turnos'}</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; font-weight: 700; color: #1e3a8a;">Total a pagar:</td>
        <td style="padding: 16px 20px; font-weight: 700; color: #1e3a8a; font-size: 17px;">$${total}</td>
      </tr>
    </table>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 24px 0; font-size: 14px;">
      <h3 style="margin: 0 0 10px 0; color: #1d4ed8; font-size: 15px; font-weight: 600;">
        Información Importante de Pago
      </h3>
      <p style="margin: 0 0 12px 0; color: #1e40af;">Tienes un plazo de <strong>${plazoDias} días</strong> para abonar la reserva. De lo contrario, se cancelará automáticamente.</p>
      
      <p style="margin: 0 0 8px 0; color: #1e40af; font-weight: 500;">Opciones de pago disponibles:</p>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.6;">
        <li style="margin-bottom: 12px;">
          <strong>Transferencia Bancaria:</strong><br>
          Titular: <code>MUNICIP DE ALDEA SAN ANTONIO</code><br>
          CBU: <code>3860046101000000015731</code><br>
          Alias: <code>libredisponibilidad</code><br>
          <em style="display: block; margin-top: 4px;">Envía el comprobante de pago por mensaje de WhatsApp al <a href="https://wa.me/5493446503291" style="color: #1d4ed8; text-decoration: underline; font-weight: 600;">3446-503291</a> (los pagos por mensaje se reciben de <strong>7:00 a 13:00 hs</strong>).</em>
        </li>
        <li>
          <strong>Pago Presencial:</strong> Acércate a las ventanillas de la Municipalidad (los pagos por ventanilla se reciben de <strong>7:00 a 12:00 hs</strong>).
        </li>
      </ul>
    </div>
  `;
  return baseTemplate(content, isQuincho ? `Reserva del Quincho Municipal para el día ${fechaFormateada}` : `Reserva recibida (Pendiente de pago) para el día ${fechaFormateada}`);
};

/**
 * Template for Reservation Cancellation / Warning
 */
export const getReservationCancellationEmailHtml = (nombre, { fecha, hora, motivo, tipo = 'cancha' }) => {
  const fechaFormateada = formatFecha(fecha);
  const horaFormateada = formatHora(hora);
  const isQuincho = tipo === 'quincho';
  
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 16px 0 8px 0; color: #991b1b; font-size: 22px; font-weight: 700;">Aviso de cancelación de reserva</h2>
      <p style="color: #4b5563; margin: 0; font-size: 15px;">Hola ${nombre}, te informamos sobre un cambio importante en tu reserva.</p>
    </div>

    <p style="color: #4b5563;">${isQuincho ? 'La reserva que tenías agendada para el Quincho Municipal ha sido cancelada por la administración.' : 'El turno que tenías agendado para jugar al pádel ha sido cancelado por la administración.'}</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 24px 0; font-size: 15px;">
      ${isQuincho ? `
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 30%;">Espacio:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">Quincho Municipal</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 30%;">Fecha:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${fechaFormateada}</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563;">Horario:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${horaFormateada} hs</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; font-weight: 600; color: #991b1b; vertical-align: top;">Motivo:</td>
        <td style="padding: 16px 20px; color: #1f2937; font-style: italic;">"${motivo}"</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #991b1b;">
      Lamentamos los inconvenientes ocasionados. Ya puedes ingresar al portal web para consultar disponibilidad y reagendar en la fecha de tu preferencia.
    </div>
  `;
  return baseTemplate(content, `Aviso: Tu reserva del día ${fechaFormateada} fue cancelada`);
};

/**
 * Template for Reservation Payment Received / Approved
 */
export const getBookingApprovedEmailHtml = (nombre, { fecha, hora, tipo = 'cancha' }) => {
  const fechaFormateada = formatFecha(fecha);
  const horaFormateada = formatHora(hora);
  const isQuincho = tipo === 'quincho';
  
  const content = isQuincho ? `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 16px 0 8px 0; color: #1e3a8a; font-size: 22px; font-weight: 700;">¡Reserva de Quincho aprobada!</h2>
      <p style="color: #4b5563; margin: 0; font-size: 15px;">Hola ${nombre}, tu solicitud de reserva para el Quincho Municipal ha sido aprobada.</p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 24px 0; font-size: 15px;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 40%;">Espacio:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">Quincho Municipal</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563;">Fecha:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${fechaFormateada}</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; font-weight: 600; color: #4b5563;">Turno / Horario:</td>
        <td style="padding: 16px 20px; color: #1f2937;">${horaFormateada} hs</td>
      </tr>
    </table>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #1e40af;">
      <strong>Información de la reserva:</strong> Recordá acércate a la Municipalidad para coordinar el retiro de llaves y realizar el pago correspondiente. ¡Que disfrutes del espacio!
    </div>
  ` : `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 16px 0 8px 0; color: #1e3a8a; font-size: 22px; font-weight: 700;">¡Pago recibido y turno confirmado!</h2>
      <p style="color: #4b5563; margin: 0; font-size: 15px;">Hola ${nombre}, registramos tu pago de manera exitosa. Tu turno está totalmente confirmado.</p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 24px 0; font-size: 15px;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 40%;">Fecha:</td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${fechaFormateada}</td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; font-weight: 600; color: #4b5563;">Horario:</td>
        <td style="padding: 16px 20px; color: #1f2937;">${horaFormateada} hs</td>
      </tr>
    </table>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #1e40af;">
      <strong>Información del turno:</strong> Las luces de la cancha de pádel se encenderán automáticamente <strong>5 minutos antes</strong> del horario de tu reserva y se apagarán al finalizar. ¡Que tengas un excelente partido!
    </div>
  `;
  return baseTemplate(content, isQuincho ? `¡Reserva aprobada! Quincho para el día ${fechaFormateada}` : `¡Pago recibido! Turno confirmado para el día ${fechaFormateada}`);
};


