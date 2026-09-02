import { Router } from 'express';
import {
  createPayment,
  getPaymentByOrderId,
  getAllPayments,
  createSnapToken,
  midtransNotification,
} from '../controllers/paymentControllers'
import { validate } from '../middlewares/validate';
import { authent } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/authorizeRole';

const router = Router();

router.post('/', authent, authorizeRole(['ADMIN', 'STAFF']), createPayment);
router.get('/order/:orderId', authent, getPaymentByOrderId);
router.get('/', authent, getAllPayments);

export default router;

//Midtrans routes

router.post('/', authent, createPayment)
router.post('/midtrans/snap', authent, createSnapToken)
router.post('/midtrans/notification', midtransNotification) // public