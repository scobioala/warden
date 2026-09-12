# Warden · embodied AI tutor

Warden is a general workbench companion for the Raspberry Pi 5 and a known low-voltage Qwiic kit. It listens to spoken questions, inspects an explicitly captured browser camera frame, guides one physical action at a time, and confirms state through a Pi bridge. The APDS9960 sequence is a demo lesson—not the product’s only workflow. It deliberately never gives mains-power or unverified wiring advice.

## Run the demo (no Pi required)

```bash
cd Warden
npm install
npm run dev
```

Open the printed local URL. Click **Run demo** for a deterministic one-click walkthrough, or use **Start guided setup**. Camera access is optional; when recognition is uncertain, the interface asks the learner to adjust the view instead of claiming a detection.

## Pi bridge

On the Raspberry Pi, with the supported I²C/Qwiic hardware connected:

```bash
cd Warden/bridge
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8787
```

The bridge serves `GET /health`, `GET /status`, a status WebSocket at `/ws`, and mock demo hooks at `POST /demo/connect`, `/demo/wave`, and `/demo/confirm`. `WARDEN_MODE=mock` is the default. The real-hardware adapter is intentionally isolated in `bridge/main.py`; add CircuitPython/Blinka initialization there for the APDS9960, Qwiic Button, rotary encoder, and PiTFT.

Environment variables: `WARDEN_MODE=mock|real`, `WARDEN_WEB_ORIGIN=http://localhost:5173`, `VITE_WARDEN_BRIDGE_URL=http://<pi>:8787`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and optional `ANTHROPIC_MODEL`. See `bridge/.env.example`; do not commit a populated `.env` file.

### Astra, voice, and vision

Set `OPENAI_API_KEY` on the bridge to activate Astra via the Responses API using `gpt-6-astra`. If that key is absent or Astra fails, Warden uses `ANTHROPIC_API_KEY` with Claude Sonnet 4.6; both providers can reason over the user-triggered JPEG camera frame and the live Pi state. When neither works, Warden clearly labels and uses its deterministic safe fallback rather than pretending it performed vision or reasoning. Browser speech recognition transcribes the learner’s question; browser text-to-speech speaks Warden’s response. Microphone and camera permissions are requested only after the learner presses the relevant control.

## Architecture

```text
Browser camera + voice/text UI  →  React workbench experience
                                       ↕ HTTP / WebSocket
                              Python Pi bridge → I²C devices / PiTFT
```

The browser owns camera permissions and spoken prompts (with an accessible text-control fallback). The Pi owns I²C truth. Mock mode preserves that exact event model so a demo never depends on physical hardware.

## 90-second demo script

1. Open Warden: “What are we building today?” establishes a camera-aware workbench rather than a chat window.
2. Say “Warden, help me connect my first sensor,” or press **Start guided setup**.
3. Warden asks to see the APDS9960 and Qwiic cable, then gives one safe, keyed low-voltage connection action.
4. Press **I made the connection**. The console discovers `0x39`, the PiTFT changes to **VERIFIED**, and the button LED reports green.
5. Warden says: “Verified. You connected your first I²C sensor.”
6. Continue: a wave gesture advances the lesson; the encoder and Qwiic button select and confirm the next lesson.
7. For a reliable stage run, press **Run demo** and let the full sequence play itself.
