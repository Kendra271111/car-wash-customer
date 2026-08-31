import { api } from "../api/api";

export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";

export const statusColors: Record<OrderStatus, string> = {
  PENDING: "badge-warning",
  PROCESSING: "badge-info",
  COMPLETED: "badge-success",
  CANCELLED: "badge-error",
};

export const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Waiting",
  PROCESSING: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const statusCounts: Record<OrderStatus, number> = {
  PENDING: 0,
  PROCESSING: 0,
  COMPLETED: 0,
  CANCELLED: 0,
};

export interface Order {
  id: number;
  status?: OrderStatus;
  vehicleId?: number;
  customerId?: number;
  staffId?: number;
  note?: string;
  createdAt?: string;
  vehicle?: {
    id: number;
    brand?: string;
    model?: string;
    name?: string;
    plateNumber?: string;
  };
  customer?: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
  };
  staff?: {
    id: number;
    name?: string;
    position?: string;
  };
  order_items?: {
    id?: number;
    serviceId?: number;
    qty?: number;
    price?: number;
    duration?: number;
    subtotal?: number;
  }[];
  payements?: {
    id?: number;
    status?: string;
  }[];
  [key: string]: any;
}

export interface FetchOrdersParams {
  startDate?: string;
  endDate?: string;
}

export interface CreateOrderData {
  vehicleId: number;
  customerId: number;
  staffId?: number | null;
  status?: OrderStatus;
  note?: string;
  items: {
    serviceId: number;
    duration: number;
    amount?: number;
    price: number;
    qty: number;
    subtotal: number;
  }[];
}

type OrderId = number | string;

const assertId = (id: OrderId | null | undefined): OrderId => {
  if (id === null || id === undefined || id === "") {
    throw new Error("Order ID is required");
  }
  return id;
};

export const computeStats = (
  orders: Order[]
): Record<OrderStatus, number> => {
  const stats = { ...statusCounts };

  orders.forEach((o) => {
    const s = (o.status || "PENDING") as OrderStatus;
    if (stats[s] !== undefined) {
      stats[s] += 1;
    }
  });

  return stats;
};

export const fetchOrders = async (
  search = "",
  { startDate, endDate }: FetchOrdersParams = {}
): Promise<Order[]> => {
  const params: Record<string, string> = {};

  if (search) params.search = search;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await api.get("/orders", { params });
  return res.data?.data || [];
};

export const fetchOrderById = async (
  id: OrderId | null | undefined
): Promise<Order> => {
  const orderId = assertId(id);
  const res = await api.get(`/orders/${orderId}`);
  return res.data?.data ?? res.data;
};

export const createOrder = async (orderData: CreateOrderData) => {
  const res = await api.post("/orders", orderData);
  return res.data;
};

export const updateOrder = async (
  id: OrderId | null | undefined,
  orderData: Partial<CreateOrderData>
) => {
  const orderId = assertId(id);
  const res = await api.put(`/orders/${orderId}`, orderData);
  return res.data;
};

export const updateOrderStatus = async (
  id: OrderId | null | undefined,
  status: OrderStatus
) => {
  const orderId = assertId(id);
  const res = await api.patch(`/orders/${orderId}/status`, { status });
  return res.data;
};

export const deleteOrder = async (id: OrderId | null | undefined) => {
  const orderId = assertId(id);
  const res = await api.delete(`/orders/${orderId}`);
  return res.data;
};

const useOrders = {
  statusColors,
  statusLabels,
  statusCounts,
  computeStats,
  fetchOrders,
  fetchOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
};

export default useOrders;