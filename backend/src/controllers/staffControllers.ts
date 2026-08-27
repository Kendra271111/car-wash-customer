import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const getAllStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({ where, take: limit, skip, orderBy: { createdAt: 'desc' } }),
      prisma.staff.count({ where }),
    ]);

    return res.status(200).json({
      message: 'Staff retrieved successfully',
      meta: { current_page: page, limit, total_data: total, total_pages: Math.ceil(total / limit) },
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({ where: { id: Number(id) } });

    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    return res.status(200).json({ message: 'Staff retrieved successfully', data: staff });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, position, isActive } = req.body;
    const newStaff = await prisma.staff.create({
      data: { name, email, phone: phone || null, position: position || null, isActive: isActive ?? true },
    });

    return res.status(201).json({ message: 'Staff created successfully', data: newStaff });
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, phone, position, isActive } = req.body;
    const updated = await prisma.staff.update({
      where: { id: Number(id) },
      data: { name, email, phone, position, isActive },
    });

    return res.status(200).json({ message: 'Staff updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.staff.delete({ where: { id: Number(id) } });
    
    return res.status(200).json({ message: 'Staff deleted successfully' });
  } catch (error) {
    next(error);
  }
};
