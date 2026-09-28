import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, Phone, ShieldCheck, UserPlus, WashingMachine } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import { Avatar } from '../components/Avatar.jsx'

export default function Login() {
  const { currentUser, users, login, registerUser } = useWash()
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('demo')
  const [selected, setSelected] = useState('u-rahul')
  const [form, setForm] = useState({ name: '', room: '', phone: '' })
  const [error, setError] = useState('')

  if (currentUser) return <Navigate to="/dashboard" replace />

  const signIn = (userId) => {
    const user = users.find((u) => u.id === userId)
    login(userId)
    toast.success(`Welcome, ${user ? user.name.split(' ')[0] : 'student'}!`, 'You are signed in to WashTrack.')
    navigate('/dashboard', { replace: true })
  }

  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    const room = form.room.trim()
    const phone = form.phone.trim()
    if (name.length < 3) return setError('Enter your full name.')
    if (!/^\d{3,4}$/.test(room)) return setError('Enter a valid room number.')
    if (!/^\d{10}$/.test(phone)) return setError('Enter a 10 digit phone number.')
    registerUser({ name, room, phone })
    toast.success('Account created', `Welcome to the laundry room, ${name.split(' ')[0]}!`)
    navigate('/dashboard', { replace: true })
    return undefined
  }

  return (
    <div className="auth">
      <section className="auth__aside">
        <div className="auth__brand">
          <span className="brand-mark brand-mark--lg">
            <WashingMachine size={24} />
          </span>
          <div>
            <strong>WashTrack</strong>
            <span>Smart hostel laundry</span>
          </div>
        </div>
        <h2>Never wait in line again.</h2>
        <p>
          Book a machine in seconds, follow the live countdown, and get your turn automatically through the smart queue.
        </p>
        <ul className="auth__list">
          <li>
            <span>1</span> Reserve a slot, a date and a duration.
          </li>
          <li>
            <span>2</span> Walk in &mdash; motion sensor starts the machine.
          </li>
          <li>
            <span>3</span> Get a notification when your wash is done.
          </li>
        </ul>
        <div className="auth__trust">
          <ShieldCheck size={16} /> Simulated IoT demo &middot; data stored locally in your browser
        </div>
      </section>

      <section className="auth__main">
        <div className="auth__card">
          <h1>Sign in to WashTrack</h1>
          <p className="auth__sub">Hostel residents &middot; Block A laundry room</p>

          <div className="tabs">
            <button type="button" className={`tab-btn ${tab === 'demo' ? 'is-active' : ''}`} onClick={() => setTab('demo')}>
              <LogIn size={15} /> Demo student
            </button>
            <button type="button" className={`tab-btn ${tab === 'new' ? 'is-active' : ''}`} onClick={() => setTab('new')}>
              <UserPlus size={15} /> New resident
            </button>
          </div>

          {tab === 'demo' ? (
            <>
              <p className="auth__hint">Pick a demo resident to explore the app with their bookings and queue positions.</p>
              <ul className="student-list">
                {users.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={`student ${selected === user.id ? 'is-selected' : ''}`}
                      onClick={() => setSelected(user.id)}
                    >
                      <Avatar user={user} />
                      <span className="student__body">
                        <strong>{user.name}</strong>
                        <em>
                          Room {user.room} &middot; <Phone size={11} /> {user.phone}
                        </em>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn--primary btn--block" onClick={() => signIn(selected)}>
                Continue <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <form className="form" onSubmit={submit}>
              <label className="field">
                <span className="field__label">Full name</span>
                <input
                  className="input"
                  placeholder="e.g. Rahul Reddy"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <div className="form__row form__row--2">
                <label className="field">
                  <span className="field__label">Room number</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="305"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Phone</span>
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="9876543211"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
              </div>
              {error ? <p className="alert alert--danger">{error}</p> : null}
              <button type="submit" className="btn btn--primary btn--block">
                Create account <ArrowRight size={17} />
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
