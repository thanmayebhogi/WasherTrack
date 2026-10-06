# WashTrack

A laundry-room booking app (React + Vite) with a **real backend for ESP32 motion sensors**
(Node.js + Express), deployable to Render as **two separate services**.

```
ESP32 + PIR ──POST /api/sensor/motion──▶ Express API (Render Web Service)
                                              │
React app (Render Static Site) ──GET /api/machines (every 3 s)──▶┘
```

---

## 1. Install dependencies

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
```

That one command installs the frontend **and** the backend packages
(`express`, `cors`, `dotenv` are in `package.json`).

---

## 2. Run locally

**Terminal 1 — backend**

```bash
npm run server
```

```
[...] WashTrack backend listening on 0.0.0.0:4000
  POST /api/sensor/motion  { "machineId": "m1", "motion": "detected" }
  GET  /api/machines
  GET  /api/health
```

**Terminal 2 — frontend**

```bash
npm run dev
```

Open <http://localhost:5173>.

No configuration is needed locally: the Vite dev server forwards `/api` to
`http://localhost:4000` (see `vite.config.js`), so the browser never talks to
`localhost:4000` directly and CORS is not involved.

`npm run server:dev` restarts the backend automatically when you edit `server/index.js`.

---

## 3. Deploy to Render (frontend + backend, separate services)

The repo contains everything Render needs:

| Service | Render type | Build command | Start command |
|---|---|---|---|
| `washertrack-api` | Web Service | `npm install` | `npm start` |
| `washertrack-frontend` | Static Site | `npm install && npm run build` | – (publish `dist`) |

### Option A — Blueprint (fastest)

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com): **New → Blueprint → Connect a repository** → pick your repo.
3. Render reads `render.yaml` and creates **both** services, including the
   `/* → /index.html` rewrite the React router needs on refresh.
4. Wait for both deploys, then open `https://<your-frontend>.onrender.com`.

### Option B — Manual (dashboard)

1. Push this repository to GitHub.
2. **New → Web Service** → connect the repo
   - Name: `washertrack-api`
   - Root Directory: *(leave empty — repo root)*
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Deploy. Verify: `https://<your-api>.onrender.com/api/health` → `{"ok":true,...}`
3. **New → Static Site** → connect the same repo
   - Name: `washertrack-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. On the **frontend** service → *Environment* → add:
   - `VITE_API_URL` = `https://<your-api>.onrender.com`
   - Redeploy the frontend (Manual Deploy → Clear build cache & deploy).
5. On the **frontend** service → *Settings → Redirects/Rewrites* → add:
   - Source `/*` → Destination `/index.html` → **Rewrite**
   (without this, refreshing `/dashboard` returns 404)
6. On the **backend** service → *Environment* → add:
   - `CORS_ORIGIN` = `https://<your-frontend>.onrender.com`
   - Redeploy the backend.

> Render sets `PORT` itself; `server/index.js` reads `process.env.PORT || 4000`,
> so nothing to configure there.

### Verify the deployed backend

```bash
curl https://<your-api>.onrender.com/api/health
curl https://<your-api>.onrender.com/api/machines
curl -X POST https://<your-api>.onrender.com/api/sensor/motion \
  -H "Content-Type: application/json" -d "{\"machineId\":\"m1\",\"motion\":\"detected\"}"
```

---

## 4. Connect the ESP32 + HC-SR501

### Wiring

| HC-SR501 | ESP32 |
|---|---|
| VCC | 3V3 (5V also works on most dev boards) |
| OUT | **GPIO 27** |
| GND | GND |

### Flash it

1. Open `esp32_motion_sensor.ino` in the Arduino IDE (install the ESP32 board package first:
   *File → Preferences → Additional Boards Manager URL* →
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`).
2. Select *Tools → Board → ESP32 Dev Module* and your COM port.
3. Edit the `SETTINGS` block:

   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* SERVER_URL    = "https://washertrack-api.onrender.com"; // your deployed API, no trailing slash
   const char* MACHINE_ID    = "m1";   // m1, m2 or m3
   ```

   `SERVER_URL` must be the **deployed** backend (`https://…onrender.com`), not `localhost` —
   the ESP32 is a separate device and cannot reach your computer's localhost.
   For bench testing without Render you can use your PC's LAN IP instead,
   e.g. `http://192.168.1.50:4000` (`ipconfig` / `ifconfig` shows it).
4. Upload and open *Tools → Serial Monitor* at **115200 baud**.

HTTPS is supported: the sketch uses `WiFiClientSecure` with `setInsecure()`,
so the certificate is accepted without being verified (normal for hobby projects).

### Expected serial output

```
=== WashTrack ESP32 motion sensor ===
Machine: m1 | PIR on GPIO 27 | Backend: https://washertrack-api.onrender.com
[WiFi] Connected. ESP32 IP: 192.168.1.77
[PIR] Motion detected
[HTTP] POST https://washertrack-api.onrender.com/api/sensor/motion
[HTTP] Body: {"machineId":"m1","motion":"detected"}
[HTTP] 200 OK — {"ok":true,"machine":{...}}
[HTTP] Delivered.
```

The sketch sends **only on state changes**, debounces for 150 ms, and retries every
3 s until the server acknowledges — so it survives Render's free-tier cold starts
(first request after idle can take ~50 s).

---

## 5. API reference

### `POST /api/sensor/motion`

```json
{ "machineId": "m1", "motion": "detected" }
```

- `machineId`: `"m1"`, `"m2"` or `"m3"` (404 otherwise)
- `motion`: `"detected"` or `"none"` (400 otherwise)

`200 { "ok": true, "machine": {...} }` · `400`/`404` with `{ "ok": false, "error": "..." }`

### `GET /api/machines`

```json
[
  { "id": "m1", "name": "Machine 1", "motion": "detected",
    "lastMotionAt": "2026-10-06T10:55:38.061Z", "updatedAt": "..." },
  { "id": "m2", "name": "Machine 2", "motion": "none", ... },
  { "id": "m3", "name": "Machine 3", "motion": "none", ... }
]
```

### `GET /api/health`

Health endpoint used to check the deployment.

> Status lives **in memory only** — restarting the server resets every machine to
> `motion: "none"`. No database.

---

## 6. Environment variables

Copy `.env.example` → `.env` for local work (it is gitignored, so Render never sees it).
On Render these are set per service in the dashboard (or in `render.yaml`).

| Variable | Used by | Local | Render |
|---|---|---|---|
| `PORT` | backend | `4000` | set automatically by Render |
| `HOST` | backend | `0.0.0.0` | leave default |
| `CORS_ORIGIN` | backend | empty = allow any origin | frontend URL, e.g. `https://washertrack-frontend.onrender.com` |
| `VITE_API_URL` | frontend | empty = use the Vite proxy | backend URL, e.g. `https://washertrack-api.onrender.com` |

`CORS_ORIGIN` accepts several origins separated by commas.

---

## 7. Files

**Created**

| File | Purpose |
|---|---|
| `server/index.js` | Express API: `/api/sensor/motion`, `/api/machines`, `/api/health`, CORS, in-memory store |
| `src/api.js` | Frontend client — reads `VITE_API_URL` only |
| `esp32_motion_sensor.ino` | ESP32 + HC-SR501 sketch (Wi-Fi, debounce, retry, HTTP + HTTPS) |
| `render.yaml` | Blueprint that creates both Render services |
| `.env.example` | Every environment variable, documented |
| `README.md` | This file |

**Modified**

| File | Change |
|---|---|
| `package.json` | `express`/`cors`/`dotenv`, `start`/`server`/`server:dev` scripts, `engines` |
| `vite.config.js` | Dev proxy: `/api` → local backend (uses `VITE_API_URL` or `localhost:4000`) |
| `src/context/WashProvider.jsx` | Polls `GET /api/machines` every 3 s, `setMotion()` POSTs to the API |
| `src/context/washStore.js` | `SYNC_MACHINES` action merging backend sensor state |
| `src/components/SensorPanel.jsx` | Backend test buttons + live connection status |

UI, pages, bookings, queues and demo data are unchanged.

---

## 8. Troubleshooting

- **Frontend shows "Backend offline"** → is the API deployed? Open `https://<api>/api/health`.
  Locally: is `npm run server` running?
- **CORS error in the browser console** → set `CORS_ORIGIN` on the backend to the exact
  frontend URL (no trailing slash) and redeploy.
- **Blank page / 404 on refresh at `/dashboard`** → add the `/* → /index.html` rewrite
  (step 5 of Option B, or use the blueprint which includes it).
- **Frontend says `VITE_API_URL was not set when this build was made`** → add
  `VITE_API_URL` to the static site's environment and redeploy.
- **ESP32 `[HTTP] Request failed`** → wrong URL in `SERVER_URL`, no trailing slash needed;
  check Wi-Fi; on a LAN-only URL your PC firewall must allow Node.js.
- **ESP32 `[HTTP] Server replied 404`** → `MACHINE_ID` must be `m1`, `m2` or `m3`.
- **First ESP32 POST takes ~50 s** → Render free tier is waking the service; the sketch retries every 3 s.
- **PIR fires constantly at boot** → wait 30–60 s for HC-SR501 warm-up.
