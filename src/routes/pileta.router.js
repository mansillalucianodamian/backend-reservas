import { Router } from 'express';
import { PiletaController } from '../controllers/pileta.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const piletaRouter = Router();

// 🔹 1. Ruta Pública: Consulta de tarifas, horarios y estado para vecinos
piletaRouter.get('/config', PiletaController.getConfig);

// 🔹 2. Rutas Protegidas de Boletería y Control de Caja (boletero, recepcionista, super_admin)
piletaRouter.use(authMiddleware);

// Configuración de tarifas y estado de la pileta (exclusivo administración)
piletaRouter.put(
  '/config',
  roleMiddleware('recepcionista', 'super_admin'),
  PiletaController.updateConfig
);

// Registrar venta en puerta
piletaRouter.post(
  '/ventas',
  roleMiddleware('boletero', 'recepcionista', 'super_admin'),
  PiletaController.registrarVenta
);

// Consultar ventas y arqueo de caja en vivo de hoy
piletaRouter.get(
  '/caja-hoy',
  roleMiddleware('boletero', 'recepcionista', 'super_admin'),
  PiletaController.getCajaHoy
);

// Anular una venta de entrada errónea
piletaRouter.put(
  '/ventas/:id/anular',
  roleMiddleware('boletero', 'recepcionista', 'super_admin'),
  PiletaController.anularVenta
);

// Historial por fecha
piletaRouter.get(
  '/historial',
  roleMiddleware('recepcionista', 'super_admin'),
  PiletaController.getHistorial
);

export default piletaRouter;

