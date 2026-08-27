import {Request, Response, NextFunction} from 'express';
import prisma from '../libs/prisma';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apikey = req.headers['x-api-key'];

    if (apikey === 'PASSWORD')
    {
        next();
    } else {
        res.status(403).json({ message: "Wrong API Key" })
    }
}