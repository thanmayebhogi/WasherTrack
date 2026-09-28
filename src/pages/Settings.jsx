import { useState } from 'react'
import { FastForward, RotateCcw, Save, ScanFace, Settings as Cog, Wifi, WifiOff } from 'lucide-react'
import { useWash } from '../context/washStore.js'
import { useToast } from '../context/toastStore.js'
import { CYCLE_PRESETS } from '../data/seed.js'

function Switch({ checked, onChange, label, hint }) {
  return (
    <button type="button" className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="switch__track">
        <span className="switch__thumb" />
      </span>
      <span className="switch__body">
        <strong>{label}</strong>
        {hint ? <em>{hint}</em> : null}
      </span>
    </button>
  )
}

export default function Settings() {
  const { settings, machines, updateSettings, setWifi, setSensor, advanceClock, resetData, clockOffset } = useWash()
  const toast = useToast()
  const [draft, setDraft] = useState({
    defaultDuration: settings.defaultDuration,
    maxDuration: settings.maxDuration,
    graceMinutes: settings.graceMinutes,
  })

  const save = (e) => {
    e.preventDefault()
    updateSettings({
      defaultDuration: Number(draft.defaultDuration),
      maxDuration: Number(draft.maxDuration),
      graceMinutes: Number(draft.graceMinutes),
    })
    toast.success('Settings saved', 'Your laundry preferences were updated.')
  }

  return (
    <div className="stack">
      <form className="card" onSubmit={save}>
        <div className="card__head">
          <h3>
            <Cog size={17} /> Wash preferences
          </h3>
          <span className="card__hint">Applies to new bookings</span>
        </div>

        <div className="field">
          <span className="field__label">Default cycle length</span>
          <div className="preset-grid">
            {CYCLE_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                className={`preset ${Number(draft.defaultDuration) === preset.minutes ? 'is-active' : ''}`}
                onClick={() => setDraft({ ...draft, defaultDuration: preset.minutes })}
              >
                <strong>{preset.minutes} min</strong>
                <span>{preset.label}</span>
                <em>{preset.hint}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="form__row form__row--2">
          <label className="field">
            <span className="field__label">Maximum bookable duration (min)</span>
            <input
              className="input"
              type="number"
              min="30"
              max="180"
              step="5"
              value={draft.maxDuration}
              onChange={(e) => setDraft({ ...draft, maxDuration: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Missed booking grace window (min)</span>
            <input
              className="input"
              type="number"
              min="2"
              max="30"
              step="1"
              value={draft.graceMinutes}
              onChange={(e) => setDraft({ ...draft, graceMinutes: e.target.value })}
            />
          </label>
        </div>

        <div className="switch-list">
          <Switch
            checked={settings.wifiRequired}
            onChange={(v) => updateSettings({ wifiRequired: v })}
            label="Require Wi-Fi to start a cycle"
            hint="Machines without Wi-Fi can only be started locally"
          />
          <Switch
            checked={settings.notificationsEnabled}
            onChange={(v) => updateSettings({ notificationsEnabled: v })}
            label="Push notifications"
            hint="Booking reminders, missed slots and finished cycles"
          />
          <Switch
            checked={settings.alertsEnabled}
            onChange={(v) => updateSettings({ alertsEnabled: v })}
            label="Queue alerts"
            hint="Tell me when my turn is coming up"
          />
        </div>

        <button type="submit" className="btn btn--primary">
          <Save size={16} /> Save preferences
        </button>
      </form>

      <section className="card">
        <div className="card__head">
          <h3>
            <ScanFace size={17} /> Hardware simulation
          </h3>
          <span className="card__hint">Frontend only &middot; no real sensors</span>
        </div>
        <ul className="hardware-list">
          {machines.map((m) => (
            <li key={m.id} className="hardware">
              <div className="hardware__id">
                <strong>{m.name}</strong>
                <span>
                  {m.code} &middot; {m.status}
                </span>
              </div>
              <div className="hardware__actions">
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setWifi(m.id, !m.wifi)}>
                  {m.wifi ? <WifiOff size={14} /> : <Wifi size={14} />}
                  {m.wifi ? 'Disconnect Wi-Fi' : 'Connect Wi-Fi'}
                </button>
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setSensor(m.id, !m.motionSensor)}>
                  <ScanFace size={14} />
                  {m.motionSensor ? 'Disable sensor' : 'Enable sensor'}
                </button>
                <span className={`chip ${m.wifi ? 'chip--ok' : 'chip--bad'}`}>
                  <span className="chip__dot" /> {m.wifi ? 'Online' : 'Offline'}
                </span>
                <span className={`chip ${m.motionSensor ? 'chip--ok' : 'chip--bad'}`}>
                  <span className="chip__dot" /> Sensor {m.motionSensor ? 'on' : 'off'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card__head">
          <h3>
            <FastForward size={17} /> Demo tools
          </h3>
          <span className="card__hint">Offset {Math.round((clockOffset || 0) / 60000)} min</span>
        </div>
        <p className="card__text">
          The whole app runs on a simulated clock. Jump ahead to test the 10 minute grace window, missed bookings and queue
          promotion without waiting in real time.
        </p>
        <div className="sensor-actions">
          <button type="button" className="btn btn--soft btn--sm" onClick={() => advanceClock(5)}>
            <FastForward size={15} /> +5 min
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => advanceClock(10)}>
            <FastForward size={15} /> +10 min
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => advanceClock(60)}>
            <FastForward size={15} /> +1 hour
          </button>
        </div>
        <button type="button" className="btn btn--danger" onClick={resetData}>
          <RotateCcw size={16} /> Reset demo data
        </button>
      </section>
    </div>
  )
}
