import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.get('/users/:id/projects', userController.getUserProjects);
router.post('/users', userController.createUser);

export default router;