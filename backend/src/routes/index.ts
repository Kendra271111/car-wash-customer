import { Router } from 'express';
import userRoute from './userRoutes';
import staffRoute from './staffRoutes';
import orderRoute from './orderRoutes';
import paymentRoute from './paymentRoutes';
import reportRoute from './reportRoutes';
import authRoute from './authRoutes';
import serviceRoute from './serviceRoutes';
import customerRoute from './customerRoutes';
import vehicleRoute from './vehicleRoutes';

const router = Router();

router.use('/users', userRoute);
router.use('/staff', staffRoute);
router.use('/orders', orderRoute);
router.use('/payments', paymentRoute);
router.use('/reports', reportRoute);
router.use('/services', serviceRoute);
router.use('/customers', customerRoute);
router.use('/vehicles', vehicleRoute);
router.use('/auth', authRoute);

export default router;

