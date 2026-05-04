import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';


const userRouter = Router();

// Solo super_admin y recepcionista pueden listar usuarios
userRouter.get('/', authMiddleware, roleMiddleware('super_admin', 'recepcionista'), UserController.getAll);

// Solo super_admin puede crear usuarios
userRouter.post('/', authMiddleware, roleMiddleware('super_admin'), UserController.create);

// Solo super_admin puede actualizar usuarios
userRouter.put('/:id', authMiddleware, roleMiddleware('super_admin'), UserController.update);

// Solo super_admin puede eliminar usuarios
userRouter.delete('/:id', authMiddleware, roleMiddleware('super_admin'), UserController.delete);

export default userRouter;
