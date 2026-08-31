import { Router } from 'express';
import { createCustomer, getAllCustomers, getCustomerById, updateCustomer, deleteCustomer, customerUpdateProfile } from '../controllers/customerControllers';
import { validate } from '../middlewares/validate';
import { createCustomerSchema } from '../validations/customerSchema';
import { authent } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authent, validate(createCustomerSchema), createCustomer);
router.get('/', authent, getAllCustomers);
router.get('/:id', authent, getCustomerById);
router.put('/:id', authent, validate(createCustomerSchema), updateCustomer);
router.delete('/:id', authent, deleteCustomer);
router.patch('/profile', authent, customerUpdateProfile)

export default router;
