import { AlertTriangle, Bell, BellOff, CheckCheck, CircleCheck, Info, Trash2, X } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import EmptyState from '../components/EmptyState.jsx'
import { relativeTime } from '../utils/time.js'

const ICONS = {
  success: CircleCheck,
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
}

export default function Notifications() {
  const { myNotifications, unreadCount, now, markAllRead, readNotification, deleteNotification, clearNotifications, updateSettings, settings } =
    useWash()

  return (
    <div className="stack">
      <section className="card card--toolbar">
        <div className="toolbar">
          <div className="toolbar__left">
            <strong className="toolbar__title">
              {unreadCount ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up'}
            </strong>
          </div>
          <div className="toolbar__right">
            <button type="button" className="btn btn--soft btn--sm" onClick={markAllRead} disabled={!unreadCount}>
              <CheckCheck size={15} /> Mark all read
            </button>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
            >
              <BellOff size={15} /> {settings.notificationsEnabled ? 'Mute alerts' : 'Unmute alerts'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearNotifications} disabled={!myNotifications.length}>
              <Trash2 size={15} /> Clear all
            </button>
          </div>
        </div>
      </section>

      {myNotifications.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title="No notifications"
            message="Booking reminders, missed slot alerts and finished cycles will show up here."
          />
        </div>
      ) : (
        <div className="card">
          <ul className="notifications">
            {myNotifications.map((n) => {
              const Icon = ICONS[n.type] || Info
              return (
                <li key={n.id} className={`notification notification--${n.type} ${n.read ? '' : 'is-unread'}`}>
                  <span className="notification__icon">
                    <Icon size={18} />
                  </span>
                  <div className="notification__body">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <span className="notification__time">{relativeTime(n.createdAt, now)}</span>
                  </div>
                  <div className="notification__actions">
                    {!n.read ? (
                      <button type="button" className="btn btn--ghost btn--xs" onClick={() => readNotification(n.id)}>
                        <CheckCheck size={14} /> Read
                      </button>
                    ) : null}
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => deleteNotification(n.id)} aria-label="Delete notification">
                      <X size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
