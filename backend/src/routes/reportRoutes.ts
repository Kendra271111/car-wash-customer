import { Router } from 'express';
import { getRevenueReport, getOrdersReport, getComparisonReport } from '../controllers/reportControllers';
import { authent } from '../middlewares/authMiddleware';

const router = Router();

router.get('/revenue', authent, getRevenueReport);
router.get('/orders', authent, getOrdersReport);
router.get('/comparison', authent, getComparisonReport);

export default router;
