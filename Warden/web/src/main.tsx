import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  Copy,
  Cpu,
  Eye,
  Github,
  Mic,
  Radio,
  ScanLine,
  Shield,
  Terminal,
  Unplug,
  Volume2,
  VolumeX,
  X,
  Camera,
  Cable,
  Command,
} from "lucide-react";
import "./styles.css";

type Device = {
  address: string;
  name: string;
  state: string;
  values: Record<string, unknown>;
};
type Physical = {
  instruction: string;
  address: string;
  started: number;
  timeout_ms: number;
  result?: { fired?: boolean; elapsed_ms?: number; error?: string };
};
type State = {
  agent: boolean;
  online: boolean;
  info?: { hostname: string; ip: string; temperature: number | null };
  devices: Device[];
  scanError?: string;
  scanCompleted?: boolean;
  pending?: Physical;
};
type Log = {
  id: string;
  time: string;
  name: string;
  args: unknown;
  result: unknown;
};
const initial: State = { agent: false, online: false, devices: [] };
const repo = "https://github.com/scobioala/warden";
const install = `git clone ${repo}.git && cd warden/Warden\npython3 -m venv device/.venv && device/.venv/bin/pip install -r device/requirements.txt`;
function Logo() {
  return (
    <a className="brand" href="#" aria-label="Warden home">
      <span className="brand-mark">
        <Shield size={21} />
      </span>
      warden<span className="brand-period">.</span>
    </a>
  );
}
function Board() {
  return (
    <div className="instrument">
      <div className="instrument-top">
        <span>ILLUSTRATIVE SEQUENCE</span>
      </div>
      <svg
        viewBox="0 0 600 335"
        role="img"
        aria-label="Illustration: Raspberry Pi detects an address collision and verifies separate addresses"
      >
        <defs>
          <pattern
            id="dots"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".7" fill="#53635c" opacity=".3" />
          </pattern>
        </defs>
        <rect width="600" height="335" fill="url(#dots)" />
        <g fill="none" stroke="#5d756a" strokeWidth="1">
          <path
            className="cable"
            d="M276 130H314Q340 130 340 98V84Q340 66 366 66H405"
          />
          <path className="cable" d="M276 165H405" />
          <path
            className="cable"
            d="M276 200H314Q340 200 340 247Q340 266 366 266H405"
          />
          <rect x="77" y="68" width="199" height="202" rx="11" fill="#17221c" />
          <circle cx="90" cy="81" r="4" />
          <circle cx="263" cy="81" r="4" />
          <circle cx="90" cy="257" r="4" />
          <circle cx="263" cy="257" r="4" />
          <rect x="117" y="124" width="81" height="77" rx="3" fill="#0e1511" />
          <rect x="127" y="134" width="61" height="57" rx="1" />
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i}>
              <path d={`M${123 + i * 6} 118v6 M${123 + i * 6} 201v6`} />
            </g>
          ))}
          <rect x="98" y="87" width="154" height="19" rx="2" />
          {Array.from({ length: 20 }, (_, i) => (
            <g key={i} fill="#84928b">
              <rect x={103 + i * 7.4} y="92" width="2" height="3" />
              <rect x={103 + i * 7.4} y="99" width="2" height="3" />
            </g>
          ))}
          <rect x="66" y="121" width="24" height="28" rx="2" fill="#222b26" />
          <rect x="65" y="163" width="25" height="40" rx="2" fill="#222b26" />
          <rect x="104" y="250" width="28" height="28" rx="2" fill="#222b26" />
          <rect x="145" y="254" width="28" height="24" rx="2" fill="#222b26" />
          <rect x="221" y="119" width="37" height="26" rx="2" />
          <rect x="218" y="207" width="39" height="35" rx="2" />
          <path
            d="M202 155h34v40h22 M113 214h40v22h44v-20 M101 120v105h26"
            opacity=".5"
          />
        </g>
        <g fontFamily="monospace" fontSize="9" fill="#7f9588">
          <text x="133" y="166">
            BROADCOM
          </text>
          <text x="145" y="180" fontSize="7">
            BCM2712
          </text>
          <text x="106" y="237">
            RASPBERRY PI 5
          </text>
          <text x="91" y="301">
            HOST / I2C-1
          </text>
        </g>
        {[66, 165, 266].map((y, i) => (
          <g key={y} className={i === 2 ? "collision-node" : ""}>
            <rect
              x="405"
              y={y - 29}
              width="112"
              height="58"
              rx="5"
              fill="#142019"
              stroke="#526b5c"
            />
            <circle cx="419" cy={y - 16} r="2" fill="#708879" />
            <rect
              x="421"
              y={y - 7}
              width="14"
              height="14"
              rx="2"
              fill="#0a100c"
              stroke="#526b5c"
            />
            <text
              x="448"
              y={y + 5}
              fill="#b3c2b8"
              fontFamily="monospace"
              fontSize="15"
              className={i === 2 ? "address-before" : ""}
            >
              {["0x39", "0x36", "0x6F"][i]}
            </text>
            {i === 2 && (
              <>
                <text
                  x="448"
                  y={y + 5}
                  className="address-after"
                  fill="#4ade80"
                  fontFamily="monospace"
                  fontSize="15"
                >
                  0x6E
                </text>
                <rect
                  className="ghost"
                  x="418"
                  y={y - 39}
                  width="112"
                  height="58"
                  rx="5"
                  fill="none"
                  stroke="#fbbf24"
                />
                <text
                  className="ghost"
                  x="533"
                  y={y - 21}
                  fill="#fbbf24"
                  fontFamily="monospace"
                  fontSize="10"
                >
                  0x6F
                </text>
              </>
            )}
          </g>
        ))}
        <text
          x="362"
          y="318"
          fontSize="10"
          fill="#fbbf24"
          fontFamily="monospace"
          className="collision-caption"
        >
          address collision detected
        </text>
      </svg>
      <div className="terminal-preview">
        <div>
          <span>01</span>
          <b>→</b> i2c_scan <i>0x36, 0x39, 0x6f</i>
        </div>
        <div>
          <span>02</span>
          <b>→</b> wait_for_event(button) <i>fired, 2140ms</i>
        </div>
        <div>
          <span>03</span>
          <b>↳</b> <em>verified</em>
          <span className="terminal-caret" />
        </div>
      </div>
    </div>
  );
}
function Landing({ start }: { start: () => void }) {
  return (
    <div className="landing">
      <header>
        <Logo />
        <button className="nav-button" onClick={start}>
          Open workbench <ArrowUpRight size={14} />
        </button>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> AGENTIC HARDWARE DEBUGGER
          </div>
          <h1>
            It can’t see
            <br />
            your bench.
            <br />
            <span>So it checks.</span>
          </h1>
          <p>
            Your agent verifying hardware connections in real time. No guesswork.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={start}>
              Get started <ArrowRight size={17} />
            </button>
            <a href="#how-it-works">
              See how it works <ArrowDownIcon />
            </a>
          </div>
        </div>
        <Board />
      </section>
      <div className="manifesto"></div>
      <section className="problem">
        <div className="section-label">
          <span>01 / THE GAP</span>
          <span>DESIGN ≠ BUILD</span>
        </div>
        <div className="three-cards">
          {[
            [
              ScanLine,
              "Simulators assume you wired it right.",
              "They validate the design, not the build.",
            ],
            [
              AudioLines,
              "Chat assistants can’t check.",
              "They’ll tell you it should work.",
            ],
            [
              Cable,
              "Bring-up is where projects lose days.",
              "Wrong port. Disabled interface. Duplicate address.",
            ],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof ScanLine;
            return (
              <article key={i}>
                <I size={22} />
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
                <span className="card-index">0{i + 1}</span>
              </article>
            );
          })}
        </div>
      </section>
      <section id="how-it-works" className="how">
        <div className="section-label">
          <span>02 / THE PROCESS</span>
          <span>ONE STEP. THEN PROOF.</span>
        </div>
        <h2>From first wire to first signal.</h2>
        <div className="steps">
          {[
            [
              Terminal,
              "Install on your Pi",
              "One command. No dependencies to chase.",
            ],
            [
              Command,
              "Say what you’re building",
              "Use your voice. Or just type.",
            ],
            [
              Cable,
              "Wire one thing",
              "One instruction. The right device lights up.",
            ],
            [
              Radio,
              "It verifies",
              "Reads the bus. Shows the result. Explains it.",
            ],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof Terminal;
            return (
              <article key={i}>
                <div>
                  <span>0{i + 1}</span>
                  <I size={20} />
                </div>
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="honesty">
        <div>
          <div className="section-label">03 / OPERATING PRINCIPLES</div>
          <h2>What it won’t do.</h2>
          <p>
            Trust is a constraint.
            <br />
            Not a feature we added later.
          </p>
        </div>
        <ul>
          <li>
            <span>01</span>
            <div>
              No simulated sensor data.
              <small>If the bus is empty, it says the bus is empty.</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              No arbitrary code execution.
              <small>
                Named, typed operations only. Your hardware stays yours.
              </small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              No confident guesses.
              <small>The raw reading comes before the conclusion.</small>
            </div>
          </li>
        </ul>
      </section>
      <section className="audiences">
        <div className="section-label">04 / MADE FOR THE BENCH</div>
        <div>
          <article>
            <span className="mono">FOR CLASSROOMS</span>
            <h2>
              Less waiting.
              <br />
              More building.
            </h2>
            <p>
              Students stop waiting for a TA to spot a swapped cable. Give every
              bench a patient second check.
            </p>
          </article>
          <article>
            <span className="mono">FOR ENGINEERING TEAMS</span>
            <h2>
              First build.
              <br />
              Fewer unknowns.
            </h2>
            <p>
              Bring-up and commissioning. The space between “design approved”
              and “first build works.”
            </p>
          </article>
        </div>
      </section>
      <footer>
        <Logo />
        <span>One instruction. One reading. Proof.</span>
        <a href={repo} target="_blank" rel="noreferrer">
          <Github size={16} /> GitHub <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}
function ArrowDownIcon() {
  return <ChevronDown size={13} />;
}
function Code({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      <pre>{text}</pre>
      <button
        aria-label="Copy command"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
function App() {
  const [page, setPage] = useState(
      location.hash === "#workbench" ? "workbench" : "landing",
    ),
    [step, setStep] = useState(1),
    [session, setSession] = useState<{ token: string; code: string } | null>(
      () => {
        try {
          return JSON.parse(sessionStorage.getItem("warden") || "null");
        } catch {
          return null;
        }
      },
    ),
    [state, setState] = useState<State>(initial),
    [logs, setLogs] = useState<Log[]>([]),
    [messages, setMessages] = useState<{ role: string; text: string }[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [camera, setCamera] = useState(false),
    [vision, setVision] = useState<{
      guess: string;
      confidence: number;
    } | null>(null),
    [analyzing, setAnalyzing] = useState(false),
    [muted, setMuted] = useState(true),
    [voiceNote, setVoiceNote] = useState(""),
    [listening, setListening] = useState(false),
    [now, setNow] = useState(Date.now());
  const stream = useRef<MediaStream | null>(null),
    video = useRef<HTMLVideoElement>(null),
    muteRef = useRef(true),
    audio = useRef<HTMLAudioElement | null>(null),
    speechQueue = useRef<Promise<void>>(Promise.resolve()),
    recognition = useRef<any>(null),
    logEnd = useRef<HTMLDivElement>(null),
    messageEnd = useRef<HTMLDivElement>(null);
  async function api(path: string, data?: unknown) {
    const r = await fetch("/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.token}`,
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "Agent unavailable");
    return result;
  }
  async function start() {
    setPage("onboarding");
    setError("");
    if (!session)
      try {
        const r = await fetch("/api/session", { method: "POST" });
        if (!r.ok) throw Error();
        const s = await r.json();
        setSession(s);
        sessionStorage.setItem("warden", JSON.stringify(s));
      } catch {
        setError(
          "Agent server unavailable. Start the agent service, then retry pairing.",
        );
      }
  }
  async function speak(text: string) {
    if (muteRef.current) return;
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw Error();
      const url = URL.createObjectURL(await r.blob());
      if (muteRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const player = new Audio(url);
      audio.current = player;
      try {
        await new Promise<void>((resolve, reject) => {
          player.onended = () => resolve();
          player.onpause = () => resolve();
          player.onerror = () => reject(new Error("Audio playback failed"));
          void player.play().catch(reject);
        });
      } finally { URL.revokeObjectURL(url); }
    } catch {
      if (muteRef.current) return;
      setVoiceNote("VOICE / browser fallback");
      if ("speechSynthesis" in window) {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          speechSynthesis.speak(utterance);
        });
      }
    }
  }
  useEffect(() => {
    const route = () => {
      if (!location.hash) setPage("landing");
    };
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    muteRef.current = muted;
    if (muted) {
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    }
  }, [muted]);
  useEffect(() => {
    if (!session) return;
    api("state")
      .then((s) => {
        setState(s);
        setLogs(s.logs);
      })
      .catch((e) => setError(e.message));
    const events = new EventSource(`/api/events?token=${session.token}`);
    events.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "state") setState(data.state);
      if (data.type === "tool")
        setLogs((l) =>
          [...l.filter((x) => x.id !== data.row.id), data.row].slice(-200),
        );
      if (data.type === "message") {
        setMessages((m) => [...m, { role: "agent", text: data.text }]);
        speechQueue.current = speechQueue.current.then(() => speak(data.text)).catch(() => {});
      }
    };
    events.onerror = () => {
      setState(initial);
      setError("Connection to the agent server lost. Reconnecting…");
    };
    events.onopen = () => setError("");
    return () => events.close();
  }, [session]);
  useEffect(() => {
    if (camera && video.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => {});
    }
  }, [camera, page]);
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      recognition.current?.stop();
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [logs]);
  useEffect(() => {
    messageEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function toggleCamera() {
    if (camera) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setCamera(false);
      setVision(null);
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCamera(true);
      setError("");
    } catch {
      setError(
        "Camera permission unavailable. You can continue with text and I²C.",
      );
    }
  }
  async function analyze() {
    if (!video.current || !video.current.videoWidth) return;
    setAnalyzing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = Math.round(
        (640 * video.current.videoHeight) / video.current.videoWidth,
      );
      canvas
        .getContext("2d")!
        .drawImage(video.current, 0, 0, canvas.width, canvas.height);
      setVision(
        await api("vision", { image: canvas.toDataURL("image/jpeg", 0.7) }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }
  async function send(text = input) {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      await api("chat", { message: text });
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }
  function listen() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const R =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!R) {
      setError(
        "Speech recognition is unavailable in this browser. Text input is ready.",
      );
      return;
    }
    const r = new R();
    recognition.current = r;
    r.lang = "en-US";
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      setError("Microphone unavailable. You can type your instruction.");
    };
    r.onresult = (e: any) => setInput(e.results[0][0].transcript);
    r.start();
  }
  const enter = () => {
    setPage("workbench");
    location.hash = "workbench";
  };
  if (page === "landing") return <Landing start={start} />;
  return (
    <div className={page === "workbench" ? "app-frame" : "setup-frame"}>
      <header>
        <Logo />
        <div className="header-status">
          <span
            className={state.agent ? "status agent-ready" : "status failed"}
          >
            <i />
            {state.agent ? "AGENT READY" : "AGENT OFFLINE"}
          </span>
          <span className={state.online ? "status verified" : "status failed"}>
            <i />
            DEVICE {state.online ? "CONNECTED" : "OFFLINE"}
          </span>
          {state.online && <span className="mono">{state.info?.ip}</span>}
          <button
            className="icon-button"
            title={muted ? "Enable voice" : "Mute voice"}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      </header>
      {error && (
        <div className="error-banner">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {page === "onboarding" ? (
        <main className="onboarding">
          <div className="eyebrow">BENCH SETUP / ABOUT TWO MINUTES</div>
          <h1>
            Let’s establish
            <br />a connection.
          </h1>
          <p className="setup-intro">
            Start with the hardware. We’ll take it from there.
          </p>
          <section className={"setup-panel " + (step === 1 ? "active" : "")}>
            <div className="panel-heading">
              <span>01</span>
              <h2>Install the agent on your Pi.</h2>
              {step > 1 && <Check size={18} />}
            </div>
            <p>
              A small Python service that reads your I²C bus through named
              operations.
            </p>
            <Code text={install} />
            <details>
              <summary>
                Manual install details <ChevronDown size={14} />
              </summary>
              <p>
                These changes must first be pushed to the repository or copied
                to your Pi. Run the commands on a Raspberry Pi with Python 3 and
                I²C enabled. The checkout creates a virtual environment; it does
                not modify your system Python.
              </p>
              <Code text="sudo apt-get install -y git python3-venv python3-dev i2c-tools libgpiod-dev\nsudo raspi-config # Interface Options → I2C → Enable" />
            </details>
            {step === 1 && (
              <button className="primary" onClick={() => setStep(2)}>
                Installed. Continue <ArrowRight size={16} />
              </button>
            )}
          </section>
          {step >= 2 && (
            <section className="setup-panel active">
              <div className="panel-heading">
                <span>02</span>
                <h2>Pair your device.</h2>
              </div>
              {state.online ? (
                <div className="connected">
                  <Check size={21} />
                  <div>
                    <strong>Device connected</strong>
                    <p className="mono">
                      {state.info?.hostname} · {state.info?.ip} ·{" "}
                      {state.info?.temperature ?? "—"}°C
                    </p>
                    <span className="mono">
                      {state.scanError
                        ? `scan failed · ${state.scanError}`
                        : state.scanCompleted
                          ? `i2c-1 · ${state.devices.length} devices found`
                          : "i2c-1 · scanning…"}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pair-code">
                    {session
                      ? session.code.slice(0, 2) + "-" + session.code.slice(2)
                      : "— — — — — —"}
                  </div>
                  <p>
                    Run this on your Pi. Use this computer’s LAN address for the
                    agent URL.
                  </p>
                  <Code
                    text={`device/.venv/bin/python device/main.py pair ${session?.code || "<CODE>"} --agent http://<YOUR-COMPUTER-IP>:8788`}
                  />
                  <div className="waiting">
                    <span />
                    waiting for device…{" "}
                    <button
                      onClick={() => {
                        sessionStorage.removeItem("warden");
                        setSession(null);
                        setError("Pairing cleared.");
                      }}
                    >
                      Clear expired code
                    </button>
                  </div>
                  {!session && (
                    <button onClick={start}>Generate pairing code</button>
                  )}
                </>
              )}
              {step === 2 && (
                <button className="subtle-button" onClick={() => setStep(3)}>
                  {state.online ? "Continue" : "Continue without a device"}{" "}
                  <ArrowRight size={15} />
                </button>
              )}
            </section>
          )}
          {step >= 3 && (
            <section className="setup-panel active">
              <div className="panel-heading">
                <span>03</span>
                <h2>Optional: let it look at your bench.</h2>
              </div>
              <p>
                The camera is a hint. Warden always confirms over I²C before
                claiming anything works.
              </p>
              <button
                className="camera-switch"
                role="switch"
                aria-checked={camera}
                onClick={toggleCamera}
              >
                <Camera size={18} /> Bench camera{" "}
                <span className={"toggle " + (camera ? "enabled" : "")} />
                <span>{camera ? "ON" : "OFF"}</span>
              </button>
              <button className="primary" onClick={enter}>
                {camera ? "Enter the workbench" : "Skip and continue"}{" "}
                <ArrowRight size={16} />
              </button>
            </section>
          )}
          <button className="setup-skip" onClick={enter}>
            Explore the workbench <ArrowUpRight size={13} />
          </button>
        </main>
      ) : (
        <main className="workbench">
          <section className="conversation-column">
            <div className="workbench-heading">
              <div className="eyebrow">WORKBENCH / SESSION 01</div>
              <span className="mono">3.3V · QWIIC / STEMMA QT</span>
            </div>
            {camera && (
              <div className="camera-strip">
                <video ref={video} autoPlay muted playsInline />
                <button className="camera-chip" onClick={toggleCamera}>
                  CAMERA ON <X size={12} />
                </button>
                <button
                  className="analyze"
                  disabled={analyzing}
                  onClick={analyze}
                >
                  <Eye size={13} />
                  {analyzing ? "Analyzing…" : "Analyze frame"}
                </button>
              </div>
            )}
            {vision && (
              <div className="vision-note amber">
                <span className="mono">{vision.confidence}%</span> ·{" "}
                {vision.guess}
                <small>
                  {vision.confidence < 80
                    ? "low confidence — verifying over I²C instead"
                    : "Camera hint only — I²C verification required"}
                </small>
              </div>
            )}
            <div className="conversation">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-icon">
                    <Terminal size={27} />
                  </div>
                  <div className="eyebrow">READY WHEN YOU ARE</div>
                  <h1>
                    What’s on
                    <br />
                    your bench?
                  </h1>
                  <p>
                    Tell me what you’re building. I’ll guide one connection at a
                    time, then check the bus.
                  </p>
                  <div className="suggestions">
                    {[
                      "Scan my I²C bus",
                      "Help me connect a sensor",
                      "Two buttons, one address",
                    ].map((t) => (
                      <button key={t} onClick={() => send(t)}>
                        {t}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <article className={"message " + m.role} key={i}>
                    <span className="mono">
                      {m.role === "agent" ? "WARDEN" : "YOU"}
                    </span>
                    <p>{m.text}</p>
                  </article>
                ))
              )}
              {busy && <div className="thinking mono">Reading evidence…</div>}
              <div ref={messageEnd} />
            </div>
            {state.pending && (
              <div
                className={
                  "physical " +
                  (state.pending.result
                    ? state.pending.result.fired
                      ? "resolved verified"
                      : "resolved amber"
                    : "")
                }
              >
                <span className="mono">
                  {state.pending.result
                    ? "PHYSICAL CHECK"
                    : "YOUR TURN / AWAITING PHYSICAL ACTION"}
                </span>
                {state.pending.result ? (
                  <p className="mono">
                    {state.pending.result.error ||
                      (state.pending.result.fired
                        ? `fired · ${state.pending.result.elapsed_ms}ms`
                        : "timeout · no event")}
                  </p>
                ) : (
                  <>
                    <h2>{state.pending.instruction}</h2>
                    <div className="mono">
                      {state.pending.address} · LED requested{" "}
                      <span>
                        {Math.max(
                          0,
                          Math.ceil(
                            (state.pending.timeout_ms -
                              now +
                              state.pending.started) /
                              1000,
                          ),
                        )}
                        s remaining
                      </span>
                    </div>
                    <div className="countdown">
                      <i
                        style={{
                          width: `${Math.max(0, 100 * (1 - (now - state.pending.started) / state.pending.timeout_ms))}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="input-area">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <input
                  aria-label="Message Warden"
                  placeholder="Tell Warden what you’re building…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="button"
                  className={listening ? "listening" : ""}
                  onClick={listen}
                  aria-label={listening ? "Stop microphone" : "Use microphone"}
                >
                  <Mic size={18} />
                </button>
                <button
                  className="send"
                  disabled={!input.trim() || busy}
                  aria-label="Send message"
                >
                  <ArrowRight size={20} />
                </button>
              </form>
              <div>
                <span>
                  <span className="tiny-square" /> RAW READING BEFORE CONCLUSION
                </span>
                <button onClick={toggleCamera}>
                  <Camera size={13} />
                  {camera ? "Camera off" : "Enable camera"}
                </button>
              </div>
              {voiceNote && <small className="mono">{voiceNote}</small>}
            </div>
          </section>
          <aside className="evidence-column">
            <section className="live-panel">
              <div className="panel-title">
                <span>
                  <Cpu size={15} /> LIVE DEVICES
                </span>
                <span>
                  I2C-1 <i className="slash">/</i> 3s POLL
                </span>
              </div>
              <div className="device-list">
                {!state.online ? (
                  <div className="empty-state">
                    <Unplug size={26} />
                    <h3>Device offline</h3>
                    <p>
                      Pair a Raspberry Pi to read its bus.
                      <br />
                      No hardware data is available.
                    </p>
                    <button
                      onClick={() => {
                        setPage("onboarding");
                        setStep(2);
                        void start();
                      }}
                    >
                      Connect a device <ArrowUpRight size={14} />
                    </button>
                  </div>
                ) : state.scanError ? (
                  <div className="empty-state failed">
                    <h3>Bus scan failed</h3>
                    <p>{state.scanError}</p>
                  </div>
                ) : !state.scanCompleted ? (
                  <div className="empty-state">
                    <ScanLine size={26} />
                    <h3>Reading the bus…</h3>
                    <p>Waiting for the first scan result.</p>
                  </div>
                ) : state.devices.length === 0 ? (
                  <div className="empty-state">
                    <ScanLine size={26} />
                    <h3 className="mono">i2c-1 · no devices found</h3>
                    <p>Pi connected. The bus has no responding addresses.</p>
                  </div>
                ) : (
                  state.devices.map((d) => (
                    <article
                      key={d.address}
                      className={
                        "device-card " +
                        (d.state === "VERIFIED" ? "device-verified" : "")
                      }
                    >
                      <div>
                        <strong className="mono">{d.address}</strong>
                        <span
                          className={
                            "status " +
                            (d.state === "VERIFIED"
                              ? "verified"
                              : d.state === "READ FAILED"
                                ? "failed"
                                : "")
                          }
                        >
                          {d.state === "VERIFIED" && <Check size={11} />}{" "}
                          {d.state}
                        </span>
                      </div>
                      <h3>{d.name}</h3>
                      <div className="readings mono">
                        {Object.entries(d.values).map(([k, v]) => (
                          <span key={k}>
                            {k} <b>{String(v)}</b>
                          </span>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="panel-foot mono">
                <span>CAMERA ≠ VERIFICATION</span>
                <Shield size={13} />
              </div>
            </section>
            <section className="tool-panel">
              <div className="panel-title">
                <span>
                  <Terminal size={15} /> TOOL LOG
                </span>
                <span>RAW OUTPUT</span>
              </div>
              <div className="tool-scroll">
                {logs.length === 0 ? (
                  <div className="log-empty">
                    <span className="mono">
                      $ awaiting device connection
                      <span className="terminal-caret" />
                    </span>
                    <p>
                      Tool calls and unmodified results
                      <br />
                      will appear here.
                    </p>
                  </div>
                ) : (
                  logs.map((l) => (
                    <details key={l.id} open={l.name === "i2c_scan"}>
                      <summary>
                        <span>
                          {new Date(l.time).toLocaleTimeString("en-GB")}
                        </span>{" "}
                        {l.name}
                        <ChevronDown size={12} />
                      </summary>
                      <pre>
                        {JSON.stringify(l.args)}
                        {"\n"}
                        {typeof (l.result as any)?.grid === "string"
                          ? (l.result as any).grid
                          : JSON.stringify(l.result, null, 2)}
                      </pre>
                    </details>
                  ))
                )}
                <div ref={logEnd} />
              </div>
              <div className="panel-foot mono">
                <span>NO MOCK DATA. NO INFERRED SUCCESS.</span>
              </div>
            </section>
          </aside>
        </main>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
