import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CircleCheck,
  Clock,
  Gauge,
  LogOut,
  MapPin,
  Phone,
  Play,
  PowerOff,
  Square,
  Timer,
  UserPlus,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import StatusBadge from '../components/StatusBadge.jsx'
import WasherArt from '../components/WasherArt.jsx'
import QueueList from '../components/QueueList.jsx'
import SensorPanel from '../components/SensorPanel.jsx'
import BookingDialog from '../components/BookingDialog.jsx'
import { dateKey, formatClock, formatCountdown, formatDateLong, formatDurationLabel, formatRemaining } from '../utils/time.js'

export default function MachineDetail() {
  const { machineId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    machines,
    users,
    bookings,
    currentUser,
    now,
    settings,
    startNow,
    stopCycle,
    joinQueue,
    leaveQueue,
    cancelBooking,
    setMachineStatus,
  } = useWash()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  const machine = machines.find((m) => m.id === machineId)
  if (!machine) {
    return (
      <div className="card">
        <div className="empty-state">
          <span className="empty-state__icon">
            <AlertTriangle size={26} />
          </span>
          <h3>Machine not found</h3>
          <p>This machine is not part of the laundry room.</p>
          <Link className="btn btn--primary btn--sm" to="/machines">
            Back to machines
          </Link>
        </div>
      </div>
    )
  }

  const session = machine.session
  const sessionUser = session ? users.find((u) => u.id === session.userId) : null
  const isMySession = session && sessionUser && sessionUser.id === currentUser.id
  const reservedBooking = bookings.find((b) => b.id === machine.reservedFor) || null
  const reservedUser = reservedBooking ? users.find((u) => u.id === reservedBooking.userId) : null
  const isMyReservation = reservedBooking && reservedUser && reservedUser.id === currentUser.id
  const myQueuePosition = machine.queue.indexOf(currentUser.id) + 1
  const remaining = session ? session.endsAt - now : 0
  const progress = session
    ? Math.min(100, Math.max(2, ((session.durationMin * 60000 - remaining) / (session.durationMin * 60000)) * 100))
    : 0
  const daySchedule = bookings
    .filter(
      (b) =>
        b.machineId === machine.id &&
        b.date === dateKey(now) &&
        ['scheduled', 'due', 'started'].includes(b.status),
    )
    .sort((a, b) => a.startAt - b.startAt)

  const duration = settings.defaultDuration
  const wifiBlocked = settings.wifiRequired && !machine.wifi

  return (
    <div className="stack">
      <div className="page-nav">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/machines')}>
          <ArrowLeft size={15} /> All machines
        </button>
        <div className="page-nav__title">
          <h2>{machine.name}</h2>
          <span>
            <MapPin size={13} /> {machine.location} &middot; {machine.code}
          </span>
        </div>
        <StatusBadge status={machine.status} pulse />
      </div>

      {!machine.wifi ? (
        <p className="alert alert--danger">
          <WifiOff size={16} /> Wi-Fi disconnected. The machine runs on local control only and cannot start new cycles remotely.
        </p>
      ) : null}
      {!machine.motionSensor ? (
        <p className="alert alert--warning">
          <AlertTriangle size={16} /> Motion sensor disconnected. Bookings will be marked MISSED because no motion can be detected.
        </p>
      ) : null}

      <section className="card card--machine">
        <div className="machine-hero">
          <div className="machine-hero__art">
            <WasherArt status={machine.status} size="xl" />
          </div>
          <div className="machine-hero__info">
            <div className="machine-hero__chips">
              <span className="chip chip--muted">
                <Gauge size={13} /> {machine.load}
              </span>
              <span className={`chip ${machine.wifi ? 'chip--ok' : 'chip--bad'}`}>
                {machine.wifi ? <Wifi size={13} /> : <WifiOff size={13} />} Wi-Fi {machine.wifi ? 'connected' : 'disconnected'}
              </span>
              <span className="chip chip--muted">
                <MapPin size={13} /> {machine.location}
              </span>
            </div>

            {machine.status === 'running' && session ? (
              <>
                <div className="countdown countdown--xl">
                  <span className="countdown__value">{formatCountdown(remaining)}</span>
                  <span className="countdown__label">{formatRemaining(remaining)}</span>
                </div>
                <div className="progress progress--lg">
                  <span className="progress__bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="owner-box">
                  <span className="owner-box__label">Currently using</span>
                  <div className="owner-box__row">
                    <span className="owner-box__avatar" style={{ background: sessionUser.color }}>
                      {sessionUser.initials}
                    </span>
                    <div className="owner-box__meta">
                      <strong>{sessionUser.name}</strong>
                      <span>
                        Room {sessionUser.room} &middot; {sessionUser.phone}
                      </span>
                    </div>
                    {isMySession ? (
                      <button
                        type="button"
                        className="btn btn--soft btn--sm"
                        onClick={() => {
                          setConfirmStop(true)
                        }}
                      >
                        <Square size={14} /> End cycle
                      </button>
                    ) : (
                      <a className="btn btn--primary btn--sm" href={`tel:${sessionUser.phone}`}>
                        <Phone size={15} /> Call {sessionUser.name.split(' ')[0]}
                      </a>
                    )}
                  </div>
                  {isMySession ? (
                    <p className="owner-box__note">
                      Started at {formatClock(session.startedAt)} &middot; {formatDurationLabel(session.durationMin)} cycle
                    </p>
                  ) : (
                    <p className="owner-box__note">Started at {formatClock(session.startedAt)} &middot; ends at {formatClock(session.endsAt)}</p>
                  )}
                </div>
              </>
            ) : null}

            {machine.status === 'reserved' && reservedBooking ? (
              <div className="owner-box owner-box--reserved">
                <span className="owner-box__label">Reserved for</span>
                <div className="owner-box__row">
                  <span className="owner-box__avatar" style={{ background: reservedUser ? reservedUser.color : '#64748b' }}>
                    {reservedUser ? reservedUser.initials : '?'}
                  </span>
                  <div className="owner-box__meta">
                    <strong>{reservedUser ? reservedUser.name : 'Student'}</strong>
                    <span>
                      Room {reservedUser ? reservedUser.room : '--'} &middot; {reservedUser ? reservedUser.phone : ''}
                    </span>
                  </div>
                  {isMyReservation && reservedBooking.status === 'due' ? (
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => startNow(machine.id)}>
                      <Play size={15} /> Start now
                    </button>
                  ) : reservedUser && !isMyReservation ? (
                    <a className="btn btn--soft btn--sm" href={`tel:${reservedUser.phone}`}>
                      <Phone size={15} /> Call
                    </a>
                  ) : null}
                </div>
                <p className="owner-box__note">
                  Slot {formatClock(reservedBooking.startAt)} &middot; {formatDurationLabel(reservedBooking.durationMin)} &middot;{' '}
                  {reservedBooking.status === 'due' ? 'start now, waiting for motion' : `starts ${formatClock(reservedBooking.startAt)}`}
                </p>
                {isMyReservation && reservedBooking.status === 'due' ? (
                  <div className="grace">
                    <Timer size={15} />
                    <span>
                      Start within{' '}
                      <strong>{formatCountdown(reservedBooking.startAt + settings.graceMinutes * 60000 - now)}</strong> or the slot is
                      marked MISSED and you drop to the end of the queue.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {machine.status === 'available' ? (
              <div className="owner-box owner-box--free">
                <span className="owner-box__label">Status</span>
                <div className="owner-box__row">
                  <strong>Available right now</strong>
                  <span>No one is using this machine.</span>
                </div>
              </div>
            ) : null}

            {machine.status === 'offline' ? (
              <div className="owner-box owner-box--offline">
                <span className="owner-box__label">Status</span>
                <div className="owner-box__row">
                  <strong>Offline &mdash; maintenance</strong>
                  <span>Bookings and queue are paused for this machine.</span>
                </div>
              </div>
            ) : null}

            <div className="machine-hero__actions">
              {machine.status === 'available' ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={wifiBlocked}
                  onClick={() => startNow(machine.id, duration)}
                >
                  <Play size={16} /> Start wash-up cycle ({duration} min)
                </button>
              ) : null}
              <button type="button" className="btn btn--soft" onClick={() => setBookingOpen(true)} disabled={machine.status === 'offline'}>
                <CalendarPlus size={16} /> Schedule a slot
              </button>
              {machine.queue.includes(currentUser.id) ? (
                <button type="button" className="btn btn--ghost" onClick={() => leaveQueue(machine.id)}>
                  <LogOut size={16} /> Leave queue
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={machine.status === 'offline' || isMyReservation}
                  onClick={() => joinQueue(machine.id)}
                >
                  <UserPlus size={16} /> Join queue
                </button>
              )}
              {machine.status === 'offline' ? (
                <button type="button" className="btn btn--outline" onClick={() => setMachineStatus(machine.id, 'online')}>
                  <PowerOff size={16} /> Bring online
                </button>
              ) : (
                <button type="button" className="btn btn--outline" onClick={() => setMachineStatus(machine.id, 'offline')}>
                  <PowerOff size={16} /> Take offline
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {confirmStop ? (
        <div className="card card--confirm">
          <div>
            <strong>End this cycle now?</strong>
            <p>{machine.name} will stop immediately and {sessionUser ? sessionUser.name : 'the user'} will be notified.</p>
          </div>
          <div className="card--confirm__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmStop(false)}>
              Keep running
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                stopCycle(machine.id)
                setConfirmStop(false)
              }}
            >
              <Square size={14} /> End cycle
            </button>
          </div>
        </div>
      ) : null}

      <div className="split split--wide">
        <QueueList machine={machine} />
        <div className="stack">
          <SensorPanel machine={machine} />

          <section className="card">
            <div className="card__head">
              <h3>
                <Clock size={17} /> Today&apos;s schedule
              </h3>
              <span className="card__hint">{daySchedule.length} slots</span>
            </div>
            {daySchedule.length === 0 ? (
              <p className="card__empty">No bookings for today.</p>
            ) : (
              <ul className="timeline">
                {daySchedule.map((b) => {
                  const user = users.find((u) => u.id === b.userId)
                  const mine = user && user.id === currentUser.id
                  return (
                    <li key={b.id} className={`timeline__item ${b.id === machine.reservedFor ? 'is-active' : ''}`}>
                      <span className="timeline__time">
                        {formatClock(b.startAt)} &ndash; {formatClock(b.endAt)}
                      </span>
                      <div className="timeline__body">
                        <strong>{mine ? 'You' : user ? user.name : 'Student'}</strong>
                        <span>
                          Room {user ? user.room : '--'} &middot; {formatDurationLabel(b.durationMin)} &middot;{' '}
                          <em className={`tag tag--${b.status}`}>{b.status}</em>
                        </span>
                      </div>
                      {mine && ['scheduled', 'due'].includes(b.status) ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          onClick={() => {
                            cancelBooking(b.id)
                            toast.info('Booking cancelled', 'The slot has been released.')
                          }}
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
            {myQueuePosition > 0 ? (
              <p className="card__foot-note">
                <UserPlus size={14} /> You are number {myQueuePosition} in the {machine.name} queue.
              </p>
            ) : null}
          </section>

          {reservedBooking && !isMyReservation && reservedUser ? (
            <section className="card card--contact">
              <span className="owner-box__avatar owner-box__avatar--lg" style={{ background: reservedUser.color }}>
                {reservedUser.initials}
              </span>
              <div>
                <strong>{reservedUser.name} has a slot at {formatClock(reservedBooking.startAt)}</strong>
                <span>
                  Room {reservedUser.room} &middot; {reservedUser.phone}
                </span>
              </div>
              <a className="btn btn--primary btn--sm" href={`tel:${reservedUser.phone}`}>
                <Phone size={15} /> Call {reservedUser.name.split(' ')[0]}
              </a>
            </section>
          ) : null}

          {session && sessionUser && !isMySession ? (
            <section className="card card--contact">
              <span className="owner-box__avatar owner-box__avatar--lg" style={{ background: sessionUser.color }}>
                {sessionUser.initials}
              </span>
              <div>
                <strong>{sessionUser.name} is using this machine</strong>
                <span>
                  Room {sessionUser.room} &middot; {sessionUser.phone} &middot; ends {formatClock(session.endsAt)}
                </span>
              </div>
              <a className="btn btn--primary btn--sm" href={`tel:${sessionUser.phone}`}>
                <Phone size={15} /> Call {sessionUser.name.split(' ')[0]}
              </a>
            </section>
          ) : null}
        </div>
      </div>

      <section className="card card--facts">
        <div className="card__head">
          <h3>
            <CircleCheck size={17} /> Machine facts
          </h3>
        </div>
        <div className="facts">
          <div>
            <span>Capacity</span>
            <strong>{machine.capacity} kg</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{machine.load}</strong>
          </div>
          <div>
            <span>Default cycle</span>
            <strong>{formatDurationLabel(settings.defaultDuration)}</strong>
          </div>
          <div>
            <span>Grace window</span>
            <strong>{settings.graceMinutes} min</strong>
          </div>
          <div>
            <span>Queue length</span>
            <strong>{machine.queue.length}</strong>
          </div>
          <div>
            <span>Last updated</span>
            <strong>{formatDateLong(now)}</strong>
          </div>
        </div>
      </section>

      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} machineId={machine.id} />
    </div>
  )
}
