import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CheckCircle2, History as HistoryIcon, Search, TrendingUp, XCircle, Zap } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import EmptyState from '../components/EmptyState.jsx'
import { dayLabel, formatClock, formatDateLong, formatDurationLabel } from '../utils/time.js'

const RANGES = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: 'all', label: 'All time' },
]

export default function HistoryPage() {
  const { myHistory, machines, now } = useWash()
  const [range, setRange] = useState('all')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(() => {
    const limit = range === 'all' ? Infinity : Number(range) * 86400000
    return myHistory
      .filter((h) => now - h.startedAt <= limit)
      .filter((h) => (status === 'all' ? true : h.status === status))
      .filter((h) => {
        const m = machines.find((x) => x.id === h.machineId)
        return m ? m.name.toLowerCase().includes(query.trim().toLowerCase()) : false
      })
  }, [myHistory, range, status, query, machines, now])

  const completed = myHistory.filter((h) => h.status === 'completed')
  const missed = myHistory.filter((h) => h.status === 'missed')
  const totalMinutes = completed.reduce((sum, h) => sum + (h.durationMin || 0), 0)
  const successRate = myHistory.length ? Math.round((completed.length / myHistory.length) * 100) : 0
  const favourite = useMemo(() => {
    const counts = {}
    completed.forEach((h) => {
      counts[h.machineId] = (counts[h.machineId] || 0) + 1
    })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? machines.find((m) => m.id === top[0]) : null
  }, [completed, machines])

  const machineName = (id) => {
    const m = machines.find((x) => x.id === id)
    return m ? m.name : 'Machine'
  }

  return (
    <div className="stack">
      <section className="stat-grid stat-grid--3">
        <div className="stat stat--blue">
          <span className="stat__icon">
            <CheckCircle2 size={19} />
          </span>
          <div className="stat__body">
            <span className="stat__label">Completed washes</span>
            <strong className="stat__value">{completed.length}</strong>
            <span className="stat__sub">{formatDurationLabel(totalMinutes)} of machine time</span>
          </div>
        </div>
        <div className="stat stat--orange">
          <span className="stat__icon">
            <XCircle size={19} />
          </span>
          <div className="stat__body">
            <span className="stat__label">Missed slots</span>
            <strong className="stat__value">{missed.length}</strong>
            <span className="stat__sub">No motion detected</span>
          </div>
        </div>
        <div className="stat stat--green">
          <span className="stat__icon">
            <TrendingUp size={19} />
          </span>
          <div className="stat__body">
            <span className="stat__label">Success rate</span>
            <strong className="stat__value">{successRate}%</strong>
            <span className="stat__sub">{favourite ? `Favourite: ${favourite.name}` : 'No favourite yet'}</span>
          </div>
        </div>
      </section>

      <section className="card card--toolbar">
        <div className="toolbar">
          <div className="segmented">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`segmented__btn ${range === r.key ? 'is-active' : ''}`}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="toolbar__right">
            <div className="segmented segmented--soft">
              {['all', 'completed', 'missed', 'cancelled'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`segmented__btn ${status === s ? 'is-active' : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={16} />
              <input
                className="input input--ghost"
                placeholder="Search machine"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={HistoryIcon}
            title="No history yet"
            message="Completed, missed and cancelled washes will appear here once you use the machines."
            action={
              <Link className="btn btn--primary btn--sm" to="/machines">
                Go to machines
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card">
          <ul className="list list--rows">
            {filtered.map((h) => (
              <li key={h.id} className="list__item list__item--rich">
                <span
                  className={`list__icon list__icon--${h.status === 'completed' ? 'success' : h.status === 'missed' ? 'danger' : 'muted'}`}
                >
                  {h.status === 'completed' ? <CheckCircle2 size={16} /> : h.status === 'missed' ? <XCircle size={16} /> : <CalendarClock size={16} />}
                </span>
                <div className="list__body">
                  <strong>{machineName(h.machineId)}</strong>
                  <span>
                    {formatDateLong(h.startedAt)} &middot; {dayLabel(h.startedAt, now)} &middot; {formatClock(h.startedAt)}
                    {h.status === 'completed' ? ` &rarr; ${formatClock(h.endedAt)}` : ''} &middot; {formatDurationLabel(h.durationMin)}
                  </span>
                </div>
                <span className={`tag tag--${h.status}`}>{h.status}</span>
                <Link className="btn btn--ghost btn--xs" to={`/machines/${h.machineId}`}>
                  <Zap size={14} /> Machine
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
