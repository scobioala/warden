import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { WebSocket } from "ws";

test("unpaired sessions never manufacture bus data; credentials gate reasoning and voice", async () => {
  const child = spawn(process.execPath, ["agent/server.mjs"], {
    env: {
      ...process.env,
      PORT: "18788",
      ANTHROPIC_API_KEY: "",
      ELEVENLABS_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await Promise.race([
      once(child.stdout, "data"),
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("Server did not start")), 5000).unref(),
      ),
    ]);
    const root = "http://127.0.0.1:18788/api/";
    assert.equal((await fetch(root + "state")).status, 401);
    const session = await (
      await fetch(root + "session", { method: "POST" })
    ).json();
    assert.match(session.code, /^[A-F0-9]{6}$/);
    const headers = {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    };
    const state = await (await fetch(root + "state", { headers })).json();
    assert.equal(state.online, false);
    assert.equal(state.agent, false);
    assert.deepEqual(state.devices, []);
    assert.deepEqual(state.logs, []);
    const chat = await fetch(root + "chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ message: "Scan the bus" }),
    });
    assert.equal(chat.status, 503);
    assert.match((await chat.json()).error, /not configured/);
    assert.equal(
      (await fetch(root + "chat", { method: "POST", headers, body: "{}" }))
        .status,
      400,
    );
    assert.equal(
      (
        await fetch(root + "tts", {
          method: "POST",
          headers,
          body: '{"text":"hello"}',
        })
      ).status,
      503,
    );
    assert.equal(
      (
        await fetch(root + "vision", {
          method: "POST",
          headers,
          body: '{"image":"bad"}',
        })
      ).status,
      400,
    );
    const ws = new WebSocket("ws://127.0.0.1:18788/api/device");
    await once(ws, "open");
    ws.send(JSON.stringify({ code: "INVALID" }));
    const [code] = await once(ws, "close");
    assert.equal(code, 1008);
    const after = await (await fetch(root + "state", { headers })).json();
    assert.equal(after.online, false);
    assert.deepEqual(after.devices, []);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  }
});
