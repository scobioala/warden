import http from "node:http";
import { readMessage } from "./stream.mjs";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "node:url";
import path from "node:path";
const base = path.dirname(fileURLToPath(import.meta.url));
const parts = JSON.parse(await readFile(path.join(base, "parts.json"), "utf8"));
const system = await readFile(path.join(base, "system.txt"), "utf8");
const sessions = new Map(),
  pending = new Map();
const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
};
const body = async (req) => {
  let s = "";
  for await (const c of req) {
    s += c;
    if (s.length > 1_500_000) throw Error("Request too large");
  }
  return JSON.parse(s || "{}");
};
const emit = (s, event) => {
  for (const c of s.clients) c.write(`data: ${JSON.stringify(event)}\n\n`);
};
function record(s, name, args, result, id = randomUUID()) {
  const row = {
    id,
    time: new Date().toISOString(),
    name,
    args,
    result,
  };
  s.logs = s.logs.filter((entry) => entry.id !== id);
  s.logs.push(row);
  s.logs = s.logs.slice(-200);
  emit(s, { type: "tool", row });
}
async function rpc(s, name, args = {}) {
  if (!s.socket || s.socket.readyState !== 1)
    throw Error("Device offline. No hardware reading is available.");
  const id = randomUUID();
  record(s, name, args, { status: "awaiting device result" }, id);
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => {
        pending.delete(id);
        reject(Error("Device operation timed out"));
      },
      (args.timeout_ms || 10000) + 5000,
    );
    pending.set(id, { resolve, reject, timer, session: s });
    s.socket.send(JSON.stringify({ id, name, args }));
  }).catch((error) => ({ error: error.message }));
  record(s, name, args, result, id);
  if (result.error) throw Error(result.error);
  return result;
}
async function scan(s) {
  if (s.scanning || !s.socket || s.socket.readyState !== 1) return;
  s.scanning = true;
  try {
    const r = await rpc(s, "i2c_scan");
    s.scanError = null;
    s.scanCompleted = true;
    s.devices = await Promise.all(
      r.addresses.map(async (address) => {
        const part = parts[address];
        if (!part)
          return {
            address,
            name: "Unknown I2C device",
            state: "PRESENT",
            values: {},
          };
        try {
          const read = await rpc(s, "read_device", { address });
          return { address, name: part.name, state: "VERIFIED", values: read };
        } catch (e) {
          return {
            address,
            name: part.name,
            state: "READ FAILED",
            values: { error: e.message },
          };
        }
      }),
    );
  } catch (e) {
    s.scanError = e.message;
    s.devices = [];
  } finally {
    s.scanning = false;
    emit(s, { type: "state", state: state(s) });
  }
}
const state = (s) => ({
  agent: !!process.env.ANTHROPIC_API_KEY,
  online: s.socket?.readyState === 1,
  info: s.info,
  devices: s.devices,
  scanError: s.scanError,
  scanCompleted: !!s.scanCompleted,
  pending: s.physical,
});
const toolDefs = [
  ["i2c_scan", "Read actual i2cdetect grid and responding addresses", {}],
  [
    "read_device",
    "Read a supported sensor",
    { address: { type: "string", enum: Object.keys(parts) } },
  ],
  [
    "set_led",
    "Set Qwiic Button brightness",
    {
      address: { type: "string", enum: ["0x6e", "0x6f"] },
      brightness: { type: "integer", minimum: 0, maximum: 255 },
    },
  ],
  [
    "wait_for_event",
    "Wait for a new button press",
    {
      address: { type: "string", enum: ["0x6e", "0x6f"] },
      instruction: { type: "string" },
      timeout_ms: { type: "integer", minimum: 1000, maximum: 60000 },
    },
  ],
  [
    "readdress_button",
    "Change address of the single connected button",
    {
      address: { type: "string", enum: ["0x6e", "0x6f"] },
      new_address: { type: "string", enum: ["0x6e", "0x6f"] },
    },
  ],
  [
    "system_state",
    "Read Pi hostname, IP, temperature, and connection state",
    {},
  ],
  ["lookup_part", "Return the supported parts database", {}],
].map(([name, description, properties]) => ({
  name,
  description,
  input_schema: {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  },
}));
async function chat(s, message) {
  if (s.busy) throw Error("An instruction is already in progress.");
  if (!process.env.ANTHROPIC_API_KEY)
    throw Error(
      "Agent is not configured. Set ANTHROPIC_API_KEY on the agent server.",
    );
  s.busy = true;
  s.messages.push({ role: "user", content: message });
  try {
    for (let turn = 0; turn < 12; turn++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: 1400,
          stream: true,
          system,
          tools: toolDefs,
          messages: s.messages,
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok)
        throw Error(`Agent provider returned ${response.status}`);
      const data = await readMessage(response, (text) => emit(s, { type: "message", text }));
      s.messages.push({ role: "assistant", content: data.content });
      const calls = data.content.filter((x) => x.type === "tool_use");
      if (!calls.length) return;
      const results = [];
      for (const c of calls) {
        let result;
        try {
          if (c.name === "lookup_part") {
            result = parts;
            record(s, c.name, c.input, result);
          } else if (c.name === "system_state") {
            result =
              s.socket?.readyState === 1
                ? await rpc(s, c.name)
                : { online: false };
          } else {
            if (!toolDefs.some((t) => t.name === c.name))
              throw Error("Unknown operation");
            if (c.name === "wait_for_event") {
              s.physical = {
                instruction: c.input.instruction,
                address: c.input.address,
                started: Date.now(),
                timeout_ms: c.input.timeout_ms,
              };
              emit(s, { type: "state", state: state(s) });
            }
            result = await rpc(s, c.name, c.input);
            if (c.name === "wait_for_event") {
              s.physical = { ...s.physical, result };
              emit(s, { type: "state", state: state(s) });
            }
          }
        } catch (e) {
          result = { error: e.message };
          record(s, c.name, c.input, result);
          if (c.name === "wait_for_event") {
            s.physical = { ...s.physical, result };
            emit(s, { type: "state", state: state(s) });
          }
        }
        results.push({
          type: "tool_result",
          tool_use_id: c.id,
          content: JSON.stringify(result),
          is_error: !!result.error,
        });
      }
      s.messages.push({ role: "user", content: results });
    }
    throw Error("Operation limit reached. Please send your next instruction.");
  } finally {
    s.busy = false;
  }
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/api/session") {
      const token = randomBytes(24).toString("hex"),
        code = randomBytes(3).toString("hex").toUpperCase();
      const s = {
        token,
        code,
        created: Date.now(),
        clients: new Set(),
        devices: [],
        messages: [],
        logs: [],
        info: null,
        physical: null,
      };
      sessions.set(token, s);
      return json(res, 200, { token, code });
    }
    const token =
      url.searchParams.get("token") ||
      req.headers.authorization?.replace("Bearer ", "");
    const s = sessions.get(token);
    if (!s)
      return json(res, 401, { error: "Session expired. Start setup again." });
    if (req.method === "GET" && url.pathname === "/api/state")
      return json(res, 200, { ...state(s), logs: s.logs });
    if (req.method === "GET" && url.pathname === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(
        `data: ${JSON.stringify({ type: "state", state: state(s) })}\n\n`,
      );
      s.clients.add(res);
      req.on("close", () => s.clients.delete(res));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const { message } = await body(req);
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 8000
      )
        return json(res, 400, {
          error: "Enter a message under 8,000 characters.",
        });
      await chat(s, message);
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/tts") {
      const { text } = await body(req);
      if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID)
        return json(res, 503, { error: "Voice provider not configured" });
      const r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID)}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: String(text).slice(0, 4000),
            model_id: "eleven_flash_v2_5",
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!r.ok) return json(res, 502, { error: "Voice unavailable" });
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (req.method === "POST" && url.pathname === "/api/vision") {
      const { image } = await body(req);
      if (typeof image !== "string" || !/^data:image\/jpeg;base64,/.test(image))
        return json(res, 400, { error: "JPEG required" });
      if (!process.env.ANTHROPIC_API_KEY)
        return json(res, 503, { error: "Agent is not configured" });
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: 300,
          system:
            'Identify possible Qwiic/STEMMA QT hardware. Camera is never verification. Return JSON only: {"guess": string, "confidence": number from 0 to 100}.',
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: image.split(",")[1],
                  },
                },
                { type: "text", text: "What hardware may be on this bench?" },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw Error(`Vision provider returned ${r.status}`);
      const data = await r.json();
      const raw = data.content.find((c) => c.type === "text")?.text || "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw Error("Could not interpret camera response");
      const result = JSON.parse(match[0]);
      return json(res, 200, {
        guess: String(result.guess),
        confidence: Math.min(100, Math.max(0, Number(result.confidence) || 0)),
      });
    }
    return json(res, 404, { error: "Not found" });
  } catch (e) {
    json(res, 503, { error: e.message });
  }
});
const wss = new WebSocketServer({
  server,
  path: "/api/device",
  maxPayload: 1_500_000,
});
wss.on("connection", (socket) => {
  let session;
  const timer = setTimeout(() => socket.close(1008, "Pairing required"), 10000);
  socket.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw);
      if (!session) {
        session = [...sessions.values()].find(
          (s) =>
            s.code === message.code &&
            Date.now() - s.created < 15 * 60 * 1000 &&
            !s.socket,
        );
        if (!session)
          return socket.close(1008, "Invalid or expired pairing code");
        clearTimeout(timer);
        session.socket = socket;
        session.info = message.info;
        socket.send(JSON.stringify({ type: "paired" }));
        emit(session, { type: "state", state: state(session) });
        await scan(session);
        return;
      }
      const p = pending.get(message.id);
      if (p && p.session === session) {
        clearTimeout(p.timer);
        pending.delete(message.id);
        p.resolve(message.result);
      }
    } catch {
      socket.close(1008, "Invalid message");
    }
  });
  socket.on("close", () => {
    clearTimeout(timer);
    if (session) {
      session.socket = null;
      session.devices = [];
      session.scanCompleted = false;
      for (const [id, p] of pending)
        if (p.session === session) {
          clearTimeout(p.timer);
          p.reject(Error("Device disconnected"));
          pending.delete(id);
        }
      emit(session, { type: "state", state: state(session) });
    }
  });
});
setInterval(() => {
  for (const s of sessions.values()) scan(s);
}, 3000).unref();
setInterval(() => {
  for (const s of sessions.values())
    for (const c of s.clients) c.write(": heartbeat\n\n");
}, 15000).unref();
server.listen(Number(process.env.PORT) || 8788, "0.0.0.0", () =>
  console.log("Warden agent listening on :" + (process.env.PORT || 8788)),
);
