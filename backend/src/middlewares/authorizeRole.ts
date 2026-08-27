import {Request, Response, NextFunction} from 'express';
import prisma from '../libs/prisma';

export const authorizeRole = (allowedRoles: String[]) => { 
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user){
                return res.status(401).json({message: "Access denied! No user detected."})
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    message: `Access denied! This feature is only reserved for ${allowedRoles.join(", ")}`
                });
            }
            next();

        } catch (error) {
            next(error);
        }
    }
}