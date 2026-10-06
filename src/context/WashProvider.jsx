import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useToast } from './toastStore.js'
import {
  ACTIVE_BOOKING_STATES,
  clearStoredState,
  getMachine,
  getUser,
  loadState,
  saveState,
  validateBooking,
  washReducer,
  WashContext,
} from './washStore.js'
import { fetchMachines, sendMotion, API_BASE } from '../api.js'
import { MACHINE_META } from '../data/seed.js'
import { minutesOfDay, uid } from '../utils/time.js'

const initialsOf = (name) =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ? p[0].toUpperCase() : '')
    .join('')

const palette = ['#2563eb', '#7c3aed', '#0d9488', '#ea580c', '#db2777', '#0891b2', '#65a30d']
const colorFor = (id) => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997
  return palette[hash % palette.length]
}

export function WashProvider({ children }) {
  const [state, dispatch] = useReducer(washReducer, undefined, loadState)
  const [now, setNow] = useState(() => Date.now() + (loadState().clockOffset || 0))
  const toast = useToast()
  const seenNotifications = useRef(new Set())
  const booted = useRef(false)

  /* -------------------------------------------------- persistence */
  useEffect(() => {
    saveState(state)
  }, [state])

  /* -------------------------------------------------- 1 second engine tick */
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'TICK' })
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  /* -------------------------------------------------- backend polling (real ESP32 sensors) */
  const [backendOnline, setBackendOnline] = useState(null)
  const syncedMotion = useRef(null)
  const toastRef = useRef(toast)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      try {
        const remoteMachines = await fetchMachines()
        if (cancelled || !Array.isArray(remoteMachines)) return
        setBackendOnline(true)

        const previous = syncedMotion.current
        if (previous) {
          remoteMachines.forEach((remote) => {
            if (previous.get(remote.id) === remote.motion) return
            const meta = MACHINE_META.find((m) => m.id === remote.id)
            const label = meta ? meta.name : remote.id
            if (remote.motion === 'detected') {
              toastRef.current.success('Motion detected', `PIR sensor on ${label} reports movement.`)
            } else {
              toastRef.current.info('No motion', `${label} sensor is idle.`)
            }
          })
        }
        syncedMotion.current = new Map(remoteMachines.map((m) => [m.id, m.motion]))
        dispatch({ type: 'SYNC_MACHINES', machines: remoteMachines })
      } catch {
        if (!cancelled) setBackendOnline(false)
      }
    }

    sync()
    const id = setInterval(sync, 3000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  /* -------------------------------------------------- new notifications become toasts */
  useEffect(() => {
    const me = state.currentUserId
    if (!booted.current) {
      state.notifications.forEach((n) => seenNotifications.current.add(n.id))
      booted.current = true
      return
    }
    if (!me) return
    state.notifications.forEach((n) => {
      if (seenNotifications.current.has(n.id)) return
      seenNotifications.current.add(n.id)
      if (n.userId !== me && n.userId !== 'all') return
      toast.push({ tone: n.type, title: n.title, message: n.message })
    })
  }, [state.notifications, state.currentUserId, toast])

  /* -------------------------------------------------- actions */
  const login = useCallback((userId) => {
    dispatch({ type: 'LOGIN', userId })
  }, [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  const registerUser = useCallback(
    ({ name, room, phone }) => {
      const id = uid('u')
      dispatch({
        type: 'UPSERT_USER',
        user: { id, name, room, phone, initials: initialsOf(name), color: colorFor(id) },
      })
      dispatch({ type: 'LOGIN', userId: id })
      return id
    },
    [],
  )

  const updateUser = useCallback((patch) => {
    if (!state.currentUserId) return
    const current = getUser(state, state.currentUserId)
    if (!current) return
    dispatch({
      type: 'UPSERT_USER',
      user: {
        ...current,
        ...patch,
        initials: initialsOf(patch.name || current.name),
      },
    })
    toast.success('Profile updated', 'Your details have been saved.')
  }, [state, toast])

  const createBooking = useCallback(
    ({ machineId, date, time, durationMin }) => {
      const me = state.currentUserId
      if (!me) return { ok: false, reason: 'Please sign in first.' }
      const duration = Number(durationMin)
      const check = validateBooking(state, { machineId, date, time, durationMin: duration }, me)
      if (!check.ok) return check
      const booking = {
        id: uid('bk'),
        userId: me,
        machineId,
        date,
        startTime: time,
        durationMin: duration,
        startAt: check.startAt,
        endAt: check.endAt,
        status: 'scheduled',
        source: 'manual',
        createdAt: Date.now(),
      }
      dispatch({ type: 'CREATE_BOOKING', booking })
      const machine = getMachine(state, machineId)
      toast.success(
        'Slot confirmed',
        `${machine ? machine.name : 'Machine'} booked for ${date} at ${formatTimeLabel(time)}.`,
      )
      return { ok: true, booking }
    },
    [state, toast],
  )

  const cancelBooking = useCallback(
    (bookingId) => {
      const booking = state.bookings.find((b) => b.id === bookingId)
      if (!booking) return
      dispatch({ type: 'CANCEL_BOOKING', id: bookingId })
      const machine = getMachine(state, booking.machineId)
      toast.info('Booking cancelled', `Your ${machine ? machine.name : 'machine'} slot has been released.`)
    },
    [state, toast],
  )

  const joinQueue = useCallback(
    (machineId) => {
      const me = state.currentUserId
      if (!me) return
      dispatch({ type: 'JOIN_QUEUE', machineId, userId: me })
      const machine = getMachine(state, machineId)
      const position = (machine ? machine.queue.indexOf(me) : -1) + 2
      toast.info('Added to queue', `You are number ${position} in the ${machine ? machine.name : 'machine'} queue.`)
    },
    [state, toast],
  )

  const leaveQueue = useCallback(
    (machineId) => {
      dispatch({ type: 'LEAVE_QUEUE', machineId, userId: state.currentUserId })
      const machine = getMachine(state, machineId)
      toast.info('Left the queue', `You removed yourself from the ${machine ? machine.name : 'machine'} queue.`)
    },
    [state, toast],
  )

  const startNow = useCallback(
    (machineId, durationMin) => {
      const me = state.currentUserId
      if (!me) return
      const machine = getMachine(state, machineId)
      if (!machine) return
      if (state.settings.wifiRequired && !machine.wifi) {
        toast.error('Machine offline', `${machine.name} is not connected to Wi-Fi. Reconnect it from the sensor panel.`)
        return
      }
      dispatch({ type: 'START_NOW', machineId, userId: me, durationMin })
      toast.success('Machine started', `${machine.name} started for you.`)
    },
    [state, toast],
  )

  const stopCycle = useCallback(
    (machineId) => {
      dispatch({ type: 'STOP_CYCLE', machineId })
      const machine = getMachine(state, machineId)
      toast.info('Cycle ended', `${machine ? machine.name : 'Machine'} is available again.`)
    },
    [state, toast],
  )

  const setMotion = useCallback(
    async (machineId, value) => {
      const machine = getMachine(state, machineId)
      const label = machine ? machine.name : 'machine'
      try {
        await sendMotion(machineId, value)
        if (syncedMotion.current) syncedMotion.current.set(machineId, value)
        dispatch({ type: 'SET_MOTION', machineId, value })
        if (value === 'detected') {
          toast.success('Motion detected', `PIR sensor on ${label} reports movement.`)
        } else {
          toast.info('No motion', `${label} sensor is idle.`)
        }
        return true
      } catch (err) {
        toast.error('Backend unreachable', `${label}: ${err.message}. API: ${API_BASE || '/api'}`)
        return false
      }
    },
    [state, toast],
  )

  const setWifi = useCallback(
    (machineId, connected) => {
      dispatch({ type: 'SET_WIFI', machineId, connected })
      const machine = getMachine(state, machineId)
      toast[connected ? 'success' : 'error'](
        connected ? 'Wi-Fi connected' : 'Wi-Fi disconnected',
        connected
          ? `${machine ? machine.name : 'Machine'} is back online.`
          : `${machine ? machine.name : 'Machine'} is running on local control only.`,
      )
    },
    [state, toast],
  )

  const setSensor = useCallback(
    (machineId, connected) => {
      dispatch({ type: 'SET_SENSOR', machineId, connected })
      const machine = getMachine(state, machineId)
      toast[connected ? 'success' : 'error'](
        connected ? 'Sensor connected' : 'Sensor disconnected',
        `${machine ? machine.name : 'Machine'} motion sensor is ${connected ? 'online' : 'offline'}.`,
      )
    },
    [state, toast],
  )

  const setMachineStatus = useCallback(
    (machineId, status) => {
      dispatch({ type: 'SET_MACHINE_STATUS', machineId, status })
      const machine = getMachine(state, machineId)
      toast.info('Machine updated', `${machine ? machine.name : 'Machine'} is now ${status}.`)
    },
    [state, toast],
  )

  const markAllRead = useCallback(() => {
    if (state.currentUserId) dispatch({ type: 'READ_ALL', userId: state.currentUserId })
  }, [state.currentUserId])

  const readNotification = useCallback((id) => dispatch({ type: 'READ_ONE', id }), [])

  const deleteNotification = useCallback((id) => dispatch({ type: 'DELETE_NOTIFICATION', id }), [])

  const clearNotifications = useCallback(() => {
    if (state.currentUserId) dispatch({ type: 'CLEAR_NOTIFICATIONS', userId: state.currentUserId })
  }, [state.currentUserId])

  const pushNotification = useCallback((notification) => dispatch({ type: 'PUSH_NOTIFICATION', notification }), [])

  const updateSettings = useCallback((patch) => dispatch({ type: 'UPDATE_SETTINGS', patch }), [])

  const advanceClock = useCallback(
    (minutes) => {
      dispatch({ type: 'ADVANCE_CLOCK', minutes })
      setNow(Date.now() + minutes * 60000)
      toast.info('Demo clock advanced', `Jumped forward ${minutes} minutes.`)
    },
    [toast],
  )

  const resetData = useCallback(() => {
    clearStoredState()
    dispatch({ type: 'RESET' })
    setNow(Date.now())
    toast.info('Demo data reset', 'All machines, queues and bookings are back to their initial state.')
  }, [toast])

  /* -------------------------------------------------- derived data */
  const currentUser = useMemo(() => getUser(state, state.currentUserId), [state])

  const myBookings = useMemo(
    () =>
      state.currentUserId
        ? state.bookings
            .filter((b) => b.userId === state.currentUserId)
            .sort((a, b) => a.startAt - b.startAt)
        : [],
    [state.bookings, state.currentUserId],
  )

  const activeBookings = useMemo(() => myBookings.filter((b) => ACTIVE_BOOKING_STATES.includes(b.status)), [myBookings])

  const myHistory = useMemo(
    () =>
      state.currentUserId
        ? state.history
            .filter((h) => h.userId === state.currentUserId)
            .sort((a, b) => b.startedAt - a.startedAt)
        : [],
    [state.history, state.currentUserId],
  )

  const myNotifications = useMemo(
    () =>
      state.currentUserId
        ? state.notifications
            .filter((n) => n.userId === state.currentUserId || n.userId === 'all')
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [state.notifications, state.currentUserId],
  )

  const unreadCount = useMemo(() => myNotifications.filter((n) => !n.read).length, [myNotifications])

  const myQueueEntries = useMemo(() => {
    if (!state.currentUserId) return []
    return state.machines
      .filter((m) => m.queue.includes(state.currentUserId))
      .map((m) => ({ machine: m, position: m.queue.indexOf(state.currentUserId) + 1 }))
      .sort((a, b) => a.position - b.position)
  }, [state.machines, state.currentUserId])

  const myRunningMachine = useMemo(
    () =>
      state.machines.find(
        (m) => m.status === 'running' && m.session && m.session.userId === state.currentUserId,
      ) || null,
    [state.machines, state.currentUserId],
  )

  const myReservedMachines = useMemo(
    () =>
      state.machines
        .filter(
          (m) =>
            m.status === 'reserved' &&
            m.reservedFor &&
            (state.bookings.find((b) => b.id === m.reservedFor) || {}).userId === state.currentUserId,
        )
        .map((m) => ({ machine: m, booking: state.bookings.find((b) => b.id === m.reservedFor) })),
    [state.machines, state.bookings, state.currentUserId],
  )

  const value = useMemo(
    () => ({
      ...state,
      now,
      backendOnline,
      apiBase: API_BASE,
      currentUser,
      myBookings,
      activeBookings,
      myHistory,
      myNotifications,
      unreadCount,
      myQueueEntries,
      myRunningMachine,
      myReservedMachines,
      login,
      logout,
      registerUser,
      updateUser,
      createBooking,
      cancelBooking,
      joinQueue,
      leaveQueue,
      startNow,
      stopCycle,
      setMotion,
      setWifi,
      setSensor,
      setMachineStatus,
      markAllRead,
      readNotification,
      deleteNotification,
      clearNotifications,
      pushNotification,
      updateSettings,
      advanceClock,
      resetData,
    }),
    [
      state,
      now,
      backendOnline,
      currentUser,
      myBookings,
      activeBookings,
      myHistory,
      myNotifications,
      unreadCount,
      myQueueEntries,
      myRunningMachine,
      myReservedMachines,
      login,
      logout,
      registerUser,
      updateUser,
      createBooking,
      cancelBooking,
      joinQueue,
      leaveQueue,
      startNow,
      stopCycle,
      setMotion,
      setWifi,
      setSensor,
      setMachineStatus,
      markAllRead,
      readNotification,
      deleteNotification,
      clearNotifications,
      pushNotification,
      updateSettings,
      advanceClock,
      resetData,
    ],
  )

  return <WashContext.Provider value={value}>{children}</WashContext.Provider>
}

function formatTimeLabel(hhmm) {
  const mins = minutesOfDay(hhmm)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}
