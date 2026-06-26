import mysql from 'mysql2/promise';
import ENVIROMENT from './enviroment.config.js';

console.log("DB_USER:", ENVIROMENT.DB_USER);
console.log("DB_PASSWORD:", ENVIROMENT.DB_PASSWORD);

export const pool = mysql.createPool({
  host: ENVIROMENT.DB_HOST,
  port: ENVIROMENT.DB_PORT,
  user: ENVIROMENT.DB_USER,
  password: ENVIROMENT.DB_PASSWORD,
  database: ENVIROMENT.DB_NAME
});
