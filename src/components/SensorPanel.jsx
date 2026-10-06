import { Activity, FastForward, Radio, ScanFace, Wifi, WifiOff } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { formatCountdown } from '../utils/time.js'

export default function SensorPanel({ machine }) {
  const { setMotion, setWifi, advanceClock, bookings, settings, now, backendOnline, apiBase } = useWash()
  const dueBooking = bookings.find(
    (b) => b.id === machine.reservedFor && b.status === 'due',
  )
  const graceLeft = dueBooking ? dueBooking.startAt + settings.graceMinutes * 60000 - now : null
  const backendLabel =
    backendOnline === null ? 'Connecting to backend…' : backendOnline ? 'Live data from backend' : 'Backend offline'

  return (
    <section className="card sensor-panel">
      <header className="card__head">
        <h3>
          <Radio size={17} /> Sensor &amp; connectivity
        </h3>
        <span className="card__hint">{backendLabel}</span>
      </header>

      <div className="sensor-grid">
        <div className={`sensor-tile ${machine.motionSensor ? 'is-ok' : 'is-bad'}`}>
          <span className="sensor-tile__icon">
            <ScanFace size={18} />
          </span>
          <div>
            <strong>Motion sensor</strong>
            <span>{machine.motionSensor ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className={`sensor-tile ${machine.motionSensor && machine.motion === 'detected' ? 'is-ok' : 'is-idle'}`}>
          <span className="sensor-tile__icon">
            <Activity size={18} />
          </span>
          <div>
            <strong>Motion</strong>
            <span>{machine.motionSensor ? (machine.motion === 'detected' ? 'Detected' : 'No motion') : 'Sensor offline'}</span>
          </div>
        </div>

        <div className={`sensor-tile ${machine.wifi ? 'is-ok' : 'is-bad'}`}>
          <span className="sensor-tile__icon">{machine.wifi ? <Wifi size={18} /> : <WifiOff size={18} />}</span>
          <div>
            <strong>Wi-Fi</strong>
            <span>{machine.wifi ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className={`sensor-tile ${machine.status === 'running' ? 'is-ok' : 'is-idle'}`}>
          <span className="sensor-tile__icon">
            <Radio size={18} />
          </span>
          <div>
            <strong>Machine</strong>
            <span>{machine.status === 'running' ? 'Running' : 'Available'}</span>
          </div>
        </div>
      </div>

      {dueBooking && graceLeft > 0 ? (
        <div className="sensor-window">
          <span className="sensor-window__label">Start window</span>
          <strong>{formatCountdown(graceLeft)}</strong>
          <span>left to start, otherwise the slot is marked MISSED</span>
        </div>
      ) : null}

      <div className="sensor-actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setMotion(machine.id, 'detected')}>
          <ScanFace size={15} /> Test: send &quot;detected&quot;
        </button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setMotion(machine.id, 'none')}>
          Test: send &quot;none&quot;
        </button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setWifi(machine.id, false)}>
          <WifiOff size={15} /> Wi-Fi Disconnect
        </button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setWifi(machine.id, true)}>
          <Wifi size={15} /> Wi-Fi Connect
        </button>
      </div>

      <p className="card__foot-note">
        <Radio size={14} /> Dev test button: sends a real POST to {apiBase}/api/sensor/motion for {machine.id}, exactly like the
        ESP32 does.
      </p>

      <div className="sensor-demo">
        <FastForward size={15} />
        <span>Demo clock</span>
        <button type="button" className="btn btn--ghost btn--xs" onClick={() => advanceClock(5)}>
          +5 min
        </button>
        <button type="button" className="btn btn--ghost btn--xs" onClick={() => advanceClock(10)}>
          +10 min
        </button>
        <button type="button" className="btn btn--ghost btn--xs" onClick={() => advanceClock(60)}>
          +1 hr
        </button>
      </div>
    </section>
  )
}
