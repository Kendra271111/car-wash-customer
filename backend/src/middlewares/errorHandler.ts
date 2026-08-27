import {Request, Response, NextFunction} from 'express';
import prisma from '../libs/prisma';

export const ErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack)

    const statusCode = err.statusCode || 500;
    const messages = err.message || "Internal Server Error."

    res.status(statusCode).json({
        status: "error",
        message: messages
    })
}