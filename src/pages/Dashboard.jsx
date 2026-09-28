import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarPlus,
  CalendarCheck,
  CircleCheck,
  Clock,
  Hourglass,
  ListOrdered,
  Play,
  Sparkles,
  Square,
  Timer,
  TrendingUp,
  WashingMachine,
} from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import MachineCard from '../components/MachineCard.jsx'
import BookingDialog from '../components/BookingDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import WasherArt from '../components/WasherArt.jsx'
import {
  dayLabel,
  formatClock,
  formatCountdown,
  formatDateLong,
  formatDurationLabel,
  formatRemaining,
  relativeTime,
} from '../utils/time.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ icon: Icon, label, value, tone = 'blue', sub }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__icon">
        <Icon size={19} />
      </span>
      <div className="stat__body">
        <span className="stat__label">{label}</span>
        <strong className="stat__value">{value}</strong>
        {sub ? <span className="stat__sub">{sub}</span> : null}
      </div>
    </div>
  )
}

function SectionHead({ title, subtitle, to, linkLabel = 'View all' }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {to ? (
        <Link className="btn btn--ghost btn--sm" to={to}>
          {linkLabel} <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  )
}

export default function Dashboard() {
  const {
    currentUser,
    machines,
    now,
    settings,
    myRunningMachine,
    myReservedMachines,
    myQueueEntries,
    activeBookings,
    myHistory,
    myNotifications,
    startNow,
    stopCycle,
  } = useWash()
  const toast = useToast()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [presetMachine, setPresetMachine] = useState(null)

  const available = machines.filter((m) => m.status === 'available')
  const running = machines.filter((m) => m.status === 'running')
  const reserved = machines.filter((m) => m.status === 'reserved')
  const offline = machines.filter((m) => m.status === 'offline')
  const nextBooking = activeBookings.find((b) => b.status !== 'started') || null
  const dueEntry = myReservedMachines[0] || null
  const totalMinutes = myHistory
    .filter((h) => h.status === 'completed')
    .reduce((sum, h) => sum + (h.durationMin || 0), 0)

  const openBooking = (machineId = null) => {
    setPresetMachine(machineId)
    setBookingOpen(true)
  }

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero__body">
          <span className="hero__eyebrow">
            <Sparkles size={14} /> {formatDateLong(now)}
          </span>
          <h2>
            {greeting()}, {currentUser.name.split(' ')[0]} 👋
          </h2>
          <p>
            Room {currentUser.room} &middot; {machines.length - offline.length} of {machines.length} machines online. You have{' '}
            {available.length > 0 ? `${available.length} machine${available.length > 1 ? 's' : ''} ready to use right now.` : 'no machine free right now, but you can book a slot or join a queue.'}
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => openBooking()}>
              <CalendarPlus size={17} /> Book a machine
            </button>
            <Link className="btn btn--soft" to="/machines">
              <WashingMachine size={17} /> View live status
            </Link>
          </div>
        </div>
        <div className="hero__art">
          <WasherArt status={myRunningMachine ? 'running' : 'available'} size="lg" />
        </div>
      </section>

      <section className="stat-grid">
        <StatCard icon={CircleCheck} tone="green" label="Available now" value={available.length} sub={`${running.length} running · ${reserved.length} reserved`} />
        <StatCard
          icon={CalendarCheck}
          tone="blue"
          label="My next slot"
          value={nextBooking ? formatClock(nextBooking.startAt) : 'None'}
          sub={nextBooking ? `${dayLabel(nextBooking.startAt, now)} · ${machines.find((m) => m.id === nextBooking.machineId)?.name}` : 'Book a slot in seconds'}
        />
        <StatCard
          icon={ListOrdered}
          tone="orange"
          label="My queue spot"
          value={myQueueEntries.length ? `#${myQueueEntries[0].position}` : '—'}
          sub={myQueueEntries.length ? myQueueEntries[0].machine.name : 'Not in any queue'}
        />
        <StatCard icon={Timer} tone="violet" label="Wash time" value={formatDurationLabel(totalMinutes)} sub={`${myHistory.length} sessions logged`} />
      </section>

      {myRunningMachine ? (
        <section className="card card--live">
          <div className="card__head">
            <h3>
              <Play size={17} /> Currently using
            </h3>
            <span className="live-pill">
              <span className="live-pill__dot" /> Live
            </span>
          </div>
          <div className="live">
            <WasherArt status="running" size="lg" />
            <div className="live__info">
              <h4>{myRunningMachine.name}</h4>
              <div className="countdown countdown--lg">
                <span className="countdown__value">{formatCountdown(myRunningMachine.session.endsAt - now)}</span>
                <span className="countdown__label">{formatRemaining(myRunningMachine.session.endsAt - now)}</span>
              </div>
              <p>
                {currentUser.name} &middot; Room {currentUser.room} &middot; {currentUser.phone}
              </p>
              <div className="live__actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={() => stopCycle(myRunningMachine.id)}>
                  <Square size={14} /> End cycle
                </button>
                <a className="btn btn--soft btn--sm" href={`tel:${currentUser.phone}`}>
                  <Bell size={14} /> Notify me when done
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {dueEntry ? (
        <section className="card card--due">
          <div className="card__head">
            <h3>
              <AlertTriangle size={17} /> Start your wash now
            </h3>
            <span className="badge badge--warning">
              <span className="badge__dot" /> Awaiting start
            </span>
          </div>
          <div className="due">
            <div className="due__info">
              <h4>
                {dueEntry.machine.name} is reserved for you &middot; {formatClock(dueEntry.booking.startAt)}
              </h4>
              <p>
                You have {settings.graceMinutes} minutes from your slot time. If no motion is detected the slot is marked{' '}
                <strong>MISSED</strong> and you move to the end of the queue.
              </p>
              <div className="countdown countdown--warn">
                <span className="countdown__value">
                  {formatCountdown(dueEntry.booking.startAt + settings.graceMinutes * 60000 - now)}
                </span>
                <span className="countdown__label">left before it is marked missed</span>
              </div>
            </div>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => startNow(dueEntry.machine.id)}>
              <Play size={17} /> Start machine
            </button>
          </div>
        </section>
      ) : null}

      <section className="section">
        <SectionHead title="Machines" subtitle="Live availability, countdown and queue for every washer" to="/machines" linkLabel="All machines" />
        <div className="machine-grid">
          {machines.map((m) => (
            <MachineCard key={m.id} machine={m} />
          ))}
        </div>
      </section>

      <div className="split">
        <section className="card">
          <div className="card__head">
            <h3>
              <CalendarCheck size={17} /> My upcoming bookings
            </h3>
            <Link className="btn btn--ghost btn--xs" to="/bookings">
              Manage
            </Link>
          </div>
          {activeBookings.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="No upcoming bookings"
              message="Reserve a machine and your slot will show up here with a start countdown."
              action={
                <button type="button" className="btn btn--primary btn--sm" onClick={() => openBooking()}>
                  Book now
                </button>
              }
            />
          ) : (
            <ul className="list">
              {activeBookings.slice(0, 4).map((b) => {
                const machine = machines.find((m) => m.id === b.machineId)
                return (
                  <li key={b.id} className="list__item">
                    <span className={`list__icon list__icon--${b.status}`}>
                      <Clock size={16} />
                    </span>
                    <div className="list__body">
                      <strong>
                        {machine ? machine.name : 'Machine'} &middot; {formatClock(b.startAt)}
                      </strong>
                      <span>
                        {dayLabel(b.startAt, now)} &middot; {formatDurationLabel(b.durationMin)} &middot;{' '}
                        <em className={`tag tag--${b.status}`}>{b.status}</em>
                      </span>
                    </div>
                    <Link className="btn btn--ghost btn--xs" to={`/machines/${b.machineId}`}>
                      Open
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h3>
              <Bell size={17} /> Latest notifications
            </h3>
            <Link className="btn btn--ghost btn--xs" to="/notifications">
              See all
            </Link>
          </div>
          {myNotifications.length === 0 ? (
            <EmptyState icon={Bell} title="Nothing yet" message="Machine and booking updates will appear here." />
          ) : (
            <ul className="list">
              {myNotifications.slice(0, 4).map((n) => (
                <li key={n.id} className="list__item">
                  <span className={`list__icon list__icon--${n.type}`}>
                    {n.type === 'success' ? <CircleCheck size={16} /> : n.type === 'danger' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                  </span>
                  <div className="list__body">
                    <strong>{n.title}</strong>
                    <span>
                      {n.message} &middot; {relativeTime(n.createdAt, now)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {myQueueEntries.length ? (
        <section className="card">
          <div className="card__head">
            <h3>
              <Hourglass size={17} /> My queue positions
            </h3>
          </div>
          <ul className="queue-mini">
            {myQueueEntries.map((entry) => (
              <li key={entry.machine.id}>
                <span className="queue-mini__pos">#{entry.position}</span>
                <div>
                  <strong>{entry.machine.name}</strong>
                  <span>
                    {entry.machine.status === 'running'
                      ? `Finishes at ${formatClock(entry.machine.session.endsAt)}`
                      : `Status: ${entry.machine.status}`}
                  </span>
                </div>
                <Link className="btn btn--ghost btn--xs" to={`/machines/${entry.machine.id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card card--stats">
        <div className="card__head">
          <h3>
            <TrendingUp size={17} /> This semester
          </h3>
        </div>
        <div className="mini-stats">
          <div>
            <strong>{myHistory.filter((h) => h.status === 'completed').length}</strong>
            <span>Completed washes</span>
          </div>
          <div>
            <strong>{myHistory.filter((h) => h.status === 'missed').length}</strong>
            <span>Missed slots</span>
          </div>
          <div>
            <strong>{machines.reduce((sum, m) => sum + m.queue.length, 0)}</strong>
            <span>Students queued</span>
          </div>
          <div>
            <strong>{settings.graceMinutes} min</strong>
            <span>Grace window</span>
          </div>
        </div>
      </section>

      <BookingDialog
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        machineId={presetMachine}
        onBooked={() => toast.success('Booking added', 'Open My bookings to manage it.')}
      />
    </div>
  )
}
