import {Request, Response, NextFunction} from 'express';
import z from 'zod';

export const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse(req.body)
        next()
    } catch (error) {
        if (error instanceof z.ZodError ){
            return res.status(400).json({
                status: "error",
                message: error.errors.map(e => e.message).join(', '),
            })
        }
    }
}