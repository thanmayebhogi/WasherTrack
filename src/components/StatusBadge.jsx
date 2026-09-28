const LABELS = {
  available: 'Available',
  running: 'Running',
  reserved: 'Reserved',
  offline: 'Offline',
}

const TONES = {
  available: 'success',
  running: 'info',
  reserved: 'warning',
  offline: 'muted',
}

export default function StatusBadge({ status, size = 'md', pulse = false }) {
  return (
    <span className={`badge badge--${TONES[status] || 'muted'} badge--${size}`}>
      <span className={`badge__dot ${pulse && status === 'running' ? 'is-pulsing' : ''}`} />
      {LABELS[status] || status}
    </span>
  )
}
