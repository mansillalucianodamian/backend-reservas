import mysql from 'mysql2/promise';
import ENVIROMENT from './enviroment.config.js';

// Log de verificación sanitizado (CWE-532: No exponer credenciales)
console.log("DB CONFIG:", {
  host: ENVIROMENT.DB_HOST,
  port: ENVIROMENT.DB_PORT,
  user: ENVIROMENT.DB_USER,
  password: '***',
  database: ENVIROMENT.DB_NAME
});

if (!ENVIROMENT.DB_USER || !ENVIROMENT.DB_HOST || !ENVIROMENT.DB_NAME) {
  console.error("❌ ERROR: Configuración de base de datos incompleta o no cargada.");
  console.error("Asegúrate de tener un archivo `.env` en la raíz del proyecto o de iniciar PM2 utilizando el archivo `ecosystem.config.js` (`pm2 start ecosystem.config.js`).");
}

// Crear pool de conexiones
export const pool = mysql.createPool({
  host: ENVIROMENT.DB_HOST,
  port: ENVIROMENT.DB_PORT,
  user: ENVIROMENT.DB_USER,
  password: ENVIROMENT.DB_PASSWORD,
  database: ENVIROMENT.DB_NAME
});

// Asegurar columnas en la base de datos (omitir en entorno de pruebas)
(async () => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    // Verificar columna con_luz
    const [columnsLuz] = await pool.query("SHOW COLUMNS FROM reservas LIKE 'con_luz'");
    if (columnsLuz.length === 0) {
      console.log("ℹ️ Agregando columna con_luz a la tabla reservas...");
      await pool.query("ALTER TABLE reservas ADD COLUMN con_luz TINYINT(1) DEFAULT 0");
      console.log("✅ Columna con_luz agregada con éxito.");
    }

    // Verificar columna created_at
    const [columnsCreatedAt] = await pool.query("SHOW COLUMNS FROM reservas LIKE 'created_at'");
    if (columnsCreatedAt.length === 0) {
      console.log("ℹ️ Agregando columna created_at a la tabla reservas...");
      await pool.query("ALTER TABLE reservas ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
      console.log("✅ Columna created_at agregada con éxito.");
    }

    // Verificar columna fecha_aprobacion
    const [columnsFechaAprobacion] = await pool.query("SHOW COLUMNS FROM reservas LIKE 'fecha_aprobacion'");
    if (columnsFechaAprobacion.length === 0) {
      console.log("ℹ️ Agregando columna fecha_aprobacion a la tabla reservas...");
      await pool.query("ALTER TABLE reservas ADD COLUMN fecha_aprobacion DATETIME DEFAULT NULL");
      console.log("✅ Columna fecha_aprobacion agregada con éxito.");
    }

    // Asegurar que la columna rol de usuarios soporte todos los perfiles (boletero, bloqueado, etc.)
    await pool.query("ALTER TABLE usuarios MODIFY COLUMN rol VARCHAR(50) NOT NULL DEFAULT 'usuario'");

    // Verificar tabla pileta_config
    await pool.query(`CREATE TABLE IF NOT EXISTS pileta_config (
      id INT PRIMARY KEY AUTO_INCREMENT,
      precio_adulto DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
      precio_nino DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
      abierta TINYINT(1) NOT NULL DEFAULT 1,
      horarios VARCHAR(255) NOT NULL DEFAULT 'Martes a Domingos de 14:00 a 20:00 hs',
      mensaje_estado VARCHAR(255) DEFAULT 'Pileta habilitada para la temporada',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

    const [rowsConfig] = await pool.query('SELECT COUNT(*) as count FROM pileta_config');
    if (rowsConfig[0].count === 0) {
      await pool.query(`INSERT INTO pileta_config (id, precio_adulto, precio_nino, abierta, horarios, mensaje_estado)
        VALUES (1, 2500.00, 1500.00, 1, 'Martes a Domingos de 14:00 a 20:00 hs', 'Pileta habilitada para la temporada')`);
    }

    // Verificar tabla pileta_ventas
    await pool.query(`CREATE TABLE IF NOT EXISTS pileta_ventas (
      id INT PRIMARY KEY AUTO_INCREMENT,
      fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cant_adultos INT NOT NULL DEFAULT 0,
      cant_ninos INT NOT NULL DEFAULT 0,
      cant_gratis INT NOT NULL DEFAULT 0,
      precio_adulto_unitario DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
      precio_nino_unitario DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      medio_pago ENUM('efectivo', 'transferencia') NOT NULL DEFAULT 'efectivo',
      usuario_id INT NULL,
      cajero_nombre VARCHAR(100) NULL,
      estado ENUM('cobrado', 'anulado') NOT NULL DEFAULT 'cobrado',
      motivo_anulacion VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  } catch (err) {
    console.error("⚠️ Error al verificar/crear columnas o tablas de pileta:", err.message);
  }
})();

