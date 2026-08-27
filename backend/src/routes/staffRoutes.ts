import { Router } from 'express';
import { getAllStaff, getStaffById, createStaff, updateStaff, deleteStaff } from '../controllers/staffControllers';
import { authent } from '../middlewares/authMiddleware';
import { authorizeRole } from '../middlewares/authorizeRole';

const router = Router();

router.get('/', authent, getAllStaff);
router.get('/:id', authent, getStaffById);
router.post('/', authent, authorizeRole(['ADMIN']), createStaff);
router.put('/:id', authent, authorizeRole(['ADMIN']), updateStaff);
router.delete('/:id', authent, authorizeRole(['ADMIN']), deleteStaff);

export default router;
