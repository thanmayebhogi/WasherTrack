import { useState } from 'react'
import { CalendarPlus, Search, WashingMachine } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import MachineCard from '../components/MachineCard.jsx'
import BookingDialog from '../components/BookingDialog.jsx'

const FILTERS = ['all', 'available', 'running', 'reserved', 'offline']

export default function Machines() {
  const { machines } = useWash()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [preset, setPreset] = useState(null)

  const visible = machines.filter(
    (m) =>
      (filter === 'all' || m.status === filter) &&
      m.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="stack">
      <section className="card card--toolbar">
        <div className="toolbar">
          <div className="segmented">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`segmented__btn ${filter === f ? 'is-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
                <span className="segmented__count">{f === 'all' ? machines.length : machines.filter((m) => m.status === f).length}</span>
              </button>
            ))}
          </div>
          <div className="toolbar__right">
            <label className="search">
              <Search size={16} />
              <input className="input input--ghost" placeholder="Search machine" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setPreset(null)
                setBookingOpen(true)
              }}
            >
              <CalendarPlus size={16} /> Book
            </button>
          </div>
        </div>
      </section>

      {visible.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state__icon">
              <WashingMachine size={26} />
            </span>
            <h3>No machines match</h3>
            <p>Try another status filter or search term.</p>
          </div>
        </div>
      ) : (
        <div className="machine-grid machine-grid--wide">
          {visible.map((m) => (
            <MachineCard key={m.id} machine={m} />
          ))}
        </div>
      )}

      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} machineId={preset} />
    </div>
  )
}
