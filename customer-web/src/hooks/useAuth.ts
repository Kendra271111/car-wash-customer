import { api, setUser, clearAuth, getToken, getUser } from "../api/api";

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
  }
  message?: string
}

const useAuth = {
  async login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post("/auth/login", { email, password });
  const data = res.data.data || res.data;

  if (!data.token || !data.user) {
    throw new Error("Invalid login response from server.");
  }

  console.log("LOGIN RESPONSE:", res.data);
  await setUser(data.token, data.user);
  return data;
},

  async register(name: string, email: string, password: string) {
    const { data } = await api.post<RegisterResponse>('/auth/register', {
      name,
      email,
      password,
    })
    // Optional: auto-login after register
    // if (data.token && data.user) {
    //   setUser(data.token, data.user)
    // }
    return data
  },

  getToken,
  getUser,
  logout: clearAuth,

  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },
};

export default useAuth;