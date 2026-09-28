import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, CalendarX2, Clock, ListOrdered, Play, Timer, XCircle } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import BookingDialog from '../components/BookingDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { dayLabel, formatClock, formatCountdown, formatDurationLabel } from '../utils/time.js'

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'queue', label: 'Queue' },
  { key: 'past', label: 'Past' },
]

export default function Bookings() {
  const { machines, now, settings, myBookings, myQueueEntries, cancelBooking, startNow } = useWash()
  const toast = useToast()
  const [tab, setTab] = useState('upcoming')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [preset, setPreset] = useState(null)

  const upcoming = useMemo(() => myBookings.filter((b) => ['scheduled', 'due', 'started'].includes(b.status)), [myBookings])
  const past = useMemo(() => myBookings.filter((b) => ['completed', 'missed', 'cancelled'].includes(b.status)).reverse(), [myBookings])

  const machineName = (id) => {
    const m = machines.find((x) => x.id === id)
    return m ? m.name : 'Machine'
  }

  const handleCancel = (booking) => {
    cancelBooking(booking.id)
    toast.info('Booking cancelled', `${machineName(booking.machineId)} slot released.`)
  }

  return (
    <div className="stack">
      <section className="card card--toolbar">
        <div className="toolbar">
          <div className="segmented">
            {TABS.map((t) => (
              <button key={t.key} type="button" className={`segmented__btn ${tab === t.key ? 'is-active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
                <span className="segmented__count">
                  {t.key === 'upcoming' ? upcoming.length : t.key === 'queue' ? myQueueEntries.length : past.length}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              setPreset(null)
              setBookingOpen(true)
            }}
          >
            <CalendarPlus size={16} /> New booking
          </button>
        </div>
      </section>

      {tab === 'upcoming' ? (
        upcoming.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={CalendarPlus}
              title="No upcoming bookings"
              message="Book a machine slot and it will show up here with a live start countdown."
              action={
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setBookingOpen(true)}>
                  Book a machine
                </button>
              }
            />
          </div>
        ) : (
          <div className="booking-grid">
            {upcoming.map((b) => {
              const isDue = b.status === 'due'
              const graceLeft = b.startAt + settings.graceMinutes * 60000 - now
              return (
                <article key={b.id} className={`booking-card booking-card--${b.status}`}>
                  <header className="booking-card__head">
                    <div>
                      <h3>{machineName(b.machineId)}</h3>
                      <span className="booking-card__code">
                        {machines.find((m) => m.id === b.machineId)?.code} &middot; {b.source === 'queue' ? 'from queue' : 'self booked'}
                      </span>
                    </div>
                    <span className={`tag tag--${b.status}`}>{b.status}</span>
                  </header>

                  <div className="booking-card__when">
                    <div>
                      <span className="booking-card__day">{dayLabel(b.startAt, now)}</span>
                      <strong>{formatClock(b.startAt)}</strong>
                      <span className="booking-card__range">
                        &rarr; {formatClock(b.endAt)} &middot; {formatDurationLabel(b.durationMin)}
                      </span>
                    </div>
                    {isDue ? (
                      <div className="countdown countdown--warn">
                        <span className="countdown__value">{formatCountdown(graceLeft)}</span>
                        <span className="countdown__label">left to start</span>
                      </div>
                    ) : b.status === 'started' ? (
                      <span className="pill pill--live">
                        <span className="live-pill__dot" /> Running
                      </span>
                    ) : null}
                  </div>

                  <div className="booking-card__foot">
                    <Link className="btn btn--ghost btn--xs" to={`/machines/${b.machineId}`}>
                      Machine details
                    </Link>
                    <div className="booking-card__actions">
                      {isDue ? (
                        <button type="button" className="btn btn--primary btn--xs" onClick={() => startNow(b.machineId)}>
                          <Play size={14} /> Start now
                        </button>
                      ) : null}
                      {['scheduled', 'due'].includes(b.status) ? (
                        <button type="button" className="btn btn--outline btn--xs" onClick={() => handleCancel(b)}>
                          <XCircle size={14} /> Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {b.status === 'missed' ? (
                    <p className="booking-card__note booking-card__note--danger">
                      No motion detected in the {settings.graceMinutes} minute window. You were moved to the end of the queue.
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        )
      ) : null}

      {tab === 'queue' ? (
        myQueueEntries.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={ListOrdered}
              title="You are not in any queue"
              message="Join a queue from a machine page and your position will be tracked here."
              action={
                <Link className="btn btn--primary btn--sm" to="/machines">
                  Browse machines
                </Link>
              }
            />
          </div>
        ) : (
          <div className="card">
            <ul className="queue-mini queue-mini--lg">
              {myQueueEntries.map((entry) => (
                <li key={entry.machine.id}>
                  <span className="queue-mini__pos">#{entry.position}</span>
                  <div>
                    <strong>{entry.machine.name}</strong>
                    <span>
                      {entry.machine.status === 'running' && entry.machine.session
                        ? `Free at ${formatClock(entry.machine.session.endsAt)}`
                        : `Status: ${entry.machine.status}`}
                      {entry.position === 1 ? ' · you are next' : ` · ${entry.position - 1} ahead of you`}
                    </span>
                  </div>
                  <Link className="btn btn--ghost btn--xs" to={`/machines/${entry.machine.id}`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
            <p className="card__foot-note">
              <Timer size={14} /> If the machine frees up you get {settings.graceMinutes} minutes to start before your turn is lost.
            </p>
          </div>
        )
      ) : null}

      {tab === 'past' ? (
        past.length === 0 ? (
          <div className="card">
            <EmptyState icon={CalendarX2} title="No past bookings" message="Finished, missed and cancelled slots will be listed here." />
          </div>
        ) : (
          <div className="card">
            <ul className="list list--rows">
              {past.map((b) => (
                <li key={b.id} className="list__item">
                  <span className={`list__icon list__icon--${b.status === 'missed' ? 'danger' : b.status === 'completed' ? 'success' : 'muted'}`}>
                    <Clock size={16} />
                  </span>
                  <div className="list__body">
                    <strong>
                      {machineName(b.machineId)} &middot; {formatClock(b.startAt)}
                    </strong>
                    <span>
                      {dayLabel(b.startAt, now)} &middot; {formatDurationLabel(b.durationMin)} &middot;{' '}
                      <em className={`tag tag--${b.status}`}>{b.status}</em>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}

      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} machineId={preset} />
    </div>
  )
}
