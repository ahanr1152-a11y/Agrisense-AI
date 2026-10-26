# AgriSense – Smart Farming, Thoughtfully Designed

Flask dashboard for your ESP32 → Blynk Cloud → website setup. The Blynk token stays on the server (`.env`) and never reaches the browser.

> ⚠ This is a monitoring interface. It must not replace hardware safety protections (dry-run cut-off, max runtime, overflow sensor) on the ESP32.

## Files
`app.py` (routes, auth, rate limit) · `blynk_client.py` (Blynk API) · `config.py` (**pins, units, sensor meaning – edit here**) · `templates/index.html` · `static/css/style.css` · `static/js/app.js`

## Setup on Windows + VS Code
1. Install Python 3.10+ (tick **Add Python to PATH**). Open the `AgriSense` folder in VS Code → Terminal → New Terminal.
2. Run these one by one:
```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
(If activation is blocked: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell.)
3. Open `.env` in VS Code and edit it yourself (never paste it in chats/GitHub):
   - `BLYNK_TOKEN=` your device token (Blynk → Device → Device Info). Leave as-is for **demo mode**.
   - `CONTROL_PASSWORD=` choose a password to enable pump controls (empty = read-only).
   - `SECRET_KEY=` run `python -c "import secrets;print(secrets.token_hex(32))"` and paste the result.
   - `BLYNK_BASE_URL=` change only if your Blynk region differs (e.g. `https://blr1.blynk.cloud`).
4. Start: `python app.py` → open http://127.0.0.1:5000

## Demo vs live
No token (or `DEMO_MODE=true`) → clearly labelled **sample data**; controls never touch real devices. With a token → only live data; demo values are never mixed in.

## Test against your Blynk project
1. Run your ESP32. In Blynk → Device → Datastreams, confirm V0, V1, V2, V3, V6, V7, V8 (and V9–V14 if you use them) exist and receive values.
2. Open `https://blynk.cloud/external/api/getAll?token=YOUR_TOKEN` in a browser tab once to see the raw JSON (do not share the URL). Pins with no value simply won't appear – AgriSense shows them as “Unavailable”.
3. Dashboard shows “Connected to Blynk”. Compare each card with the Blynk app.
4. Digital sensors: cover/wet the sensor and watch the value. If ON/OFF is reversed, change `LIGHT_ON_VALUE` / `RAIN_ON_VALUE` in `config.py`.
5. Soil shows the **raw** value only. A constant 4095 usually means a disconnected/dry sensor or wiring problem. Calibrate (dry vs wet readings) before ever showing a %.

## Verify pump control safely
1. First test with the **pump disconnected** (relay LED/multimeter only).
2. Set `CONTROL_PASSWORD`, restart, unlock controls, press Pump ON (confirm). Blynk V7 should change to 1 and your ESP32 should react. “Command sent” ≠ pump running.
3. Only then connect the pump with water supervised. Pump status is “confirmed” only if your ESP32 writes real feedback to V11 (e.g. from a flow/current sensor); otherwise it shows Unknown.
4. Press Pump OFF and confirm the relay releases.

## Required ESP32 behaviour
- `BLYNK_WRITE(V7)`: apply the command, but keep local limits (max runtime, auto-off timer, dry-tank protection).
- `BLYNK_WRITE(V8)`: switch automatic mode; the website never overrides your logic on its own.
- Optionally publish real pump feedback to V11, plus V12/V13 if you use them.

## API
`GET /api/status` · `GET /api/history` · `POST /api/login` · `POST /api/pump` `{action:"on"|"off", confirm:true}` · `POST /api/auto-mode` `{enabled:true|false}`. Control routes need login + CSRF header + are rate limited.

## Security / deployment
- `.env` is git-ignored. The token is never logged or sent to the browser.
- For remote access use HTTPS (e.g. a reverse proxy), set `COOKIE_SECURE=true`, and run with a production server: `pip install waitress` then `waitress-serve --host=127.0.0.1 --port=5000 app:app`. Rate limiting is in-memory (single process).
- History lives in server memory and is lost on restart; add a database or Blynk history later for permanence.

## Hindi voice assistant
Uses the browser’s `hi-IN` speech recognition/synthesis (Chrome/Edge; needs HTTPS or localhost). It answers only from real `/api/status` values. A normal Blynk text widget cannot play speech; you can link to `/#voice` from the Blynk app instead.
