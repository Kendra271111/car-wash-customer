import { Router } from 'express';
import { createPayment, getPaymentByOrderId, getAllPayments } from '../controllers/paymentControllers';
import { validate } from '../middlewares/validate';
import { authent } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/authorizeRole';

const router = Router();

router.post('/', authent, authorizeRole(['ADMIN', 'STAFF']), createPayment);
router.get('/order/:orderId', authent, getPaymentByOrderId);
router.get('/', authent, getAllPayments);

export default router;
