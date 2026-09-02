// src/libs/midtrans.ts
import midtransClient from 'midtrans-client'

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
const serverKey = process.env.MIDTRANS_SERVER_KEY as string
const clientKey = process.env.MIDTRANS_CLIENT_KEY as string

export const snap = new midtransClient.Snap({
  isProduction,
  serverKey,
  clientKey,
})

export const core = new midtransClient.CoreApi({
  isProduction,
  serverKey,
  clientKey,
})