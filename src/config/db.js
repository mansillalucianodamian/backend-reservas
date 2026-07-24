import mysql from 'mysql2/promise';
import ENVIROMENT from './enviroment.config.js';

// Log de verificación
console.log("DB CONFIG:", {
  host: ENVIROMENT.DB_HOST,
  port: ENVIROMENT.DB_PORT,
  user: ENVIROMENT.DB_USER,
  password: ENVIROMENT.DB_PASSWORD,
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

// Asegurar columnas en la base de datos
(async () => {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM reservas LIKE 'con_luz'");
    if (columns.length === 0) {
      console.log("ℹ️ Agregando columna con_luz a la tabla reservas...");
      await pool.query("ALTER TABLE reservas ADD COLUMN con_luz TINYINT(1) DEFAULT 0");
      console.log("✅ Columna con_luz agregada con éxito.");
    }
  } catch (err) {
    console.error("⚠️ Error al verificar/crear la columna con_luz:", err.message);
  }
})();

