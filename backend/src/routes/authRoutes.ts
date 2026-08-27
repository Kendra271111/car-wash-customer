import { Router } from 'express';
import {  login } from '../controllers/authcontrollers';

const router = Router();
 
//router.post('/register', upload.single('pfp'), register);
router.post('/login', login);

export default router;