/*
 * Base URL of the WashTrack backend.
 *
 * - Local dev: leave VITE_API_URL empty — the Vite dev server proxies /api
 *   to http://localhost:4000 (see vite.config.js), so no CORS is needed.
 * - Render: set VITE_API_URL to the deployed backend URL, e.g.
 *   https://washertrack-api.onrender.com
 */
const configured = import.meta.env.VITE_API_URL
export const API_BASE = (typeof configured === 'string' ? configured : '').trim().replace(/\/+$/, '')

const TIMEOUT_MS = 8000

async function request(path, options = {}) {
  if (!API_BASE && import.meta.env.PROD) {
    throw new Error('VITE_API_URL was not set when this build was made')
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error((data && data.error) || `Server responded with ${res.status}`)
    }
    return data
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('Request timed out')
    if (err && err instanceof TypeError) throw new Error('Backend is not reachable')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function fetchMachines() {
  return request('/api/machines')
}

export function sendMotion(machineId, motion) {
  return request('/api/sensor/motion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId, motion }),
  })
}
