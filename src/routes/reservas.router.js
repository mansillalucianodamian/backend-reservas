import { Router } from "express";
import ReservaController from "../controllers/reserva.controller.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const reservasRouter = Router();

// CRUD básico
reservasRouter.get("/", authMiddleware, roleMiddleware('recepcionista','super_admin'), ReservaController.getAll);
reservasRouter.get("/:id", authMiddleware, ReservaController.getById);
reservasRouter.post("/", authMiddleware, roleMiddleware('usuario'), ReservaController.create);
reservasRouter.put("/:id", authMiddleware, roleMiddleware('recepcionista','super_admin'), ReservaController.update);
reservasRouter.delete("/:id", authMiddleware, roleMiddleware('super_admin'), ReservaController.delete);

// Acciones específicas
reservasRouter.put("/:id/aprobar", authMiddleware, roleMiddleware('recepcionista','super_admin'), ReservaController.aprobar);
reservasRouter.put("/:id/cancelar", authMiddleware, roleMiddleware('usuario','recepcionista','super_admin'), ReservaController.cancelar);
reservasRouter.post("/bloquear", authMiddleware, roleMiddleware('super_admin'), ReservaController.bloquear);

export default reservasRouter;

