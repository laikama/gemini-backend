# Gemini Cloud Backend (Render)

This folder provides the Render-facing Node/Express service for long-audio Gemini transcription.

## Requirements
- Node.js 18+
- `GEMINI_API_KEY` (required)

Optional environment variables:
- `GEMINI_MODEL` (default: `gemini-2.0-flash`)
- `GEMINI_TRANSCRIBE_PROMPT` (default: `请将这段会议音频转写为完整的中文文本`)
- `UPLOAD_TMP_DIR` (default: OS temp dir)
- `JOB_TTL_HOURS` (default: `24`)
- `PORT` (default: `3000`)

## Local Run
```bash
cd /Users/kama/Downloads/MacSpeechTranscribeCLI-clean/server
npm install
GEMINI_API_KEY=YOUR_KEY npm start
```

## API
### `POST /api/upload`
- Content-Type: `multipart/form-data`
- Field name: `file`
- File: `.m4a` (AAC, 16kHz, mono, 32kbps)

Example:
```bash
curl -F "file=@/path/to/audio.m4a" http://localhost:3000/api/upload
```
Response:
```json
{"jobId":"task_...","status":"processing"}
```

### `GET /api/status?jobId=...`
```bash
curl "http://localhost:3000/api/status?jobId=task_..."
```
Response (processing):
```json
{"jobId":"task_...","status":"processing"}
```
Response (completed):
```json
{"jobId":"task_...","status":"completed","result":"..."}
```

### `GET /ping`
```bash
curl http://localhost:3000/ping
```
Response:
```json
{"status":"alive"}
```

## Render Deploy
- Create a new Web Service
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `GEMINI_API_KEY` (required)
  - Optional: `GEMINI_MODEL`, `GEMINI_TRANSCRIBE_PROMPT`, `JOB_TTL_HOURS`

## UptimeRobot / Keepalive
Point UptimeRobot to:
```
GET https://YOUR-RENDER-SERVICE.onrender.com/ping
```
Run every 10 minutes to avoid free-tier sleep.

## iOS Endpoint Setting
In iOS Settings, set **Gemini Cloud Endpoint** to the Render base URL:
```
https://YOUR-RENDER-SERVICE.onrender.com
```
Do not include a trailing `/`.
