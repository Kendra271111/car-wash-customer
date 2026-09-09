import type { Prisma } from '../../.prisma/client/client'
import type { Request, Response, NextFunction } from 'express'
import prisma from '../libs/prisma'

type IncomingItem = {
  serviceId?: number | string
  duration?: number | string
  amount?: number | string
  price?: number | string
  qty?: number | string
  subtotal?: number | string
}

const toId = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const mapItems = (items: IncomingItem[]) =>
  items
    .filter((item) => toId(item.serviceId) != null)
    .map((item) => {
      const price = Number(item.price || 0)
      const qty = Number(item.qty || 1)
      const subtotal = Number(item.subtotal ?? price * qty)
      const amount = Number(item.amount ?? subtotal)
      return {
        serviceId: toId(item.serviceId) as number,
        duration: Number(item.duration || 0),
        amount,
        price,
        qty,
        subtotal,
      }
    })

const orderInclude = {
  vehicle: true,
  customer: true,
  staff: { select: { id: true, name: true, email: true } },
  order_items: { include: { service: true } },
  payements: true,
} as const

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
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
      vehicleId?: string | number
      customerId?: string | number
      status?: string
      note?: string
      staffId?: number | string | null
      items?: IncomingItem[]
    }

    const vId = toId(vehicleId)
    const cId = toId(customerId)
    const sId = toId(staffId)

    if (!vId || !cId) {
      return res
        .status(400)
        .json({ message: 'vehicleId and customerId are required.' })
    }

    const validItems = mapItems(items)
    if (validItems.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one service is required.' })
    }

    const [vehicle, customer] = await Promise.all([
      prisma.vehicles.findUnique({ where: { id: vId } }),
      prisma.customers.findUnique({ where: { id: cId } }),
    ])

    if (!vehicle) {
      return res.status(404).json({ message: `Vehicle with ID ${vId} not found.` })
    }
    if (!customer) {
      return res.status(404).json({ message: `Customer with ID ${cId} not found.` })
    }

    if (sId != null) {
      const staff = await prisma.staff.findUnique({ where: { id: sId } })
      if (!staff) {
        return res.status(404).json({ message: `Staff with ID ${sId} not found.` })
      }
    }
    
    const open = await prisma.orders.findFirst({
      where: {
        customerId: cId,
        NOT: {
          OR: [
            { status: 'CANCELLED' },
            { status: 'COMPLETED' /* + paid check if you store it */ },
          ],
        },
      },
    })
    if (open) {
      return res.status(409).json({
        message: 'You already have an active order. Finish it before booking again.',
      })
    }
    
    const nextStatus = status || 'PENDING'
    // Bay cannot start without a person
    if (nextStatus === 'PROCESSING' && sId == null) {
      return res.status(400).json({
        message: 'Assign staff before setting status to In Progress.',
      })
    }

    const newOrder = await prisma.orders.create({
      data: {
        vehicleId: vId,
        customerId: cId,
        staffId: sId, // null = unassigned
        status: nextStatus,
        note: note || '',
        order_items: {
          create: validItems,
        },
      },
      include: orderInclude,
    })

    return res.status(201).json({
      message: 'Order created successfully',
      data: newOrder,
    })
  } catch (error) {
    next(error)
  }
}

export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      status,
      page = '1',
      limit = '100',
      startDate,
      endDate,
    } = req.query

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 100))
    const skip = (pageNum - 1) * limitNum

    const where: Prisma.ordersWhereInput = {}

    if (search) {
      where.OR = [
        { vehicle: { name: { contains: search as string, mode: 'insensitive' } } },
        {
          vehicle: {
            plateNumber: { contains: search as string, mode: 'insensitive' },
          },
        },
        {
          customer: {
            name: { contains: search as string, mode: 'insensitive' },
          },
        },
      ]
    }

    if (status) where.status = status as string

    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {}
      if (startDate) createdAt.gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        createdAt.lte = end
      }
      where.createdAt = createdAt
    }

    const [orders, total_data] = await Promise.all([
      prisma.orders.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
      prisma.orders.count({ where }),
    ])

    return res.status(200).json({
      message: 'Orders retrieved successfully',
      meta: {
        current_page: pageNum,
        limit: limitNum,
        total_data,
        total_pages: Math.ceil(total_data / limitNum) || 1,
      },
      data: orders,
    })
  } catch (error) {
    next(error)
  }
}

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid order id' })
    }

    const order = await prisma.orders.findUnique({
      where: { id },
      include: orderInclude,
    })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    return res.status(200).json({
      message: 'Order retrieved successfully',
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid order id' })
    }

    const {
      vehicleId,
      customerId,
      status,
      note,
      staffId,
      items = [],
    } = req.body as {
      vehicleId?: number | string
      customerId?: number | string
      status?: string
      note?: string | null
      staffId?: number | string | null
      items?: IncomingItem[]
    }

    const vId = toId(vehicleId)
    const cId = toId(customerId)
    const sId = toId(staffId) // null if empty — staff optional here

    if (!vId || !cId) {
      return res
        .status(400)
        .json({ message: 'vehicleId and customerId are required.' })
    }

    const validItems = mapItems(items)
    if (validItems.length === 0) {
      return res
        .status(400)
        .json({ message: 'At least one service is required.' })
    }

    if (status === 'PROCESSING' && sId == null) {
      return res.status(400).json({
        message: 'Assign staff before setting status to In Progress.',
      })
    }

    if (sId != null) {
      const staff = await prisma.staff.findUnique({ where: { id: sId } })
      if (!staff) {
        return res.status(404).json({ message: `Staff with ID ${sId} not found.` })
      }
    }

    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: {
        vehicleId: vId,
        customerId: cId,
        staffId: sId, // null clears assignment
        status,
        note: note ?? null,
        order_items: {
          deleteMany: {},
          create: validItems,
        },
      },
      include: orderInclude,
    })

    return res.status(200).json({
      message: 'Order updated successfully',
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id)
    await prisma.orders.delete({ where: { id } })
    return res.status(200).json({ message: 'Order deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id)
    const { status } = req.body as { status?: string }

    if (!status) {
      return res.status(400).json({ message: 'status is required' })
    }

    if (status === 'PROCESSING') {
      const current = await prisma.orders.findUnique({ where: { id } })
      if (!current) {
        return res.status(404).json({ message: 'Order not found' })
      }
      if (current.staffId == null) {
        return res.status(400).json({
          message: 'Assign staff before starting the wash.',
        })
      }
    }

    const updatedOrder = await prisma.orders.update({
      where: { id },
      data: { status },
      include: orderInclude,
    })

    return res.status(200).json({
      message: 'Order status updated successfully',
      data: updatedOrder,
    })
  } catch (error) {
    next(error)
  }
}