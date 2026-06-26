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

// Crear pool de conexiones
export const pool = mysql.createPool({
  host: ENVIROMENT.DB_HOST,
  port: ENVIROMENT.DB_PORT,
  user: ENVIROMENT.DB_USER,
  password: ENVIROMENT.DB_PASSWORD,
  database: ENVIROMENT.DB_NAME
});
