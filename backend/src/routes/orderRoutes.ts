import { Router } from 'express';
import { createOrder, getAllOrders, getOrderById, updateOrder, updateOrderStatus, deleteOrder } from '../controllers/ordercontrollers';
import { validate } from '../middlewares/validate';
import { createOrderSchema } from '../validations/orderSchema'
import { authent } from '../middlewares/authMiddleware'
import { authorizeRole } from '../middlewares/authorizeRole'


const router = Router();

router.post('/', authent, validate(createOrderSchema), createOrder);
router.get('/', authent, getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id', authent, validate(createOrderSchema), updateOrder);
router.patch('/:id/status', authent, updateOrderStatus);
router.delete('/:id', authent, authorizeRole(['ADMIN']), deleteOrder);

export default router;
