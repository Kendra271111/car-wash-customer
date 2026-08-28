import './App.css'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './components/pages/auth/login'
import Index from './components/pages'
import Register from './components/pages/auth/register'

const RequireAuth = () => {
  const token = localStorage.getItem('token')
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

const GuestOnly = () => {
  const token = localStorage.getItem('token')
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function App() {

  return (
    <>
      <Routes>
            <Route path="/login" element={<GuestOnly />}>
              <Route index element={<Login />} />
            </Route>
            <Route path="/register" element={<GuestOnly />}>
              <Route index element={<Register />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route>
                <Route path="/dashboard" element={<Index />} />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
    </>
  )
}

export default App
