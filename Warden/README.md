# Warden

Hardware bring-up for a Raspberry Pi and known 3.3V Qwiic / STEMMA QT devices. The camera is a hint. The bus is the truth.

## Start the web app and agent

Requires Node 22. From `Warden/`:

```sh
npm install
cp agent/.env.example agent/.env
# Set ANTHROPIC_API_KEY in agent/.env; optionally configure ElevenLabs.
npm run agent
```

In a second terminal:

```sh
npm run dev
```

Open http://localhost:5174. The landing page leads to installation, pairing, optional camera permission, then the workbench. It can be explored offline; it never invents a connected device. A missing provider key is reported explicitly. `npm run build` creates `dist/`. The production web host must proxy `/api` (including SSE and device WebSocket upgrades) to the agent. Use HTTPS/WSS outside a trusted local network. The development proxy handles browser requests automatically.

## Connect the Pi

Use Raspberry Pi OS, Python 3.10+, and enable I²C in `sudo raspi-config`. Install the OS prerequisites:

```sh
sudo apt-get install -y git python3-venv python3-dev i2c-tools libgpiod-dev
```

Your Pi user needs access to `/dev/i2c-1` (normally membership in the `i2c` group). Copy the current checkout to the Pi; the public repository clone will include these changes only after they have been committed and pushed. From the Pi's `Warden/` directory:

```sh
python3 -m venv device/.venv
device/.venv/bin/pip install -r device/requirements.txt
device/.venv/bin/python device/main.py pair YOUR-CODE --agent http://YOUR-COMPUTER-LAN-IP:8788
```

Use the six-character code displayed in setup. Codes expire after 15 minutes; clear an expired code and generate a new one. The process stays in the foreground, opens an outbound WebSocket to the agent, and serves local FastAPI health at `127.0.0.1:8787/health`. After a disconnect, rerun pairing; after expiry, generate a fresh browser session. No hosted installer is claimed. The UI provides manual commands because no working installer URL exists.

## Architecture and evidence

- `web/`: Vite, React, TypeScript. Browser only contacts `/api` on the agent (except font assets).
- `agent/`: Node, Claude Sonnet tool loop, in-memory pairing, raw SSE tool events, server-side ElevenLabs TTS and single-frame camera analysis.
- `device/`: Python FastAPI + outbound WebSocket, fixed allowlisted operations, real `i2cdetect` output and I²C reads.
- `agent/parts.json`: supported APDS9960 at `0x39`, Adafruit seesaw encoder at `0x36`, SparkFun Qwiic Buttons at `0x6f` / `0x6e`.

No mock mode. No simulated sensor data. No arbitrary code execution. `i2cdetect` is invoked with a fixed argument list and no shell. Unknown addresses are shown as PRESENT; only successful supported reads yield VERIFIED. A scan failure, empty bus, and offline device are distinct states. A disconnected device clears the live cards. Button events require release followed by a new press; a held button is not accepted as a new action. LED writes and address changes read back the register. Camera confidence cannot update hardware verification.

The landing SVG is explicitly labeled an illustrative sequence, not a live bus. There is no recorded 90-second demo yet, so its secondary link goes to the process explanation. Device polling is independent of the conversation every three seconds. Tool arguments and raw results are visible. Voice is opt-in and falls back to browser speech synthesis. Camera permission is only requested after enabling the toggle; Analyze frame submits a single downsized JPEG.

## Configuration

All keys belong in `agent/.env`, never in browser variables. `ANTHROPIC_MODEL` is optional (defaults to `claude-sonnet-4-6`). Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` for TTS. The Pi accepts `WARDEN_AGENT_URL` or `--agent`; `WARDEN_I2C_BUS` defaults to `1` for scans/buttons. Adafruit drivers use the Pi's default hardware I²C bus. Sessions and conversation history are in memory and reset with the agent process. This is a local hackathon service, not a public multi-tenant deployment.

Button registers follow SparkFun's published driver: https://github.com/sparkfun/Qwiic_Button_Py/blob/main/qwiic_button.py. Physical address collisions cannot be counted by I²C; the agent must ask the user to disconnect one board before changing the other board's address.

## Validation

```sh
npm run build
npm test
python3 -m py_compile device/main.py
```

The integration test checks unauthenticated access, real offline state, provider configuration failures, invalid input, and invalid device pairing. Physical device operation, provider responses, microphone, and camera need the corresponding hardware, keys, and permissions; these are not represented as tested by the offline suite.

## Provenance

Pre-existing scaffolding: the original `src/main.tsx`, `src/styles.css`, Vite configuration, and `bridge/main.py` contained a simulated guided demo. This implementation replaces those active entry points with `web/`, `agent/`, and `device/`, built for the supplied design brief on September 12, 2026. The original mock bridge and frontend have been removed; Git history retains them. No API keys are included.
