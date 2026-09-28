import { createContext, useContext } from 'react'
import { createSeed } from '../data/seed.js'
import { dateKey, timeKey, uid } from '../utils/time.js'

export const STORAGE_KEY = 'washtrack:state:v1'
export const ACTIVE_BOOKING_STATES = ['scheduled', 'due', 'started']
export const OVERLAPABLE_STATES = ['scheduled', 'due', 'started']

export const WashContext = createContext(null)

export function useWash() {
  const ctx = useContext(WashContext)
  if (!ctx) throw new Error('useWash() must be used inside <WashProvider>')
  return ctx
}

const DEFAULT_SETTINGS = {
  defaultDuration: 30,
  maxDuration: 90,
  graceMinutes: 10,
  wifiRequired: true,
  notificationsEnabled: true,
  alertsEnabled: true,
}

export const loadState = () => {
  if (typeof window === 'undefined') return createSeed()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.machines) || parsed.machines.length === 0) {
      return createSeed()
    }
    return { ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } }
  } catch {
    return createSeed()
  }
}

export const saveState = (state) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable — app keeps working in memory */
  }
}

export const clearStoredState = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export const getUser = (state, id) => state.users.find((u) => u.id === id) || null
export const getMachine = (state, id) => state.machines.find((m) => m.id === id) || null
export const userName = (state, id) => getUser(state, id)?.name || 'Unknown student'

const cloneState = (s) => ({
  ...s,
  machines: s.machines.map((m) => ({ ...m, queue: [...m.queue] })),
  bookings: s.bookings.map((b) => ({ ...b })),
  history: [...s.history],
  notifications: [...s.notifications],
  settings: { ...s.settings },
})

/**
 * Deterministic-ish simulation engine. Runs on every dispatch and on every
 * 1 second tick: finishes cycles, opens/expires reservation windows and
 * promotes the per-machine waiting queue.
 * Returns the same state object when nothing happened (avoids needless renders).
 */
export function runEngine(inputState, now) {
  const s = cloneState(inputState)
  let touched = false

  const graceMinutes = Math.max(1, inputState.settings.graceMinutes)
  const grace = graceMinutes * 60000
  const findMachine = (id) => s.machines.find((m) => m.id === id)
  const findBooking = (id) => s.bookings.find((b) => b.id === id)

  const notify = (userId, title, message, type = 'info') => {
    s.notifications.unshift({
      id: uid('nt'),
      userId,
      title,
      message,
      type,
      createdAt: now,
      read: false,
    })
    touched = true
  }

  const pushHistory = (entry) => {
    s.history.unshift(entry)
    touched = true
  }

  const startCycle = (m, b, userId) => {
    const durationMin = b ? b.durationMin : inputState.settings.defaultDuration
    m.status = 'running'
    m.motion = 'detected'
    m.lastMotionAt = now
    m.reservedFor = null
    m.session = {
      userId,
      bookingId: b ? b.id : null,
      startedAt: now,
      endsAt: now + durationMin * 60000,
      durationMin,
    }
    if (b) {
      b.status = 'started'
      b.startedAt = now
      notify(userId, 'Machine started', `${m.name} is running for ${durationMin} minutes. You will be notified when it finishes.`, 'success')
    }
    touched = true
  }

  const finishCycle = (m) => {
    const ses = m.session
    if (!ses) return
    const booking = ses.bookingId ? findBooking(ses.bookingId) : null
    if (booking) {
      booking.status = 'completed'
      booking.endedAt = now
    }
    pushHistory({
      id: uid('hs'),
      userId: ses.userId,
      machineId: m.id,
      startedAt: ses.startedAt,
      endedAt: now,
      durationMin: Math.max(1, Math.round((now - ses.startedAt) / 60000)),
      status: 'completed',
      source: booking ? booking.source : 'walkup',
    })
    notify(
      ses.userId,
      'Wash cycle finished',
      `${m.name} has finished its cycle. The door is unlocked, please collect your clothes.`,
      'success',
    )
    m.status = 'available'
    m.session = null
    m.motion = 'none'
    m.lastMotionAt = null
    touched = true
  }

  const markMissed = (b, m) => {
    b.status = 'missed'
    b.missedAt = now
    pushHistory({
      id: uid('hs'),
      userId: b.userId,
      machineId: m.id,
      startedAt: b.startAt,
      endedAt: now,
      durationMin: 0,
      status: 'missed',
      source: b.source,
    })
    notify(
      b.userId,
      'Booking missed',
      `No motion was detected on ${m.name} within ${graceMinutes} minutes, so the slot was marked MISSED. You have been moved to the END of the ${m.name} queue.`,
      'danger',
    )
    if (m.reservedFor === b.id) m.reservedFor = null
    if (!m.session && m.status !== 'offline') m.status = 'available'
    m.queue = m.queue.filter((id) => id !== b.userId)
    m.queue.push(b.userId)
    touched = true
  }

  // 1. finish running cycles
  for (const m of s.machines) {
    if (m.status === 'running' && m.session && m.session.endsAt <= now) finishCycle(m)
  }

  // 2. reservation windows, motion start, missed slots
  for (const b of s.bookings) {
    if (b.status !== 'scheduled' && b.status !== 'due') continue
    const m = findMachine(b.machineId)
    if (!m || m.status === 'offline') continue
    if (m.status === 'running' && m.session && m.session.bookingId === b.id) continue

    const deadline = b.startAt + grace
    const canStart = m.motion === 'detected' && m.motionSensor && !m.session
    const canReserve = b.status === 'due' || (b.status === 'scheduled' && m.status === 'available' && !m.reservedFor && b.startAt <= now)

    if (canReserve) {
      if (b.status === 'scheduled') {
        b.status = 'due'
        m.status = 'reserved'
        m.reservedFor = b.id
        notify(
          b.userId,
          'Your slot has started',
          `${m.name} is reserved for you. Start the machine within ${graceMinutes} minutes, otherwise the slot is marked MISSED.`,
          'warning',
        )
        touched = true
      }
      if (canStart) startCycle(m, b, b.userId)
      else if (now > deadline) markMissed(b, m)
    } else if (now > deadline) {
      markMissed(b, m)
    }
  }

  // 3. promote the per-machine waiting queue when a machine frees up
  for (const m of s.machines) {
    if (m.status === 'offline' || m.status !== 'available' || m.session || m.reservedFor) continue
    if (!m.queue.length) continue
    const nextUserId = m.queue[0]
    m.queue = m.queue.slice(1)
    const durationMin = inputState.settings.defaultDuration
    const booking = {
      id: uid('bk'),
      userId: nextUserId,
      machineId: m.id,
      date: dateKey(now),
      startTime: timeKey(now),
      durationMin,
      startAt: now,
      endAt: now + durationMin * 60000,
      status: 'due',
      source: 'queue',
      createdAt: now,
    }
    s.bookings.push(booking)
    m.status = 'reserved'
    m.reservedFor = booking.id
    notify(
      nextUserId,
      'It is your turn',
      `${m.name} just became free. Start it within ${graceMinutes} minutes, otherwise you lose your place in the queue.`,
      'info',
    )
    touched = true
  }

  return touched ? s : inputState
}

function applyAction(state, action) {
  const now = Date.now() + (state.clockOffset || 0)

  switch (action.type) {
    case 'RESET':
      return { ...createSeed(now), currentUserId: state.currentUserId }

    case 'LOGIN':
      return { ...state, currentUserId: action.userId }

    case 'LOGOUT':
      return { ...state, currentUserId: null }

    case 'UPSERT_USER': {
      const exists = state.users.some((u) => u.id === action.user.id)
      const users = exists
        ? state.users.map((u) => (u.id === action.user.id ? { ...u, ...action.user } : u))
        : [...state.users, action.user]
      return { ...state, users }
    }

    case 'CREATE_BOOKING':
      return {
        ...state,
        bookings: [...state.bookings, action.booking],
        machines: state.machines.map((m) =>
          m.id === action.booking.machineId
            ? { ...m, queue: m.queue.filter((id) => id !== action.booking.userId) }
            : m,
        ),
      }

    case 'CANCEL_BOOKING': {
      const booking = state.bookings.find((b) => b.id === action.id)
      if (!booking || !['scheduled', 'due'].includes(booking.status)) return state
      const machines = state.machines.map((m) =>
        m.id === booking.machineId && m.reservedFor === booking.id && !m.session
          ? { ...m, reservedFor: null, status: 'available' }
          : m,
      )
      return {
        ...state,
        machines,
        bookings: state.bookings.map((b) => (b.id === action.id ? { ...b, status: 'cancelled' } : b)),
        history: [
          {
            id: uid('hs'),
            userId: booking.userId,
            machineId: booking.machineId,
            startedAt: booking.startAt,
            endedAt: now,
            durationMin: 0,
            status: 'cancelled',
            source: booking.source,
          },
          ...state.history,
        ],
      }
    }

    case 'JOIN_QUEUE':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.id === action.machineId && !m.queue.includes(action.userId)
            ? { ...m, queue: [...m.queue, action.userId] }
            : m,
        ),
      }

    case 'LEAVE_QUEUE':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.id === action.machineId ? { ...m, queue: m.queue.filter((id) => id !== action.userId) } : m,
        ),
      }

    case 'START_NOW': {
      const machine = state.machines.find((m) => m.id === action.machineId)
      if (!machine) return state
      const booking =
        (machine.reservedFor
          ? state.bookings.find((b) => b.id === machine.reservedFor && b.userId === action.userId)
          : null) || null
      const durationMin = booking ? booking.durationMin : action.durationMin || state.settings.defaultDuration
      const endedBooking = booking ? booking.id : null
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.id === action.machineId
            ? {
                ...m,
                status: 'running',
                motion: 'detected',
                lastMotionAt: now,
                reservedFor: null,
                session: {
                  userId: action.userId,
                  bookingId: endedBooking,
                  startedAt: now,
                  endsAt: now + durationMin * 60000,
                  durationMin,
                },
              }
            : m,
        ),
        bookings: state.bookings.map((b) =>
          b.id === endedBooking ? { ...b, status: 'started', startedAt: now } : b,
        ),
      }
    }

    case 'STOP_CYCLE':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.id === action.machineId && m.session
            ? { ...m, session: { ...m.session, endsAt: now } }
            : m,
        ),
      }

    case 'SET_MOTION':
      return {
        ...state,
        machines: state.machines.map((m) =>
          m.id === action.machineId
            ? { ...m, motion: action.value, lastMotionAt: action.value === 'detected' ? now : m.lastMotionAt }
            : m,
        ),
      }

    case 'SET_WIFI':
      return {
        ...state,
        machines: state.machines.map((m) => (m.id === action.machineId ? { ...m, wifi: action.connected } : m)),
      }

    case 'SET_SENSOR':
      return {
        ...state,
        machines: state.machines.map((m) => (m.id === action.machineId ? { ...m, motionSensor: action.connected } : m)),
      }

    case 'SET_MACHINE_STATUS':
      return {
        ...state,
        machines: state.machines.map((m) => {
          if (m.id !== action.machineId) return m
          if (action.status === 'offline') return { ...m, status: 'offline', motion: 'none' }
          if (m.status === 'offline') return { ...m, status: m.session ? 'running' : 'available' }
          return m
        }),
      }

    case 'READ_ALL':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.read || (n.userId !== action.userId && n.userId !== 'all') ? n : { ...n, read: true },
        ),
      }

    case 'READ_ONE':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      }

    case 'DELETE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) }

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.userId !== action.userId && n.userId !== 'all'),
      }

    case 'PUSH_NOTIFICATION':
      return {
        ...state,
        notifications: [
          { id: uid('nt'), createdAt: now, read: false, type: 'info', ...action.notification },
          ...state.notifications,
        ],
      }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'ADVANCE_CLOCK':
      return { ...state, clockOffset: (state.clockOffset || 0) + action.minutes * 60000 }

    default:
      return state
  }
}

export function washReducer(state, action) {
  const next = action.type === 'TICK' ? state : applyAction(state, action)
  return runEngine(next, Date.now() + (next.clockOffset || 0))
}

/* ------------------------------------------------------------------ */
/* helpers used by the provider to validate before dispatching        */
/* ------------------------------------------------------------------ */

export function validateBooking(state, { machineId, date, time, durationMin }, userId) {
  const machine = getMachine(state, machineId)
  if (!machine) return { ok: false, reason: 'Select a washing machine.' }
  if (machine.status === 'offline') return { ok: false, reason: `${machine.name} is offline right now.` }

  const startAt = new Date(`${date}T${time}`).getTime()
  if (Number.isNaN(startAt)) return { ok: false, reason: 'Pick a valid date and time.' }
  if (startAt <= Date.now() + 60000) return { ok: false, reason: 'Choose a time in the future.' }
  if (startAt > Date.now() + 7 * 86400000) return { ok: false, reason: 'Bookings open 7 days in advance.' }
  if (durationMin < 15 || durationMin > state.settings.maxDuration) {
    return { ok: false, reason: `Duration must be between 15 and ${state.settings.maxDuration} minutes.` }
  }

  const endAt = startAt + durationMin * 60000
  const clash = state.bookings.find(
    (b) =>
      b.machineId === machineId &&
      OVERLAPABLE_STATES.includes(b.status) &&
      b.startAt < endAt &&
      startAt < b.endAt,
  )
  if (clash) {
    return { ok: false, reason: `Overlaps ${userName(state, clash.userId)}'s booking (${timeKey(clash.startAt)}–${timeKey(clash.endAt)}).` }
  }

  const mine = state.bookings.find(
    (b) => b.userId === userId && b.machineId === machineId && OVERLAPABLE_STATES.includes(b.status),
  )
  if (mine) return { ok: false, reason: 'You already have an active booking on this machine.' }

  return { ok: true, startAt, endAt }
}
