import { addDays, dateKey, startOfDay, timeKey, uid } from '../utils/time.js'

export const DEMO_USERS = [
  { id: 'u-rahul', name: 'Rahul Reddy', room: '305', phone: '9876543211', initials: 'RR', color: '#2563eb' },
  { id: 'u-priya', name: 'Priya Sharma', room: '402', phone: '9876543212', initials: 'PS', color: '#7c3aed' },
  { id: 'u-kiran', name: 'Kiran Kumar', room: '103', phone: '9876543213', initials: 'KK', color: '#0d9488' },
  { id: 'u-anjali', name: 'Anjali Kumar', room: '201', phone: '9876543214', initials: 'AK', color: '#ea580c' },
  { id: 'u-sanjana', name: 'Sanjana Rao', room: '306', phone: '9876543215', initials: 'SR', color: '#db2777' },
]

export const MACHINE_META = [
  { id: 'm1', name: 'Machine 1', code: 'WM-01', capacity: 8, load: 'Front Load · 8 kg' },
  { id: 'm2', name: 'Machine 2', code: 'WM-02', capacity: 8, load: 'Front Load · 8 kg' },
  { id: 'm3', name: 'Machine 3', code: 'WM-03', capacity: 6, load: 'Top Load · 6 kg' },
]

export const CYCLE_PRESETS = [
  { minutes: 15, label: 'Quick', hint: 'Light load' },
  { minutes: 30, label: 'Cotton', hint: 'Everyday' },
  { minutes: 45, label: 'Heavy', hint: 'Bedsheets' },
  { minutes: 60, label: 'Deep Clean', hint: 'Towels' },
]

/** 6:00 PM today, or 6:00 PM tomorrow if 6 PM already passed today. */
const sixPmSlot = (now) => {
  const todaySix = startOfDay(now) + 18 * 3600000
  return todaySix > now ? todaySix : addDays(todaySix, 1)
}

export function createSeed(now = Date.now()) {
  const users = DEMO_USERS.map((u) => ({ ...u }))

  const bookingPriya = {
    id: uid('bk'),
    userId: 'u-priya',
    machineId: 'm3',
    date: dateKey(sixPmSlot(now)),
    startTime: '18:00',
    durationMin: 45,
    startAt: sixPmSlot(now),
    endAt: sixPmSlot(now) + 45 * 60000,
    status: 'scheduled',
    source: 'manual',
    createdAt: now - 3600000,
  }

  const bookingAnjali = {
    id: uid('bk'),
    userId: 'u-anjali',
    machineId: 'm1',
    date: dateKey(now + 12 * 60000),
    startTime: timeKey(now + 12 * 60000),
    durationMin: 30,
    startAt: now + 12 * 60000,
    endAt: now + 12 * 60000 + 30 * 60000,
    status: 'scheduled',
    source: 'manual',
    createdAt: now - 1800000,
  }

  const bookingKiran = {
    id: uid('bk'),
    userId: 'u-kiran',
    machineId: 'm1',
    date: dateKey(now + 95 * 60000),
    startTime: timeKey(now + 95 * 60000),
    durationMin: 30,
    startAt: now + 95 * 60000,
    endAt: now + 95 * 60000 + 30 * 60000,
    status: 'scheduled',
    source: 'manual',
    createdAt: now - 900000,
  }

  const machines = MACHINE_META.map((meta) => ({
    ...meta,
    status: 'available',
    location: 'Laundry Room · Block A',
    wifi: true,
    motionSensor: true,
    motion: 'none',
    lastMotionAt: null,
    session: null,
    reservedFor: null,
    queue: [],
  }))

  const m1 = machines[0]
  const m2 = machines[1]
  const m3 = machines[2]

  m1.queue = ['u-sanjana']

  m2.status = 'running'
  m2.motion = 'detected'
  m2.lastMotionAt = now
  m2.session = {
    userId: 'u-rahul',
    bookingId: null,
    startedAt: now - 17 * 60000,
    endsAt: now + 28 * 60000,
    durationMin: 45,
  }

  m3.status = 'reserved'
  m3.reservedFor = bookingPriya.id

  const history = [
    {
      id: uid('hs'),
      userId: 'u-rahul',
      machineId: 'm1',
      startedAt: addDays(now, -2) + 19 * 3600000,
      endedAt: addDays(now, -2) + 19 * 3600000 + 40 * 60000,
      durationMin: 40,
      status: 'completed',
      source: 'manual',
    },
    {
      id: uid('hs'),
      userId: 'u-priya',
      machineId: 'm1',
      startedAt: addDays(now, -1) + 8 * 3600000,
      endedAt: addDays(now, -1) + 8 * 3600000 + 30 * 60000,
      durationMin: 30,
      status: 'completed',
      source: 'manual',
    },
    {
      id: uid('hs'),
      userId: 'u-rahul',
      machineId: 'm2',
      startedAt: addDays(now, -5) + 17 * 3600000,
      endedAt: addDays(now, -5) + 17 * 3600000 + 45 * 60000,
      durationMin: 45,
      status: 'completed',
      source: 'manual',
    },
    {
      id: uid('hs'),
      userId: 'u-kiran',
      machineId: 'm3',
      startedAt: addDays(now, -3) + 21 * 3600000,
      endedAt: addDays(now, -3) + 21 * 3600000 + 45 * 60000,
      durationMin: 45,
      status: 'missed',
      source: 'queue',
    },
    {
      id: uid('hs'),
      userId: 'u-rahul',
      machineId: 'm3',
      startedAt: addDays(now, -8) + 10 * 3600000,
      endedAt: addDays(now, -8) + 10 * 3600000,
      durationMin: 0,
      status: 'cancelled',
      source: 'manual',
    },
  ].sort((a, b) => b.startedAt - a.startedAt)

  const notifications = [
    {
      id: uid('nt'),
      userId: 'u-rahul',
      title: 'Wash cycle in progress',
      message: 'Machine 2 started for you. 28 minutes remaining.',
      type: 'success',
      createdAt: now - 17 * 60000,
      read: false,
    },
    {
      id: uid('nt'),
      userId: 'u-rahul',
      title: 'Reminder: collect your laundry',
      message: 'Machine 2 will finish shortly. You will be notified when the door unlocks.',
      type: 'info',
      createdAt: now - 6 * 60000,
      read: false,
    },
    {
      id: uid('nt'),
      userId: 'all',
      title: 'Laundry room maintenance',
      message: 'Machine 3 will be offline for deep cleaning on Sunday morning.',
      type: 'warning',
      createdAt: now - 26 * 3600000,
      read: true,
    },
  ]

  return {
    version: 1,
    currentUserId: null,
    users,
    machines,
    bookings: [bookingPriya, bookingAnjali, bookingKiran],
    history,
    notifications,
    settings: {
      defaultDuration: 30,
      maxDuration: 90,
      graceMinutes: 10,
      wifiRequired: true,
      notificationsEnabled: true,
      alertsEnabled: true,
    },
    clockOffset: 0,
  }
}
