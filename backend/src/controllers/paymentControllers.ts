import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, amount, change, method, status } = req.body;

    const payment = await prisma.payments.create({
      data: {
        orderId: Number(orderId),
        amount: Number(amount),
        change: Number(change),
        method,
        status: status || 'PAID',
      },
      include: {
        order: true,
      },
    });

    if (payment.status === 'PAID') {
      await prisma.orders.update({
        where: { id: Number(orderId) },
        data: { status: 'COMPLETED' },
      });
    }

    return res.status(201).json({
      message: 'Payment created successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentByOrderId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const payment = await prisma.payments.findFirst({
      where: { orderId: Number(orderId) },
      include: {
        order: {
          include: {
            customer: true,
            vehicle: true,
            staff: true,
            order_items: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found for this order.' });
    }

    return res.status(200).json({
      message: 'Payment retrieved successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, method, status, startDate, endDate } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.order = {
        customer: {
          name: { contains: search as string, mode: 'insensitive' },
        },
      };
    }
    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) createdAt.gte = new Date(startDate as string)
      if (endDate) createdAt.lte = new Date(endDate as string)
      where.createdAt = createdAt
    }

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              customer: true,
              vehicle: true,
              staff: true,
            },
          },
        },
      }),
      prisma.payments.count({ where }),
    ]);

    return res.status(200).json({
      message: 'Payments retrieved successfully',
      meta: {
        current_page: page,
        limit: limit,
        total_data: total,
        total_pages: Math.ceil(total / limit),
      },
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};
