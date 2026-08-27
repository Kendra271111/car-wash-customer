import { Router } from 'express';
import { createService, getAllServices, getServiceById, updateService, deleteService } from '../controllers/serviceControlllers';
import { validate } from '../middlewares/validate';
import { createServiceSchema } from '../validations/serviceSchema';
import { authent } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authent, validate(createServiceSchema), createService);
router.get('/', authent, getAllServices);
router.get('/:id', authent, getServiceById);
router.put('/:id', authent, validate(createServiceSchema), updateService);
router.delete('/:id', authent, deleteService);

export default router;
