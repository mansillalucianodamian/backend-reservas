import { Router } from "express";
import ConfigController from "../controllers/config.controller.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const configRouter = Router();

configRouter.get('/precio', ConfigController.getPrecioCancha);
configRouter.put('/precio', authMiddleware, roleMiddleware('recepcionista', 'super_admin'), ConfigController.updatePrecioCancha);
configRouter.get('/precio-quincho', ConfigController.getPrecioQuincho);
configRouter.put('/precio-quincho', authMiddleware, roleMiddleware('recepcionista', 'super_admin'), ConfigController.updatePrecioQuincho);

configRouter.get('/luces', authMiddleware, roleMiddleware('recepcionista', 'super_admin'), ConfigController.getLucesStatus);
configRouter.put('/luces', authMiddleware, roleMiddleware('recepcionista', 'super_admin'), ConfigController.updateLucesMode);

export default configRouter;
