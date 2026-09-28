export const pad2 = (n) => String(n).padStart(2, '0')

export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const dateKey = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export const timeKey = (ts) => {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export const minutesOfDay = (hhmm) => {
  const [h, m] = String(hhmm).split(':')
  return Number(h) * 60 + Number(m || 0)
}

export const combineDateTime = (dateKeyStr, hhmm) => {
  const [y, mo, d] = String(dateKeyStr).split('-').map(Number)
  return new Date(y, mo - 1, d, 0, 0, 0, 0).getTime() + minutesOfDay(hhmm) * 60000
}

export const addDays = (ts, days) => {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), 0, 0).getTime()
}

export const startOfDay = (ts) => {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime()
}

export const formatClock = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export const formatClockWithSeconds = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

export const formatDateLong = (ts) =>
  new Date(ts).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })

export const formatDateFull = (ts) =>
  new Date(ts).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const dayLabel = (ts, now) => {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatDateLong(ts)
}

/** mm:ss for under an hour, h:mm:ss above it */
export const formatCountdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
}

export const formatRemaining = (ms) => {
  const mins = Math.ceil(Math.max(0, ms) / 60000)
  if (mins < 60) return `${mins} min left`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} hr left` : `${h} hr ${m} min left`
}

export const formatDurationLabel = (minutes) => {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

export const relativeTime = (ts, now) => {
  const diff = Math.round((now - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
