# Demo operations

## Local services

| Service | Address | Purpose |
| --- | --- | --- |
| React/Vite | `http://127.0.0.1:5173` | Phone and laptop experience |
| FastAPI bridge | `http://127.0.0.1:8787` | Voice sessions, vision, plans, and Pi state |
| Optional HTTPS tunnel | Points at port `5173` | Lets a phone access Warden on the same network or remotely |

Start the browser service with `npm run dev`; use `npm run dev:host` when a LAN-visible Vite listener is appropriate. Start the bridge from `bridge/` with Uvicorn as shown in the root README.

## Health checks

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/status
```

Expected mock health response:

```json
{"ok": true, "mode": "mock"}
```

## Voice diagnostics

Phone voice events are recorded locally, never committed:

```text
bridge/logs/voice-debug.ndjson
```

The trace records session lifecycle, VAD, mode changes, model-response corrections, and errors. It deliberately excludes images, signed URLs, and keys. Use it to distinguish a model completion issue from a voice interruption.

## Reset between demos

1. End the active phone conversation.
2. Refresh laptop and phone pages.
3. Start a fresh voice session.
4. Confirm the laptop is waiting for confirmed hardware before the first visual interaction.

## Failure recovery

- **Voice fails to connect:** confirm bridge health, HTTPS tunnel availability, and Safari microphone permission; then start a new voice session.
- **Laptop does not update:** refresh both clients and confirm the bridge is reachable from the Vite proxy.
- **Camera recognition is weak:** move closer, hold the board label-side up, improve light, and ask Warden to inspect again.
- **Live Pi is unavailable:** use **Run demo**. The mock flow intentionally exercises the same verification UX without claiming real hardware detection.
