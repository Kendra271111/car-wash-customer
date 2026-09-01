import './App.css'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Login from './components/pages/auth/login'
import Index from './components/pages'
import History from './components/pages/history'
import Register from './components/pages/auth/register'
import Profile from './components/pages/profile/profile'
import EditProfile from './components/pages/profile/editProfile'
import CreateVehicle from './components/pages/vehicles/createVehicles'
import Vehicles from './components/pages/vehicles/vehicles'
import Orders from './components/pages/orders/orders'
import CreateOrders from './components/pages/orders/createOrders'
import ViewOrder from './components/pages/orders/viewOrder'

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
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/vehicles/create" element={<CreateVehicle />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<ViewOrder />} />
                <Route path="/orders/create" element={<CreateOrders/>} />
                <Route path="/history" element={<History/>} />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
    </>
  )
}

export default App
