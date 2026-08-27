import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/img')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + (Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
})

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')){
        cb (null, true)
    } else {
        cb(new Error('Only images are allowed!'), false)
    }
}

export const upload = multer({storage, fileFilter});

