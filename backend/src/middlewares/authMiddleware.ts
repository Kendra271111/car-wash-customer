import {Request, Response, NextFunction} from 'express';
import prisma from '../libs/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const authent =  (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    console.log(token)

    if(!token){
        return res.status(401).json({message: "Access denied"})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        (req as any).user = decoded;
        next();
    } catch (error) {
        next(error);
    }
}