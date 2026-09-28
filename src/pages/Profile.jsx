import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ListOrdered,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Save,
  Timer,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import { Avatar } from '../components/Avatar.jsx'
import { formatDurationLabel } from '../utils/time.js'

export default function Profile() {
  const { currentUser, users, myHistory, activeBookings, myQueueEntries, updateUser, logout } = useWash()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: currentUser.name,
    room: currentUser.room,
    phone: currentUser.phone,
  })
  const [error, setError] = useState('')

  const startEdit = () => {
    setForm({ name: currentUser.name, room: currentUser.room, phone: currentUser.phone })
    setError('')
    setEditing(true)
  }

  const save = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    const room = form.room.trim()
    const phone = form.phone.trim()
    if (name.length < 3) return setError('Enter your full name.')
    if (!/^\d{3,4}$/.test(room)) return setError('Room number must be 3 or 4 digits.')
    if (!/^\d{10}$/.test(phone)) return setError('Phone number must be 10 digits.')
    updateUser({ name, room, phone })
    setEditing(false)
    setError('')
    return undefined
  }

  const completed = myHistory.filter((h) => h.status === 'completed')
  const totalMinutes = completed.reduce((sum, h) => sum + (h.durationMin || 0), 0)
  const missed = myHistory.filter((h) => h.status === 'missed').length

  return (
    <div className="stack">
      <section className="card card--profile">
        <div className="profile-head">
          <Avatar user={currentUser} size="xl" />
          <div className="profile-head__body">
            <h2>{currentUser.name}</h2>
            <p>
              Room {currentUser.room} &middot; {currentUser.phone}
            </p>
            <div className="profile-head__chips">
              <span className="chip chip--ok">
                <Phone size={13} /> {currentUser.phone}
              </span>
              <span className="chip chip--muted">
                <UserRound size={13} /> Resident
              </span>
            </div>
          </div>
          {!editing ? (
            <button type="button" className="btn btn--soft btn--sm" onClick={startEdit}>
              <Pencil size={15} /> Edit details
            </button>
          ) : null}
        </div>

        {editing ? (
          <form className="form form--inline" onSubmit={save}>
            <label className="field">
              <span className="field__label">Full name</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span className="field__label">Room number</span>
              <input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </label>
            <label className="field">
              <span className="field__label">Phone number</span>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            {error ? <p className="alert alert--danger">{error}</p> : null}
            <div className="form__buttons">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary btn--sm">
                <Save size={15} /> Save changes
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="stat-grid stat-grid--3">
        <div className="stat stat--green">
          <span className="stat__icon">
            <CheckCircle2 size={19} />
          </span>
          <div className="stat__body">
            <span className="stat__label">Washes completed</span>
            <strong className="stat__value">{completed.length}</strong>
            <span className="stat__sub">{formatDurationLabel(totalMinutes)} total</span>
          </div>
        </div>
        <div className="stat stat--blue">
          <span className="stat__icon">
            <Timer size={19} />
          </span>
          <div className="stat__body">
            <span className="stat__label">Active bookings</span>
            <strong className="stat__value">{activeBookings.length}</strong>
            <span className="stat__sub">Scheduled, due or running</span>
          </div>
        </div>
        <div className="stat stat--orange">
          <span className="stat__icon">
            <XCircle size={19} />
          </span>
          <div className="stat__body">
            <span className="stat__label">Missed slots</span>
            <strong className="stat__value">{missed}</strong>
            <span className="stat__sub">Start within the grace window</span>
          </div>
        </div>
      </section>

      <div className="split">
        <section className="card">
          <div className="card__head">
            <h3>
              <Phone size={17} /> Contact
            </h3>
          </div>
          <ul className="detail-list">
            <li>
              <span>Name</span>
              <strong>{currentUser.name}</strong>
            </li>
            <li>
              <span>Room</span>
              <strong>{currentUser.room}</strong>
            </li>
            <li>
              <span>Phone</span>
              <strong>{currentUser.phone}</strong>
            </li>
            <li>
              <span>Laundry room</span>
              <strong>Block A &middot; Ground floor</strong>
            </li>
          </ul>
          <a className="btn btn--primary btn--block" href={`tel:${currentUser.phone}`}>
            <Phone size={16} /> Call my own number
          </a>
        </section>

        <section className="card">
          <div className="card__head">
            <h3>
              <ListOrdered size={17} /> My queue positions
            </h3>
            <Link className="btn btn--ghost btn--xs" to="/bookings">
              Bookings
            </Link>
          </div>
          {myQueueEntries.length === 0 ? (
            <p className="card__empty">You are not waiting in any queue right now.</p>
          ) : (
            <ul className="detail-list">
              {myQueueEntries.map((entry) => (
                <li key={entry.machine.id}>
                  <span>{entry.machine.name}</span>
                  <strong>Position #{entry.position}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card__head">
          <h3>
            <UserRound size={17} /> Switch demo resident
          </h3>
          <span className="card__hint">Quick testing</span>
        </div>
        <ul className="student-list student-list--row">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className={`student ${user.id === currentUser.id ? 'is-selected' : ''}`}
                onClick={() => {
                  if (user.id === currentUser.id) return
                  logout()
                  toast.info('Signed out', `Sign in as ${user.name} to see their bookings.`)
                }}
              >
                <Avatar user={user} size="sm" />
                <span className="student__body">
                  <strong>{user.name}</strong>
                  <em>Room {user.room}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="card__foot-note">
          <Mail size={14} /> Signing out lets you explore the app from another resident&apos;s perspective. Demo data stays in
          your browser.
        </p>
      </section>

      <button
        type="button"
        className="btn btn--outline btn--block"
        onClick={() => {
          logout()
          toast.info('Signed out', 'See you at the laundry room.')
        }}
      >
        <LogOut size={16} /> Sign out of WashTrack
      </button>
    </div>
  )
}
