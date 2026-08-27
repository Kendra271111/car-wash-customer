import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const createVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, plateNumber, brand, model, customerId } = req.body;

    const newVehicle = await prisma.vehicles.create({
      data: {
        name: name as string,
        plateNumber: plateNumber as string,
        brand: brand as string,
        model: model as string,
        customerId: customerId ? Number(customerId) : undefined,
      },
      include: {
        customer: true,
        orders: true,
      },
    });

    return res.status(201).json({
      message: 'Vehicle created successfully',
      data: newVehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = '1', limit = '10' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { plateNumber: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [vehicles, total_data] = await Promise.all([
      prisma.vehicles.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          orders: true,
        },
      }),
      prisma.vehicles.count({ where }),
    ]);

    return res.status(200).json({
      message: 'Vehicles retrieved successfully',
      meta: {
        current_page: pageNum,
        limit: limitNum,
        total_data,
        total_pages: Math.ceil(total_data / limitNum),
      },
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicles.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        orders: true,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    return res.status(200).json({
      message: 'Vehicle retrieved successfully',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, plateNumber, brand, model, customerId } = req.body;

    const updatedVehicle = await prisma.vehicles.update({
      where: { id: Number(id) },
      data: {
        name: name as string,
        plateNumber: plateNumber as string,
        brand: brand as string,
        model: model as string,
        customerId: customerId ? Number(customerId) : undefined,
      },
      include: {
        customer: true,
        orders: true,
      },
    });

    return res.status(200).json({
      message: 'Vehicle updated successfully',
      data: updatedVehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.vehicles.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
