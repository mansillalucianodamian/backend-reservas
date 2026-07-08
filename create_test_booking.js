import { pool } from './src/config/db.js';

async function run() {
  try {
    // 1. Obtener primer usuario disponible en la base de datos
    const [usuarios] = await pool.query('SELECT id, nombre, email FROM usuarios LIMIT 1');
    if (usuarios.length === 0) {
      console.log('⚠️ No hay usuarios en la base de datos para asociar la reserva.');
      process.exit(1);
    }
    
    const usuario = usuarios[0];
    console.log(`👤 Asociando reserva ficticia al usuario: ${usuario.nombre} (ID: ${usuario.id})`);

    // 2. Insertar reserva ficticia para hoy a las 16:25 con estado Aprobado
    const fecha = '2026-07-08';
    const hora = '16:25:00';
    const estado = 'Aprobado';

    const [result] = await pool.query(
      'INSERT INTO reservas (usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?)',
      [usuario.id, fecha, hora, estado]
    );

    console.log(`\n======================================================`);
    console.log(`✅ Reserva ficticia creada con éxito (ID de Fila: ${result.insertId})`);
    console.log(`📅 Fecha: ${fecha}`);
    console.log(`🕒 Hora: ${hora}`);
    console.log(`🔔 Estado: ${estado}`);
    console.log(`======================================================`);
    console.log(`💡 A las 16:20 hs (5 minutos antes) se encenderá el Shelly.`);
    console.log(`💡 A las 17:25 hs (al finalizar el turno) se apagará el Shelly.`);
    console.log(`======================================================\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al crear la reserva ficticia en la base de datos:', err);
    process.exit(1);
  }
}

run();
