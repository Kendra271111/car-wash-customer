import { Router } from 'express';
import { register, login } from '../controllers/authcontrollers';
import { upload } from '../libs/multer';

const router = Router();
 
router.post('/register', upload.single('pfp'), register);
router.post('/login', login);

export default router;