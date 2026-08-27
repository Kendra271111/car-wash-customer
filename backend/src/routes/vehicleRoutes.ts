import { Router } from 'express';
import { createVehicle, getAllVehicles, getVehicleById, updateVehicle, deleteVehicle } from '../controllers/vehicleControllers';
import { validate } from '../middlewares/validate';
import { createVehicleSchema } from '../validations/vehicleSchema';
import { authent } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authent, validate(createVehicleSchema), createVehicle);
router.get('/', authent, getAllVehicles);
router.get('/:id', authent, getVehicleById);
router.put('/:id', authent, validate(createVehicleSchema), updateVehicle);
router.delete('/:id', authent, deleteVehicle);

export default router;
