import { api } from "../api/api";

export type VehicleData = {
  name: string;
  plateNumber: string;
  brand: string;
  model: string;
  customerId: number;
};

export type Vehicle = {
  id: number;
  name?: string;
  plateNumber?: string;
  brand?: string;
  model?: string;
  customerId?: number;
  customer?: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
  };
  [key: string]: any;
};

export const fetchVehicles = async (
  search = "",
  customerId?: number | string
): Promise<Vehicle[]> => {
  const params: Record<string, string> = {};

  if (search) params.search = search;
  if (customerId !== undefined && customerId !== null && customerId !== "") {
    params.customerId = String(customerId);
  }

  const res = await api.get("/vehicles", {
    params: Object.keys(params).length ? params : undefined,
  });

  return res.data?.data || [];
};

export const fetchVehiclesByCustomer = async (
  customerId: number | string
): Promise<Vehicle[]> => {
  const res = await api.get(`/vehicles`, {
    params: { customerId },
  });
  return res.data?.data || [];
};

export const fetchVehicleById = async (
  id: number | string
): Promise<Vehicle> => {
  const res = await api.get(`/vehicles/${id}`);
  return res.data?.data ?? res.data;
};

export const createVehicle = async (vehicleData: VehicleData) => {
  const res = await api.post("/vehicles", vehicleData);
  return res.data;
};

export const updateVehicle = async (
  id: number | string,
  vehicleData: Partial<VehicleData>
) => {
  const res = await api.put(`/vehicles/${id}`, vehicleData);
  return res.data;
};

export const deleteVehicle = async (id: number | string) => {
  const res = await api.delete(`/vehicles/${id}`);
  return res.data;
};

export default {
  fetchVehicles,
  fetchVehiclesByCustomer,
  fetchVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};