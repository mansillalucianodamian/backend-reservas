import mysql from 'mysql2/promise';
import ENVIROMENT from './enviroment.config.js';

console.log("DB_HOST:", ENVIROMENT.DB_HOST);
console.log("DB_PORT:", ENVIROMENT.DB_PORT);
console.log("DB_USER:", ENVIROMENT.DB_USER);
console.log("DB_PASSWORD:", ENVIROMENT.DB_PASSWORD);
console.log("DB_NAME:", ENVIROMENT.DB_NAME);

export const pool = mysql.createPool({
  host: ENVIROMENT.DB_HOST,
  port: ENVIROMENT.DB_PORT,
  user: ENVIROMENT.DB_USER,
  password: ENVIROMENT.DB_PASSWORD,
  database: ENVIROMENT.DB_NAME
});
