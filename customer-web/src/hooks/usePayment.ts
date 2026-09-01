import { api } from "../api/api";

export type CreatePaymentData = {
  orderId: number;
  amount: number;
  change?: number;
  method: string;
  status: string;
  notes?: string;
};

export const createPayment = async (paymentData: CreatePaymentData) => {
  const res = await api.post("/payments", paymentData);
  return res.data;
};

export const getPaymentByOrderId = async (orderId: number | string) => {
  const res = await api.get(`/payments/order/${orderId}`);
  return res.data?.data ?? res.data;
};

export const fetchPayments = async (
  search = "",
  options: { startDate?: string; endDate?: string } = {}
) => {
  const { startDate, endDate } = options;
  const params: Record<string, string> = {};

  if (search) params.search = search;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await api.get("/payments", { params });
  return res.data?.data || [];
};

export default {
  createPayment,
  getPaymentByOrderId,
  fetchPayments,
};