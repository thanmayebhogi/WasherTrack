import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'
import { useWash } from '../context/washStore.js'
import { CYCLE_PRESETS } from '../data/seed.js'
import { addDays, dateKey, formatClock, timeKey } from '../utils/time.js'

const buildSlots = (now) => {
  const slots = []
  const base = new Date(now)
  base.setMinutes(0, 0, 0)
  for (let i = 1; i <= 22; i += 1) {
    const t = new Date(base.getTime() + i * 30 * 60000)
    slots.push(timeKey(t.getTime()))
  }
  return slots
}

export default function BookingDialog({ open, onClose, machineId: presetMachine, onBooked }) {
  const { machines, bookings, createBooking, settings, now, currentUserId, myReservedMachines } = useWash()
  const bookableMachines = machines.filter((m) => m.status !== 'offline')
  const [machineId, setMachineId] = useState(presetMachine || bookableMachines[0]?.id || '')
  const [date, setDate] = useState(() => dateKey(Date.now()))
  const [time, setTime] = useState(() => timeKey(Math.ceil((Date.now() + 15 * 60000) / (30 * 60000)) * 30 * 60000))
  const [durationMin, setDurationMin] = useState(settings.defaultDuration)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (presetMachine) setMachineId(presetMachine)
  }, [presetMachine, open])

  useEffect(() => {
    if (!open) {
      setError('')
      setResult(null)
      setSubmitting(false)
    }
  }, [open])

  const slots = useMemo(() => buildSlots(Date.now()), [open])

  const dayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.machineId === machineId && b.date === date && ['scheduled', 'due', 'started'].includes(b.status))
        .sort((a, b) => a.startAt - b.startAt),
    [bookings, machineId, date],
  )

  const machine = machines.find((m) => m.id === machineId)
  const startAt = useMemo(() => new Date(`${date}T${time}`).getTime(), [date, time])
  const endAt = startAt + Number(durationMin) * 60000
  const clash = dayBookings.find((b) => b.startAt < endAt && startAt < b.endAt)
  const alreadyBooked = bookings.some(
    (b) => b.userId === currentUserId && b.machineId === machineId && ['scheduled', 'due', 'started'].includes(b.status),
  )
  const reservedForMe = myReservedMachines.some((entry) => entry.machine.id === machineId)

  const submit = (e) => {
    e.preventDefault()
    setSubmitting(true)
    const res = createBooking({ machineId, date, time, durationMin: Number(durationMin) })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setResult(res.booking)
    if (onBooked) onBooked(res.booking)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule a wash"
      subtitle="Pick a machine, date, time and cycle length. Overlapping slots are blocked automatically."
      footer={
        result ? (
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
            <button type="submit" form="booking-form" className="btn btn--primary" disabled={submitting || !!clash || alreadyBooked}>
              {submitting ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              Confirm booking
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="booking-success">
          <span className="booking-success__icon">
            <CheckCircle2 size={28} />
          </span>
          <h3>Slot confirmed</h3>
          <p>
            {machine.name} is reserved for you on <strong>{date}</strong> at <strong>{formatClock(result.startAt)}</strong> for{' '}
            <strong>{durationMin} minutes</strong>.
          </p>
          <p className="booking-success__note">
            <AlertTriangle size={15} /> You have {settings.graceMinutes} minutes from the start time to press start. After that the
            slot is marked MISSED and you move to the end of the queue.
          </p>
        </div>
      ) : (
        <form id="booking-form" className="form" onSubmit={submit}>
          <div className="form__row">
            <label className="field">
              <span className="field__label">Washing machine</span>
              <select className="input" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                {bookableMachines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} &middot; {m.code} ({m.status})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form__row form__row--2">
            <label className="field">
              <span className="field__label">Date</span>
              <input
                className="input"
                type="date"
                value={date}
                min={dateKey(Date.now())}
                max={dateKey(addDays(Date.now(), 7))}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">Start time</span>
              <select className="input" value={time} onChange={(e) => setTime(e.target.value)}>
                {slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatClock(new Date(`${date}T${slot}`).getTime())}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form__row form__row--quick">
            {[0, 1, 2].map((d) => {
              const value = dateKey(addDays(Date.now(), d))
              return (
                <button
                  key={d}
                  type="button"
                  className={`chip-btn ${date === value ? 'is-active' : ''}`}
                  onClick={() => setDate(value)}
                >
                  {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : 'In 2 days'}
                </button>
              )
            })}
          </div>

          <div className="field">
            <span className="field__label">Cycle duration</span>
            <div className="preset-grid">
              {CYCLE_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  className={`preset ${Number(durationMin) === preset.minutes ? 'is-active' : ''}`}
                  onClick={() => setDurationMin(preset.minutes)}
                >
                  <strong>{preset.minutes} min</strong>
                  <span>{preset.label}</span>
                  <em>{preset.hint}</em>
                </button>
              ))}
            </div>
            <div className="range-row">
              <input
                className="range"
                type="range"
                min="15"
                max={settings.maxDuration}
                step="5"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
              <span className="range-row__value">{durationMin} min</span>
            </div>
          </div>

          <div className="summary">
            <div className="summary__row">
              <CalendarClock size={15} />
              <span>
                {machine ? machine.name : 'Machine'} &middot; {date} at {formatClock(startAt)}
              </span>
            </div>
            <div className="summary__row">
              <Clock size={15} />
              <span>
                {formatClock(startAt)} &rarr; {formatClock(endAt)} ({durationMin} min)
              </span>
            </div>
          </div>

          {alreadyBooked || reservedForMe ? (
            <p className="alert alert--warning">
              <AlertTriangle size={16} /> You already hold a slot on {machine ? machine.name : 'this machine'}. Cancel it first to
              book again.
            </p>
          ) : null}

          {clash ? (
            <p className="alert alert--danger">
              <AlertTriangle size={16} /> This slot overlaps an existing booking ({formatClock(clash.startAt)} &ndash;{' '}
              {formatClock(clash.endAt)}). Choose another time to avoid an overlap.
            </p>
          ) : null}

          {error ? <p className="alert alert--danger">{error}</p> : null}

          {dayBookings.length > 0 ? (
            <div className="day-plan">
              <span className="day-plan__label">Booked on {machine ? machine.name : 'this machine'} for {date}</span>
              <ul>
                {dayBookings.map((b) => (
                  <li key={b.id}>
                    <span>
                      {formatClock(b.startAt)} &ndash; {formatClock(b.endAt)}
                    </span>
                    <span className="day-plan__tag">{b.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="form__note">Slots are checked against every active booking to prevent overlaps. Demo clock offset: {Math.round((now - Date.now()) / 60000)} min.</p>
        </form>
      )}
    </Modal>
  )
}
