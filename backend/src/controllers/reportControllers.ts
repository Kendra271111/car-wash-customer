import type { Request, Response, NextFunction } from 'express';
import prisma from '../libs/prisma';

export const getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = '30d' } = req.query;
    
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await prisma.payments.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'PAID',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const dailyMap = new Map<string, number>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, 0);
    }

    for (const payment of payments) {
      const key = payment.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        dailyMap.set(key, dailyMap.get(key)! + payment.amount);
      }
    }

    const data = Array.from(dailyMap.entries()).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));

    return res.status(200).json({
      message: 'Revenue report retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrdersReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = '30d' } = req.query;
    
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.orders.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        status: true,
        createdAt: true,
      },
    });

    const dailyMap = new Map<string, { total: number; completed: number }>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { total: 0, completed: 0 });
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(key)) {
        const current = dailyMap.get(key)!;
        current.total += 1;
        if (order.status === 'COMPLETED') current.completed += 1;
      }
    }

    const data = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      total: counts.total,
      completed: counts.completed,
    }));

    return res.status(200).json({
      message: 'Orders report retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getComparisonReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = '30d' } = req.query;
    
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - days);
    
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    const [currentPayments, previousPayments, currentOrders, previousOrders] = await Promise.all([
      prisma.payments.findMany({
        where: { createdAt: { gte: currentStart, lt: now }, status: 'PAID' },
        select: { amount: true },
      }),
      prisma.payments.findMany({
        where: { createdAt: { gte: previousStart, lt: previousEnd }, status: 'PAID' },
        select: { amount: true },
      }),
      prisma.orders.findMany({
        where: { createdAt: { gte: currentStart, lt: now } },
        select: { status: true },
      }),
      prisma.orders.findMany({
        where: { createdAt: { gte: previousStart, lt: previousEnd } },
        select: { status: true },
      }),
    ]);

    const currentRevenue = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const previousRevenue = previousPayments.reduce((sum, p) => sum + p.amount, 0);
    const revenueGrowth = previousRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

    const currentTotalOrders = currentOrders.length;
    const previousTotalOrders = previousOrders.length;
    const ordersGrowth = previousTotalOrders === 0 ? (currentTotalOrders > 0 ? 100 : 0) : ((currentTotalOrders - previousTotalOrders) / previousTotalOrders) * 100;

    const currentCompleted = currentOrders.filter(o => o.status === 'COMPLETED').length;
    const previousCompleted = previousOrders.filter(o => o.status === 'COMPLETED').length;
    const completedGrowth = previousCompleted === 0 ? (currentCompleted > 0 ? 100 : 0) : ((currentCompleted - previousCompleted) / previousCompleted) * 100;

    const avgOrderValue = currentTotalOrders === 0 ? 0 : currentRevenue / currentTotalOrders;
    const completionRate = currentTotalOrders === 0 ? 0 : (currentCompleted / currentTotalOrders) * 100;

    return res.status(200).json({
      message: 'Comparison report retrieved successfully',
      data: {
        current: { revenue: currentRevenue, orders: currentTotalOrders, completed: currentCompleted },
        previous: { revenue: previousRevenue, orders: previousTotalOrders, completed: previousCompleted },
        growth: {
          revenue: Math.round(revenueGrowth * 100) / 100,
          orders: Math.round(ordersGrowth * 100) / 100,
          completed: Math.round(completedGrowth * 100) / 100,
        },
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};
