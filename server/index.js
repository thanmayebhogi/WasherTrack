import cors from 'cors'
import 'dotenv/config'
import express from 'express'

// Render assigns the port through process.env.PORT; 4000 is only the local default.
const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST || '0.0.0.0'

/*
 * CORS: CORS_ORIGIN may hold one origin or a comma-separated list, e.g.
 *   CORS_ORIGIN=https://washertrack-frontend.onrender.com
 * Leave it empty to reflect any origin (handy for first deploys and local dev).
 * The ESP32 sends no Origin header, so it is unaffected either way.
 */
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = express()

app.use(express.json())
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)

const now = () => new Date().toISOString()
const log = (...args) => console.log(`[${now()}]`, ...args)

/*
 * In-memory machine store (no database).
 * The ESP32 POSTs motion changes; the frontend polls GET /api/machines.
 * Restarting the server resets every machine to "none".
 */
const machines = [
  { id: 'm1', name: 'Machine 1', motion: 'none', lastMotionAt: null, updatedAt: now() },
  { id: 'm2', name: 'Machine 2', motion: 'none', lastMotionAt: null, updatedAt: now() },
  { id: 'm3', name: 'Machine 3', motion: 'none', lastMotionAt: null, updatedAt: now() },
]

const MOTION_VALUES = ['detected', 'none']
const findMachine = (id) => machines.find((m) => m.id === id)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptimeSec: Math.round(process.uptime()), machines: machines.length })
})

app.get('/api/machines', (_req, res) => {
  res.json(machines)
})

app.post('/api/sensor/motion', (req, res) => {
  const body = req.body || {}
  const { machineId, motion } = body

  if (typeof machineId !== 'string' || !machineId.trim()) {
    return res.status(400).json({ ok: false, error: 'machineId is required, e.g. "m1".' })
  }
  if (!MOTION_VALUES.includes(motion)) {
    return res.status(400).json({ ok: false, error: 'motion must be "detected" or "none".' })
  }

  const machine = findMachine(machineId.trim())
  if (!machine) {
    return res.status(404).json({ ok: false, error: `Unknown machineId "${machineId}". Use one of: m1, m2, m3.` })
  }

  const previous = machine.motion
  machine.motion = motion
  if (motion === 'detected') machine.lastMotionAt = new Date().toISOString()
  machine.updatedAt = now()

  log(`motion ${previous} -> ${motion} (${machine.id} / ${machine.name})`)
  return res.json({ ok: true, machine })
})

app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.originalUrl}` })
})

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Body must be valid JSON.' })
  }
  log('ERROR', err.message)
  res.status(500).json({ ok: false, error: 'Internal server error.' })
})

app.listen(PORT, HOST, () => {
  log(`WashTrack backend listening on ${HOST}:${PORT}`)
  log(allowedOrigins.length ? `CORS allowed origins: ${allowedOrigins.join(', ')}` : 'CORS: any browser origin allowed')
  log('Endpoints:')
  log('  POST /api/sensor/motion  { "machineId": "m1", "motion": "detected" }')
  log('  GET  /api/machines')
  log('  GET  /api/health')
})
