import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { WashingMachine } from 'lucide-react'
import { ToastProvider } from './context/ToastProvider.jsx'
import { WashProvider } from './context/WashProvider.jsx'
import Layout, { RequireAuth } from './components/Layout.jsx'
import Splash from './pages/Splash.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Machines from './pages/Machines.jsx'
import MachineDetail from './pages/MachineDetail.jsx'
import Bookings from './pages/Bookings.jsx'
import HistoryPage from './pages/History.jsx'
import Notifications from './pages/Notifications.jsx'
import Profile from './pages/Profile.jsx'
import Settings from './pages/Settings.jsx'

function NotFound() {
  return (
    <div className="notfound">
      <span className="notfound__icon">
        <WashingMachine size={34} />
      </span>
      <h2>Page not found</h2>
      <p>The page you were looking for is not part of WashTrack.</p>
      <Link className="btn btn--primary" to="/dashboard">
        Back to dashboard
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <WashProvider>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/machines" element={<Machines />} />
                <Route path="/machines/:machineId" element={<MachineDetail />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WashProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
