import axios from 'axios'
import { useNavigate } from 'react-router' // only if you call logout from a component
// For non-component usage, navigate via window or a shared navigate helper

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Token / User helpers (localStorage instead of SecureStore) ───

export const getToken = (): string | null => {
  return localStorage.getItem('token')
}

export const getUser = <T = object>(): T | null => {
  const user = localStorage.getItem('user')
  return user ? (JSON.parse(user) as T) : null
}

export const setUser = (token: string, user: object): void => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export const clearAuth = (): void => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// ─── Interceptors ───

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await logout()
    }
    return Promise.reject(error)
  }
)

// ─── Logout ───

let isLoggingOut = false

export async function logout() {
  if (isLoggingOut) return
  isLoggingOut = true

  try {
    clearAuth()
  } finally {
    // Soft redirect — works outside React components
    window.location.href = '/login'
    isLoggingOut = false
  }
}