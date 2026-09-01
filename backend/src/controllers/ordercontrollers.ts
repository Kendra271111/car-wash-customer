import type { Prisma } from "../../.prisma/client/client";
import type { Request, Response, NextFunction } from "express";
import prisma from "../libs/prisma";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      vehicleId,
      customerId,
      status,
      note,
      staffId,
      items = [],
    } = req.body as {
      vehicleId?: string | number;
      customerId?: string | number;
      status?: string;
      note?: string;
      staffId?: number | string | undefined | null;
      items?: {
        serviceId?: number | string;
        duration?: number | string;
        amount?: number | string;
        price?: number | string;
        qty?: number | string;
        subtotal?: number | string;
      }[];
    };

    const vId = Number(vehicleId);
    const cId = Number(customerId);
    const sId =
      staffId === undefined || staffId === null || staffId === ""
        ? null
        : Number(staffId);

    if (!vId || !cId) {
      return res
        .status(400)
        .json({ message: "vehicleId, customerId  are required." });
    }

    // optional: if sId is set, verify staff exists
    if (sId != null && Number.isNaN(sId)) {
      return res.status(400).json({ message: "Invalid staffId." });
    }

    const validItems = items.filter((item) => item.serviceId);

    if (validItems.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one service is required." });
    }

    const [vehicle, customer] = await Promise.all([
      prisma.vehicles.findUnique({ where: { id: vId } }),
      prisma.customers.findUnique({ where: { id: cId } }),
    ]);

    if (!vehicle)
      return res
        .status(404)
        .json({ message: `Vehicle with ID ${vId} not found.` });
    if (!customer)
      return res
        .status(404)
        .json({ message: `Customer with ID ${cId} not found.` });

    const newOrder = await prisma.orders.create({
      data: {
        vehicleId: vId,
        customerId: cId,
        staffId: sId ?? undefined,
        status: status || "PENDING",
        note: note || "",
        order_items: {
          create: validItems.map((item) => ({
            serviceId: Number(item.serviceId),
            duration: Number(item.duration),
            amount: Number(item.amount),
            price: Number(item.price),
            qty: Number(item.qty),
            subtotal: Number(item.subtotal),
          })),
        },
      },
      include: {
        vehicle: true,
        customer: true,
        staff: { select: { id: true, name: true, email: true } },
        order_items: {
          include: {
            service: true,
          },
        },
        payements: true,
      },
    });

    return res.status(201).json({
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      search,
      status,
      page = "1",
      limit = "10",
      startDate,
      endDate,
    } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ordersWhereInput = {};
    if (search) {
      where.OR = [
        {
          vehicle: {
            name: { contains: search as string, mode: "insensitive" },
          },
        },
        {
          customer: {
            name: { contains: search as string, mode: "insensitive" },
          },
        },
      ];
    }
    if (status) {
      where.status = status as string;
    }
    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate as string);
      if (endDate) createdAt.lte = new Date(endDate as string);
      where.createdAt = createdAt;
    }

    const [orders, total_data] = await Promise.all([
      prisma.orders.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: true,
          customer: true,
          staff: { select: { id: true, name: true, email: true } },
          order_items: {
            include: {
              service: true,
            },
          },
          payements: true,
        },
      }),
      prisma.orders.count({ where }),
    ]);

    return res.status(200).json({
      message: "Orders retrieved successfully",
      meta: {
        current_page: pageNum,
        limit: limitNum,
        total_data,
        total_pages: Math.ceil(total_data / limitNum),
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const order = await prisma.orders.findUnique({
      where: { id: Number(id) },
      include: {
        vehicle: true,
        customer: true,
        staff: { select: { id: true, name: true, email: true } },
        order_items: {
          include: {
            service: true,
          },
        },
        payements: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {
      vehicleId,
      customerId,
      status,
      note,
      staffId,
      items = [],
    } = req.body as {
      vehicleId?: number | string;
      customerId?: number | string;
      status?: string;
      note?: string;
      staffId?: number | string | null;
      items?: {
        serviceId?: number | string;
        duration?: number | string;
        amount?: number | string;
        price?: number | string;
        qty?: number | string;
        subtotal?: number | string;
      }[];
    };
    const sId = Number(staffId);

    if (!vehicleId || !customerId || !sId) {
      return res
        .status(400)
        .json({ message: "vehicleId, customerId, and staffId are required." });
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: Number(id) },
      data: {
        vehicleId: Number(vehicleId),
        customerId: Number(customerId),
        staffId: sId,
        status,
        note: note || "",
        order_items: {
          deleteMany: {},
          create: items.map((item) => ({
            serviceId: Number(item.serviceId),
            duration: Number(item.duration),
            amount: Number(item.amount),
            price: Number(item.price),
            qty: Number(item.qty),
            subtotal: Number(item.subtotal),
          })),
        },
      },
      include: {
        vehicle: true,
        customer: true,
        staff: { select: { id: true, name: true, email: true } },
        order_items: {
          include: {
            service: true,
          },
        },
        payements: true,
      },
    });

    return res.status(200).json({
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    await prisma.orders.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({
      message: "Order deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await prisma.orders.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        vehicle: true,
        customer: true,
        staff: { select: { id: true, name: true, email: true } },
        order_items: {
          include: {
            service: true,
          },
        },
        payements: true,
      },
    });

    return res.status(200).json({
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};
