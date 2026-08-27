import {Request, Response, NextFunction} from 'express';
import prisma from '../libs/prisma';

export const logMiddleware = (req: Request, res: Response, next: NextFunction) => {
    console.log("Entering Log Middleware");
    next();
}