import { Router } from "express";
import ConfigController from "../controllers/config.controller.js";

const configRouter = Router();

configRouter.get('/precio', ConfigController.getPrecioCancha);
configRouter.put('/precio', ConfigController.updatePrecioCancha);
configRouter.get('/precio-quincho', ConfigController.getPrecioQuincho);
configRouter.put('/precio-quincho', ConfigController.updatePrecioQuincho);

export default configRouter;
