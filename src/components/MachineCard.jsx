import { Link } from 'react-router-dom'
import { Clock, Phone, Users } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import WasherArt from './WasherArt.jsx'
import { useWash } from '../context/washStore.js'
import { formatClock, formatCountdown, formatDurationLabel } from '../utils/time.js'

function CurrentUserBlock({ machine }) {
  const { users, currentUserId } = useWash()
  const session = machine.session
  if (!session) return null
  const user = users.find((u) => u.id === session.userId)
  if (!user) return null
  const isMe = user.id === currentUserId
  return (
    <div className="machine-user">
      <span className="machine-user__label">Currently using</span>
      <div className="machine-user__row">
        <span className="machine-user__avatar" style={{ background: user.color }}>
          {user.initials}
        </span>
        <div className="machine-user__meta">
          <strong>{isMe ? `${user.name} (you)` : user.name}</strong>
          <span>
            Room {user.room} &middot; {user.phone}
          </span>
        </div>
        {isMe ? (
          <span className="machine-user__tag">Your machine</span>
        ) : (
          <a className="btn btn--soft btn--xs" href={`tel:${user.phone}`}>
            <Phone size={14} /> Call
          </a>
        )}
      </div>
    </div>
  )
}

function ReservedBlock({ machine }) {
  const { users, bookings, currentUserId } = useWash()
  const booking = bookings.find((b) => b.id === machine.reservedFor)
  if (!booking) return null
  const user = users.find((u) => u.id === booking.userId)
  const isMe = user && user.id === currentUserId
  return (
    <div className="machine-user machine-user--reserved">
      <span className="machine-user__label">Reserved for</span>
      <div className="machine-user__row">
        <span className="machine-user__avatar" style={{ background: user ? user.color : '#64748b' }}>
          {user ? user.initials : '?'}
        </span>
        <div className="machine-user__meta">
          <strong>{isMe ? `${user.name} (you)` : user ? user.name : 'Student'}</strong>
          <span>Room {user ? user.room : '--'} &middot; starts {formatClock(booking.startAt)}</span>
        </div>
        {isMe ? <span className="machine-user__tag">Your slot</span> : null}
      </div>
    </div>
  )
}

export default function MachineCard({ machine, showQueue = true }) {
  const { now, users } = useWash()
  const queueCount = machine.queue.length
  const remaining = machine.session ? machine.session.endsAt - now : 0
  const progress = machine.session
    ? Math.min(100, Math.max(0, ((machine.session.durationMin * 60000 - remaining) / (machine.session.durationMin * 60000)) * 100))
    : 0
  const topOfQueue = machine.queue[0] ? users.find((u) => u.id === machine.queue[0]) : null

  return (
    <article className={`machine-card machine-card--${machine.status}`}>
      <header className="machine-card__head">
        <div className="machine-card__id">
          <h3>{machine.name}</h3>
          <span className="machine-card__code">
            {machine.code} &middot; {machine.load}
          </span>
        </div>
        <StatusBadge status={machine.status} pulse />
      </header>

      <div className="machine-card__body">
        <WasherArt status={machine.status} />

        <div className="machine-card__info">
          {machine.status === 'running' && machine.session ? (
            <>
              <div className="countdown">
                <span className="countdown__value">{formatCountdown(remaining)}</span>
                <span className="countdown__label">remaining</span>
              </div>
              <div className="progress">
                <span className="progress__bar" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : null}

          {machine.status === 'running' ? <CurrentUserBlock machine={machine} /> : null}
          {machine.status === 'reserved' ? <ReservedBlock machine={machine} /> : null}

          {machine.status === 'available' ? (
            <div className="machine-user machine-user--free">
              <span className="machine-user__label">Status</span>
              <div className="machine-user__row">
                <strong>Ready to use</strong>
                <span>Book a slot or start a walk-up cycle</span>
              </div>
            </div>
          ) : null}

          {machine.status === 'offline' ? (
            <div className="machine-user machine-user--offline">
              <span className="machine-user__label">Status</span>
              <div className="machine-user__row">
                <strong>Under maintenance</strong>
                <span>Bookings are paused for this machine</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="machine-card__foot">
        <div className="machine-card__chips">
          <span className={`chip ${machine.wifi ? 'chip--ok' : 'chip--bad'}`}>
            <span className="chip__dot" /> Wi-Fi {machine.wifi ? 'connected' : 'disconnected'}
          </span>
          <span className={`chip ${machine.motionSensor ? 'chip--ok' : 'chip--bad'}`}>
            <span className="chip__dot" /> Motion {machine.motionSensor ? 'detected' : 'idle'}
          </span>
          {showQueue && queueCount > 0 ? (
            <span className="chip chip--queue">
              <Users size={13} /> Queue {queueCount}
            </span>
          ) : null}
          {machine.session ? (
            <span className="chip chip--muted">
              <Clock size={13} /> {formatDurationLabel(machine.session.durationMin)} cycle
            </span>
          ) : null}
        </div>
        <div className="machine-card__actions">
          {topOfQueue ? <span className="machine-card__next">Next: {topOfQueue.name.split(' ')[0]}</span> : null}
          <Link className="btn btn--primary btn--sm" to={`/machines/${machine.id}`}>
            View details
          </Link>
        </div>
      </footer>
    </article>
  )
}