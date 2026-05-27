import express from 'express';
import cors from 'cors';
import ENVIROMENT from './config/enviroment.config.js';

// Conexión MySQL
import { pool } from './config/db.js';

// Router de autenticación
import authRouter from './routes/auth.router.js';
import userRouter from './routes/user.router.js';
import reservasRouter from './routes/reservas.router.js';
import { apagarLuz, encenderLuz } from './services/ShellyService.js';


const app = express();

// Configuración global
app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// Registrar el router
app.use("/api/reservas", reservasRouter);

// Endpoint de prueba para verificar conexión MySQL
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Conexión OK', result: rows[0].result });
  } catch (error) {
    console.error('[SERVER ERROR]: Fallo en la conexión', error);
    res.status(500).json({ error: 'Error en la conexión a MySQL' });
  }
});

// Servidor
app.listen(ENVIROMENT.PORT || 8080, () => {
  console.log(`Servidor corriendo en el puerto ${ENVIROMENT.PORT || 8080}`);
});

// Ruta de prueba para encender
app.get("/test-shelly/on", async (req, res) => {
  try {
    await encenderLuz();
    res.json({ ok: true, message: "Shelly encendido" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Ruta de prueba para apagar
app.get("/test-shelly/off", async (req, res) => {
  try {
    await apagarLuz();
    res.json({ ok: true, message: "Shelly apagado" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});