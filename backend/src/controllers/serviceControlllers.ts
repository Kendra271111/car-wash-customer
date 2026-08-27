import type { Prisma } from '../../.prisma/client/client';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const createService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, duration, price } = req.body;

    const newService = await prisma.services.create({
      data: {
        name: name as string,
        duration: Number(duration),
        price: Number(price)
      },
      include: {
        order_items: true,
      },
    });

    return res.status(201).json({
      message: 'Service created successfully',
      data: newService,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = '1', limit = '10' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.servicesWhereInput = {};
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    const [services, total_data] = await Promise.all([
      prisma.services.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
        order_items: true,
        },
      }),
      prisma.services.count({ where }),
    ]);

    return res.status(200).json({
      message: 'Services retrieved successfully',
      meta: {
        current_page: pageNum,
        limit: limitNum,
        total_data,
        total_pages: Math.ceil(total_data / limitNum),
      },
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const service = await prisma.services.findUnique({
      where: { id: Number(id) },
      include: {
        order_items: true,
      },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    return res.status(200).json({
      message: 'Service retrieved successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, duration, price} = req.body;

    const updatedService = await prisma.services.update({
      where: { id: Number(id) },
      data: {
        name: name as string,
        duration: Number(duration),
        price: Number(price)
      },
      include: {
        order_items: true,
      },
    });

    return res.status(200).json({
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.services.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
