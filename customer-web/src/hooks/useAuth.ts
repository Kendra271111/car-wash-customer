import { api, setUser, clearAuth, getToken, getUser } from '../api/api'

export interface User {
  id: number
  email: string
  name: string
  role: string
  phone?: number | string | null
  pfp?: string | null
  type?: 'customer' | 'staff' | string | null
}

export interface LoginResponse {
  message: string
  token: string
  user: User
}

export interface RegisterResponse {
  message: string
  data: {
    id: number
    name: string
    email: string
    phone?: number | string | null
    pfp?: string | null
    role?: string
  }
}

const useAuth = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post('/auth/cLogin', { email, password })
    const data = res.data as LoginResponse

    if (!data.token || !data.user) {
      throw new Error('Invalid login response from server.')
    }

    setUser(data.token, data.user)
    return data
  },

  async register(
    name: string,
    email: string,
    password: string,
    phone?: string | number
  ): Promise<RegisterResponse> {
    const res = await api.post<RegisterResponse>('/auth/cRegister', {
      name,
      email,
      password,
      ...(phone !== undefined ? { phone } : {}),
    })
    return res.data
  },

  getToken,
  getUser: getUser<User>,
  logout: clearAuth,

  isAuthenticated(): boolean {
    return !!getToken()
  },
}

export default useAuth