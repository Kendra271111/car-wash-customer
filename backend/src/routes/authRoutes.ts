import { Router } from 'express';
import { register, login, customerLogin, customerRegister } from '../controllers/authcontrollers';
import { upload } from '../libs/multer';

const router = Router();
 
router.post('/register', upload.single('pfp'), register);
router.post('/login', login);
router.post('/cRegister', upload.single('pfp'), customerRegister);
router.post('/cLogin', customerLogin);


export default router;