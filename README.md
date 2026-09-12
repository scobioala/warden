# Warden

**An agentic hardware debugger for the physical world.**

Built by **Cornell Tinkerers** for the **AI Tinkerers — NYC Hackathon**.

**Team:** Cris Nicoglu · Davide Bacchini · Aakarsh Gundu · Viktor Radev

Warden is a camera-aware voice agent for building, inspecting, and debugging real hardware. A phone becomes its eyes and voice; a laptop becomes a shared build surface that turns the conversation into a clear physical next action and a verification signal.

![Warden’s live companion surface](Warden/docs/assets/warden-live-companion.png)

## Why Warden

Robotics and real-world engineering need agents that understand more than text. Warden works in a practical loop:

1. **See** a user-approved workbench frame and read visible parts, labels, pin names, codes, and I²C addresses.
2. **Reason** about the stated goal with calibrated confidence, asking for confirmation when the evidence is incomplete.
3. **Show** a concise source → connector → target diagram and the next safe action on a synchronized laptop companion.
4. **Verify** with Raspberry Pi telemetry—or a clearly labeled deterministic mock when hardware is unavailable.

## AI stack

- **ElevenLabs** for low-latency conversational voice.
- **OpenAI Astra** as the primary coaching model, with **OpenRouter** as an OpenAI-compatible model-routing fallback.
- **Claude** for optional vision/OCR observations and structured companion planning.
- **Exa** for optional source discovery across datasheets, manuals, and pinouts.
- **OpenAI Codex** was used as an engineering copilot to build, test, iterate on, and document Warden.

Warden is designed to be honest about uncertainty: it does not invent unreadable labels, unsafe wiring instructions, or physical verification it cannot support.

## Run locally

```bash
cd Warden
npm install && npm run dev
```

Run the local Pi bridge in a second terminal:

```bash
cd Warden/bridge
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8787
```

See the [full Warden README](Warden/README.md) for configuration, mock mode, safety constraints, architecture, and the 90-second demo script.
