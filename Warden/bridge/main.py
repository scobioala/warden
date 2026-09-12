"""Warden Raspberry Pi bridge. Defaults to a deterministic, no-hardware mock."""
from __future__ import annotations
import asyncio, os, json
from typing import Any
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from urllib.parse import urlencode
from urllib.request import Request, urlopen

def load_local_env() -> None:
    """Load local bridge variables without adding a dotenv dependency."""
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_file): return
    for line in open(env_file, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_local_env()

app = FastAPI(title="Warden Pi Bridge")
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("WARDEN_WEB_ORIGIN", "http://localhost:5173")], allow_methods=["*"], allow_headers=["*"])
state = {"mode": os.getenv("WARDEN_MODE", "mock"), "online": True, "i2c": ["0x3C · Mini PiTFT", "0x6E · Qwiic Button", "0x36 · Rotary Encoder"], "apds9960": {"detected": False, "address": "0x39", "gesture": "waiting", "proximity": 0}, "button": {"pressed": False, "led": "off"}, "encoder": {"position": 0}, "pitft": "WARDEN READY"}
SYSTEM = """You are Warden, a calm, natural voice companion at a Raspberry Pi workbench. Start general and friendly: if the learner greets you or asks if you can hear them, answer naturally and ask, 'How can I help you today?' Do not force a build mission from a greeting. Once they state a goal such as assembling or building something, guide one safe physical action at a time. If camera_live is false, first tell them to open the camera and show the relevant part; do not give a physical placement instruction before that view. If a camera frame is present and it is clear, say what you can actually see, then tell them the next action. Never claim to see a component without an image. The Pi state is mock/demo state unless explicitly marked real: say it is a simulated console, not a physical observation. Speak like a helpful person beside the learner, not a chatbot or manual. Use short spoken sentences, no markdown, no emojis, and never more than three sentences. Help with low-voltage hobby hardware only. Never provide mains, battery-pack, high-current, unsafe, or unverified wiring instructions. If camera recognition is uncertain, ask for one specific view adjustment. Every hardware action must have one verification signal."""

class CoachRequest(BaseModel):
    message: str
    hardware: dict[str, Any] = {}
    image: str | None = None
    mission: str | None = None
    current_step: str | None = None

def local_coach(message: str) -> str:
    text = message.lower()
    if "i2c" in text or "sensor" in text:
        return "I can see the Pi’s I²C scan. Keep power off while reseating a Qwiic cable, then reconnect it firmly—never force it. Next, scan again; a detected address is the verification signal."
    if "image" in text or "inspect" in text:
        return "I can’t confidently identify a component in mock vision. Place one part flat, label-side up, centered in bright light, then inspect again."
    return "Tell me what you want to build or what changed on the bench. I’ll suggest one low-voltage next action and the Pi signal that can verify it."

def anthropic_coach(request: CoachRequest) -> str:
    """Claude fallback. Camera frames stay user-triggered and are never persisted here."""
    from anthropic import Anthropic
    content: list[dict[str, Any]] = [{"type": "text", "text": f"Learner asks: {request.message}\nBuild mission: {request.mission or 'none'}\nCurrent instruction: {request.current_step or 'none'}\nPi state: {state}\nBrowser state: {request.hardware}"}]
    if request.image:
        header, payload = request.image.split(",", 1)
        media_type = "image/png" if "image/png" in header else "image/jpeg"
        content.insert(0, {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": payload}})
    response = Anthropic().messages.create(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"), max_tokens=350, system=SYSTEM, messages=[{"role": "user", "content": content}])
    return "".join(block.text for block in response.content if block.type == "text")

def anthropic_content(request: CoachRequest) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = [{"type": "text", "text": f"Learner asks: {request.message}\nBuild mission: {request.mission or 'none'}\nCurrent instruction: {request.current_step or 'none'}\nPi state: {state}\nBrowser state: {request.hardware}"}]
    if request.image:
        header, payload = request.image.split(",", 1)
        content.insert(0, {"type": "image", "source": {"type": "base64", "media_type": "image/png" if "image/png" in header else "image/jpeg", "data": payload}})
    return content

def snapshot(): return state

@app.get("/elevenlabs/session")
def elevenlabs_session():
    """Issue a short-lived private WebRTC session URL; the ElevenLabs key never leaves this bridge."""
    api_key, agent_id = os.getenv("ELEVENLABS_API_KEY"), os.getenv("ELEVENLABS_AGENT_ID")
    if not api_key or not agent_id:
        return {"error": "ElevenLabs is not configured"}
    try:
        url = "https://api.elevenlabs.io/v1/convai/conversation/token?" + urlencode({"agent_id": agent_id})
        req = Request(url, headers={"xi-api-key": api_key})
        with urlopen(req, timeout=15) as response:
            return {"conversation_token": json.loads(response.read())["token"], "agent_id": agent_id}
    except Exception:
        return {"error": "Could not start the voice agent"}

@app.get("/health")
def health(): return {"ok": True, "mode": state["mode"]}

@app.get("/status")
def status(): return snapshot()

@app.post("/coach")
def coach(request: CoachRequest):
    """Astra-powered text + optional camera-frame coaching; remains useful without an API key."""
    if os.getenv("OPENAI_API_KEY"):
        try:
            from openai import OpenAI
            content: list[dict[str, Any]] = [{"type": "input_text", "text": f"Learner asks: {request.message}\nBuild mission: {request.mission or 'none'}\nCurrent instruction: {request.current_step or 'none'}\nPi state: {state}\nBrowser state: {request.hardware}"}]
            if request.image: content.append({"type": "input_image", "image_url": request.image, "detail": "low"})
            response = OpenAI().responses.create(model="gpt-6-astra", reasoning={"effort": "low"}, instructions=SYSTEM, input=[{"role":"user", "content":content}])
            return {"answer": response.output_text, "model": "gpt-6-astra", "provider": "openai", "vision": bool(request.image)}
        except Exception:
            pass  # Continue to the configured secondary provider.
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            return {"answer": anthropic_coach(request), "model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"), "provider": "anthropic", "vision": bool(request.image)}
        except Exception:
            pass
    return {"answer": local_coach(request.message), "model": "local-safe-fallback", "provider": "local", "vision": bool(request.image)}

@app.post("/coach/stream")
def coach_stream(request: CoachRequest):
    """Stream short Claude coaching into the camera overlay for a responsive voice experience."""
    def events():
        if not os.getenv("ANTHROPIC_API_KEY"):
            yield f"data: {json.dumps({'delta': local_coach(request.message), 'done': True})}\n\n"; return
        try:
            from anthropic import Anthropic
            with Anthropic().messages.stream(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"), max_tokens=180, system=SYSTEM + " Keep the response under 70 words.", messages=[{"role":"user", "content":anthropic_content(request)}]) as stream:
                for delta in stream.text_stream:
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
            yield f"data: {json.dumps({'done': True, 'provider': 'anthropic'})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'delta': local_coach(request.message), 'done': True, 'provider': 'local'})}\n\n"
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control":"no-cache", "X-Accel-Buffering":"no"})

@app.post("/demo/{event}")
def demo(event: str):
    if event == "connect":
        state["apds9960"].update(detected=True, gesture="ready")
        if "0x39 · APDS9960" not in state["i2c"]: state["i2c"].append("0x39 · APDS9960")
        state["button"]["led"] = "green"; state["pitft"] = "VERIFIED"
    elif event == "wave": state["apds9960"]["gesture"] = "up"
    elif event == "confirm": state["encoder"]["position"] += 1; state["button"]["pressed"] = True
    return snapshot()

@app.websocket("/ws")
async def websocket_status(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.send_json(snapshot())
            await asyncio.sleep(.5)
    except Exception:
        pass

# Real mode integration point: initialize board.I2C(), APDS9960, seesaw rotary/button,
# and PiTFT here. Never attach or document mains wiring; this bridge is for the listed 3.3V Qwiic kit.
