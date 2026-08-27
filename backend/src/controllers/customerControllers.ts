import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone } = req.body;

    const newCustomer = await prisma.customers.create({
      data: {
        name: name as string,
        email: email as string,
        phone: Number(phone),
      },
      include: {
        vehicles: true,
        orders: true,
      },
    });

    return res.status(201).json({
      message: 'Customer created successfully',
      data: newCustomer,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = '1', limit = '10' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [customers, total_data] = await Promise.all([
      prisma.customers.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicles: true,
          orders: true,
        },
      }),
      prisma.customers.count({ where }),
    ]);

    return res.status(200).json({
      message: 'Customers retrieved successfully',
      meta: {
        current_page: pageNum,
        limit: limitNum,
        total_data,
        total_pages: Math.ceil(total_data / limitNum),
      },
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customers.findUnique({
      where: { id: Number(id) },
      include: {
        vehicles: true,
        orders: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.status(200).json({
      message: 'Customer retrieved successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const updatedCustomer = await prisma.customers.update({
      where: { id: Number(id) },
      data: {
        name: name as string,
        email: email as string,
        phone: Number(phone),
      },
      include: {
        vehicles: true,
        orders: true,
      },
    });

    return res.status(200).json({
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.customers.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
