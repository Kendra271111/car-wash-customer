import { Router } from 'express';
import { helloWorld, getAllUsers, getUserById, createUser, transferPoint } from '../controllers/usercontrollers';
import { validate } from '../middlewares/validate';
import { validateTransferPoint } from '../validations/userSchema'
import { authent } from '../middlewares/authMiddleware'
import { authorizeRole } from '../middlewares/authorizeRole'
import { upload } from '../libs/multer'

const router = Router();

router.get('/', authent, upload.single('pfp'), getAllUsers);
router.get('/:id', getUserById);
router.post('/', upload.single('pfp'), createUser);
router.post('/transfer', validate(validateTransferPoint), transferPoint);

export default router;
