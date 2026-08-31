// src/hooks/useCustomer.ts
import { api } from '../api/api'

export type CustomerData = {
  name: string
  email: string
  phone?: string | number | null
  password?: string
  pfp?: string | null
}

export type Customer = {
  id: number
  name: string
  email: string
  phone?: string | number | null
  pfp?: string | null
  role?: string
  createdAt?: string
  vehicles?: {
    id: number
    name?: string
    plateNumber?: string
    brand?: string
    model?: string
  }[]
}

export const fetchCustomers = async (search = ''): Promise<Customer[]> => {
  const res = await api.get(
    '/customers',
    search ? { params: { search } } : undefined
  )
  return res.data?.data || []
}

export const fetchCustomerById = async (
  id: number | string
): Promise<Customer> => {
  const res = await api.get(`/customers/${id}`)
  return res.data?.data ?? res.data
}

/** Logged-in customer profile (prefer this on the customer web app) */
export const fetchMyProfile = async (): Promise<Customer> => {
  const res = await api.get('/auth/customer/me')
  // fallback if you use /customers/me instead
  // const res = await api.get('/customers/me')
  return res.data?.data ?? res.data
}

export const createCustomer = async (customerData: CustomerData) => {
  const res = await api.post('/customers', customerData)
  return res.data
}

export const updateCustomer = async (
  id: number | string,
  customerData: Partial<CustomerData>
) => {
  const res = await api.put(`/customers/${id}`, customerData)
  return res.data
}

/** Update own profile without knowing id in the URL */
export const updateMyProfile = async (customerData: Partial<CustomerData>) => {
  const res = await api.patch(`/customers/profile`, customerData)
  return res.data?.data ?? res.data
}

export const deleteCustomer = async (id: number | string) => {
  const res = await api.delete(`/customers/${id}`)
  return res.data
}

/** Delete own account */
export const deleteMyAccount = async () => {
  const res = await api.delete('/auth/customer/me')
  return res.data
}

const useCustomer = {
  fetchCustomers,
  fetchCustomerById,
  fetchMyProfile,
  createCustomer,
  updateCustomer,
  updateMyProfile,
  deleteCustomer,
  deleteMyAccount,
}

export default useCustomer