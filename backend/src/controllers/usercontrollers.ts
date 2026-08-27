import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const helloWorld = (req: Request, res: Response, next: NextFunction) => {
    return res.json({
        message: 'Hello World'
    });
}

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, point, role } = req.body;
        const pfp = req.file ? req.file.filename : null;
        const newUser = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: password, 
                point: Number(point),
                pfp,
                role: role || 'USER',
            },
        });
    
        return res.status(201).json({
            message: 'User created successfully',
            data: newUser,
        });
    } catch (error) {
       next(error);
    }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {search, minPrice, sortBy} = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: search as string,
          mode: 'insensitive'
        }
      },
      take: limit,
      skip: skip,
      orderBy: {
        createdAt: sortBy === 'oldest' ? 'asc' : 'desc'
      },
    });

    if (!users){
      return res.status(404).json({
        message: 'No such user found',
      });
    }       

    const total_data = await prisma.user.count();

    return res.status(200).json({
      message: 'Users retrieved successfully',
      meta: {
        current_page: page,
        limit: limit,
        total_data: total_data,
        total_pages: Math.ceil(total_data / limit)
      },
      data: users,
    });
  } catch (error) {
       next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: {
                id: Number(id),
            },
        });
    
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            message: 'User retrieved successfully',
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const transferPoint = async (req: Request, res: Response, next: NextFunction) => {
    const { senderId, receiverId, amount } = req.body;

    try {
        const sender = await prisma.user.findUnique({ where: { id: Number(senderId) } });
        const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });

        if (!sender || !receiver) {
            if(!sender){
            return res.status(404).json({ message: 'Sender not found' });
            } if(!receiver) {
                return res.status(404).json({ message: 'Receiver not found' });
            } else {
                return res.status(404).json({ message: 'No ID was found' });
            }
        }

         if (senderId === receiverId) {
            return res.status(404).json({  message: 'Cannot be the on same user' });
        }

        if (sender!.point < Number(amount)) {
            return res.status(400).json({ message: 'Insufficient points' });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: Number(senderId) },
                data: { point: { decrement: Number(amount) } },
            }),
            prisma.user.update({
                where: { id: Number(receiverId) },
                data: { point: { increment: Number(amount) } },
            }),
        ]);

        return res.status(200).json({ message: 'Point transferred successfully' });
    } catch (error) {
        next(error);
    }
}