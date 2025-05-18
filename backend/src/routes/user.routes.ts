import { Router } from 'express';
import * as UserController from '../controllers/user.controller';

const router = Router();

router.get('/benefactors', UserController.getBenefactors);

export default router;