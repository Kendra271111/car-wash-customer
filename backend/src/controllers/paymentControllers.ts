// src/controllers/paymentControllers.ts
import type { Request, Response, NextFunction } from 'express'
import type { Prisma } from '../../.prisma/client/client' // adjust path if needed
import prisma from '../libs/prisma'
import { snap } from '../libs/midtrans'
import crypto from 'crypto'

// ─── Cash / manual payment ─────────────────────────────────

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, amount, change, method, status, notes } = req.body as {
      orderId?: number | string
      amount?: number | string
      change?: number | string
      method?: string
      status?: string
      notes?: string
    }

    const oId = Number(orderId)
    if (!oId || amount === undefined) {
      return res.status(400).json({ message: 'orderId and amount are required.' })
    }

    const payment = await prisma.payments.create({
      data: {
        orderId: oId,
        amount: Number(amount),
        change: Number(change || 0),
        method: method || 'CASH',
        status: status || 'PAID',
        ...(notes != null ? { notes: String(notes) } : {}),
      },
      include: { order: true },
    })

    // Cash paid → keep order in workflow; use PROCESSING or leave PENDING
    // Only mark COMPLETED if that matches your business rules
    if (payment.status === 'PAID') {
      await prisma.orders.update({
        where: { id: oId },
        data: { status: 'PROCESSING' },
      })
    }

    return res.status(201).json({
      message: 'Payment created successfully',
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

export const getPaymentByOrderId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = Number(req.params.orderId)
    const payment = await prisma.payments.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            customer: true,
            vehicle: true,
            staff: true,
            order_items: { include: { service: true } },
          },
        },
      },
    })

    if (!payment) {
      return res
        .status(404)
        .json({ message: 'Payment not found for this order.' })
    }

    return res.status(200).json({
      message: 'Payment retrieved successfully',
      data: payment,
    })
  } catch (error) {
    next(error)
  }
}

export const getAllPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      method,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '10',
    } = req.query

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10
    const skip = (pageNum - 1) * limitNum

    const where: Prisma.paymentsWhereInput = {}

    if (typeof method === 'string' && method) {
      where.method = method
    }
    if (typeof status === 'string' && status) {
      where.status = status
    }
    if (typeof search === 'string' && search) {
      where.order = {
        customer: {
          name: { contains: search, mode: 'insensitive' },
        },
      }
    }
    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {}
      if (typeof startDate === 'string') createdAt.gte = new Date(startDate)
      if (typeof endDate === 'string') createdAt.lte = new Date(endDate)
      where.createdAt = createdAt
    }

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where,
        take: limitNum,
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
    ])

    return res.status(200).json({
      message: 'Payments retrieved successfully',
      meta: {
        current_page: pageNum,
        limit: limitNum,
        total_data: total,
        total_pages: Math.ceil(total / limitNum),
      },
      data: payments,
    })
  } catch (error) {
    next(error)
  }
}

// ─── Midtrans Snap ─────────────────────────────────────────

export const createSnapToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.body as { orderId?: number | string }
    const id = Number(orderId)
    if (!id) {
      return res.status(400).json({ message: 'orderId required' })
    }

    const order = await prisma.orders.findUnique({
      where: { id },
      include: {
        customer: true,
        order_items: true,
      },
    })
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const grossAmount = order.order_items.reduce(
      (s, i) => s + Number(i.subtotal || 0),
      0
    )
    if (grossAmount <= 0) {
      return res.status(400).json({ message: 'Invalid order total' })
    }

    const midtransOrderId = `ORDER-${order.id}-${Date.now()}`

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(grossAmount),
      },
      customer_details: {
        first_name: order.customer?.name || 'Customer',
        email: order.customer?.email || undefined,
        phone: order.customer?.phone
          ? String(order.customer.phone)
          : undefined,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      },
    }

    const transaction = await snap.createTransaction(parameter)

    // Pending payment row (notes stores Midtrans order_id for webhook)
    await prisma.payments.create({
      data: {
        orderId: order.id,
        amount: grossAmount,
        change: 0,
        method: 'MIDTRANS',
        status: 'PENDING',
        notes: midtransOrderId,
      },
    })

    return res.status(200).json({
      message: 'Snap token created',
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        orderId: order.id,
        midtransOrderId,
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── Midtrans notification (webhook) ───────────────────────

export const midtransNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body as {
      order_id?: string
      status_code?: string
      gross_amount?: string
      signature_key?: string
      transaction_status?: string
      payment_type?: string
      fraud_status?: string
    }

    const orderId = body.order_id
    const statusCode = body.status_code
    const grossAmount = body.gross_amount
    const signatureKey = body.signature_key
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return res.status(400).json({ message: 'Invalid notification payload' })
    }

    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex')

    if (expected !== signatureKey) {
      return res.status(403).json({ message: 'Invalid signature' })
    }

    const parts = String(orderId).split('-')
    const ourOrderId = Number(parts[1])
    if (!ourOrderId) {
      return res.status(400).json({ message: 'Unknown order' })
    }

    const txStatus = body.transaction_status
    const fraud = body.fraud_status

    const isPaid =
      txStatus === 'settlement' ||
      (txStatus === 'capture' && fraud === 'accept') ||
      (txStatus === 'capture' && !fraud)

    if (isPaid) {
      await prisma.payments.updateMany({
        where: { orderId: ourOrderId, notes: orderId },
        data: {
          status: 'PAID',
          method: body.payment_type || 'MIDTRANS',
        },
      })
      await prisma.orders.update({
        where: { id: ourOrderId },
        data: { status: 'PROCESSING' },
      })
    } else if (
      txStatus === 'expire' ||
      txStatus === 'cancel' ||
      txStatus === 'deny'
    ) {
      await prisma.payments.updateMany({
        where: { orderId: ourOrderId, notes: orderId },
        data: { status: 'FAILED' },
      })
    }

    return res.status(200).json({ message: 'OK' })
  } catch (error) {
    next(error)
  }
}

