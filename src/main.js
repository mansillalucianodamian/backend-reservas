import express from 'express';
import cors from 'cors';
import ENVIROMENT from './config/enviroment.config.js';

// Routers y Controladores
import authRouter from './routes/auth.router.js';
import userRouter from './routes/user.router.js';
import reservasRouter from './routes/reservas.router.js';
import configRouter from './routes/config.router.js';
import ConfigController from './controllers/config.controller.js';
import { apagarLuz, encenderLuz, encenderAireQuincho, apagarAireQuincho } from './services/ShellyService.js';
import { iniciarSincronizadorLuces } from './services/SchedulerService.js';

const app = express();

// Configuración global
app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/reservas', reservasRouter);
app.use('/api/configuracion', configRouter);

// Endpoint de prueba para verificar conexión MySQL (Clean Architecture - delegado a ConfigController/Service)
app.get('/ping', ConfigController.ping);

// Servidor (solo iniciar escucha si no estamos en entorno de testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(ENVIROMENT.PORT || 8080, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${ENVIROMENT.PORT || 8080}`);
    iniciarSincronizadorLuces();
  });
}

export { app };
export default app;

// Rutas de prueba para Shelly
app.get("/test-shelly/on", async (req, res) => {
  try {
    await encenderLuz();
    res.json({ ok: true, message: "Shelly encendido" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/test-shelly/off", async (req, res) => {
  try {
    await apagarLuz();
    res.json({ ok: true, message: "Shelly apagado" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Rutas de prueba para Shelly Quincho
app.get("/test-shelly-quincho/on", async (req, res) => {
  try {
    await encenderAireQuincho();
    res.json({ ok: true, message: "Shelly Quincho encendido" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/test-shelly-quincho/off", async (req, res) => {
  try {
    await apagarAireQuincho();
    res.json({ ok: true, message: "Shelly Quincho apagado" });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});
