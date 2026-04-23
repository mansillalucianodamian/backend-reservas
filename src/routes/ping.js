import express from 'express';
import { pool } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Conexión OK', result: rows[0].result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en la conexión a MySQL' });
  }
});

export default router;
