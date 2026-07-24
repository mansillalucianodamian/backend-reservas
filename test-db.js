import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'root',
  database: 'reservas_padel'
});

const test = async () => {
  try {
    const [rows] = await pool.query('DESCRIBE reservas');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error de conexión:', err);
  }
};

test();
