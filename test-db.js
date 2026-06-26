import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'reservas_user',
  password: 'reservas2026',
  database: 'reservas'
});

const test = async () => {
  try {
    const [rows] = await pool.query('SELECT 1+1 AS result');
    console.log('Conexión OK:', rows[0].result);
  } catch (err) {
    console.error('Error de conexión:', err);
  }
};

test();
