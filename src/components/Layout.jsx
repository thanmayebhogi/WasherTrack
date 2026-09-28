import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck,
  ChevronRight,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  User,
  WashingMachine,
  X,
} from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import { Avatar } from './Avatar.jsx'
import Toaster from './Toaster.jsx'
import { formatClockWithSeconds, formatDateFull } from '../utils/time.js'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, hint: 'Overview' },
  { to: '/machines', label: 'Machines', icon: WashingMachine, hint: 'Live status' },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck, hint: 'My slots' },
  { to: '/history', label: 'History', icon: History, hint: 'Past washes' },
  { to: '/profile', label: 'Profile', icon: User, hint: 'My details' },
]

const TITLES = {
  '/dashboard': 'Dashboard',
  '/machines': 'Washing machines',
  '/bookings': 'My bookings',
  '/history': 'Usage history',
  '/notifications': 'Notifications',
  '/profile': 'My profile',
  '/settings': 'Settings',
}

export function RequireAuth() {
  const { currentUser } = useWash()
  const location = useLocation()
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export default function Layout() {
  const { currentUser, unreadCount, logout, now, clockOffset } = useWash()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const current = location.pathname.startsWith('/machines/') ? '/machines' : location.pathname
  const title = TITLES[current] || 'WashTrack'

  const handleLogout = () => {
    logout()
    toast.info('Signed out', 'See you at the laundry room.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          <span className="brand-mark">
            <WashingMachine size={20} />
          </span>
          <div>
            <strong>WashTrack</strong>
            <span>Smart hostel laundry</span>
          </div>
          <button type="button" className="icon-btn sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          <span className="sidebar__label">Menu</span>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
            >
              <span className="nav-item__icon">
                <item.icon size={18} />
              </span>
              <span className="nav-item__body">
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </span>
              <ChevronRight size={15} className="nav-item__chev" />
            </NavLink>
          ))}

          <span className="sidebar__label">More</span>
          <NavLink
            to="/notifications"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
          >
            <span className="nav-item__icon">
              <Bell size={18} />
            </span>
            <span className="nav-item__body">
              <strong>Notifications</strong>
              <em>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</em>
            </span>
            {unreadCount ? <span className="nav-item__count">{unreadCount}</span> : <ChevronRight size={15} className="nav-item__chev" />}
          </NavLink>
          <NavLink
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
          >
            <span className="nav-item__icon">
              <SettingsIcon size={18} />
            </span>
            <span className="nav-item__body">
              <strong>Settings</strong>
              <em>Preferences</em>
            </span>
            <ChevronRight size={15} className="nav-item__chev" />
          </NavLink>
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__user">
            <Avatar user={currentUser} />
            <div>
              <strong>{currentUser.name}</strong>
              <span>Room {currentUser.room}</span>
            </div>
          </div>
          <button type="button" className="btn btn--soft btn--sm btn--block" onClick={handleLogout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {menuOpen ? <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} /> : null}

      <div className="app__body">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="topbar__title">
            <h1>{title}</h1>
            <span>{formatDateFull(now)}</span>
          </div>
          <div className="topbar__actions">
            {clockOffset ? <span className="topbar__demo">demo +{Math.round(clockOffset / 60000)}m</span> : null}
            <span className="topbar__clock">{formatClockWithSeconds(now)}</span>
            <Link className="icon-btn icon-btn--badge" to="/notifications" aria-label="Notifications">
              <Bell size={19} />
              {unreadCount ? <span className="icon-btn__badge">{unreadCount}</span> : null}
            </Link>
            <Link to="/profile" className="topbar__avatar" aria-label="Profile">
              <Avatar user={currentUser} size="sm" />
            </Link>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `tab ${isActive ? 'is-active' : ''}`}>
            <span className="tab__icon">
              <item.icon size={20} />
            </span>
            <span className="tab__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <Toaster />
    </div>
  )
}
