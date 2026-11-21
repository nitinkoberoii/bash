# System Architecture & Design Specification: Project Bash

**Version:** 2.1 (Node.js / Electron Desktop Architecture)

**Target Platform (MVP):** Windows 10/11 (x64)

**Primary Stack:** Electron, React, TypeScript, Tailwind CSS, Node.js, Express, WebSockets (`ws`), MongoDB, Deepgram, Gemini / Groq

## 1. System Overview & Architectural Philosophy

**Project Bash** is a low-latency, desktop-native AI interview copilot engineered to capture bidirectional audio (system output + microphone), stream transcriptions in real time, and render concise, scannable hints inside a transparent, non-intrusive desktop overlay excluded from screen capture.

### Core Architectural Principles

1. **Ultra-Low Latency First:** Every pipeline stage is streaming-native (PCM audio frames $\to$ WebSocket STT $\to$ streaming LLM tokens $\to$ incremental UI updates) to keep end-to-end Time-to-First-Hint under $2.5\text{ s}$.

2. **Non-Intrusive Desktop Footprint:** The overlay must never steal OS keyboard focus from an active IDE or video call, must support click-through interaction, and must leverage native Windows display affinity flags to stay invisible to screen-capture APIs.

3. **Zero Secret Exposure on Client:** All third-party AI credentials (Deepgram, LLM APIs) and rate-limiting policies are strictly enforced on the backend service, never bundled inside the client Electron executable.

4. **Clean Separation of Concerns:** Native OS hooks and process lifecycle live in the Electron Main process; UI and AudioWorklet DSP live in the Renderer; AI orchestration, context management, and persistence live in the Node.js Backend.

### High-Level System Diagram

```
+-----------------------------------------------------------------------------+
|                        CLIENT: ELECTRON DESKTOP APP                         |
|                                                                             |
|  +----------------------------------+   +--------------------------------+  |
|  |   MAIN PROCESS (Node.js)         |   |  RENDERER PROCESS (Chromium)   |  |
|  |  - BrowserWindow Lifecycle       |   |  - React + Tailwind Overlay UI |  |
|  |  - setContentProtection(true)    |<=>|  - Web Audio API + AudioWorklet|  |
|  |  - Global Hotkeys & Focus Guard  |IPC|  - Dual-Channel PCM16 Encoder  |  |
|  |  - WASAPI Loopback / Capturer    |   |  - WS Client (Audio & Events)  |  |
|  +----------------------------------+   +---------------+----------------+  |
+---------------------------------------------------------|-------------------+
                                                          | WSS (Binary PCM + JSON)
                                                          v
+-----------------------------------------------------------------------------+
|                    BACKEND: NODE.JS / EXPRESS GATEWAY                       |
|                                                                             |
|  +-----------------------+    +------------------------------------------+  |
|  | REST API (Express)    |    | REAL-TIME WEBSOCKET GATEWAY (`ws`)       |  |
|  | - Auth (JWT)          |    | - Session Registry & Heartbeats          |  |
|  | - Prompts & Resumes   |    | - Binary Audio Router                    |  |
|  | - Session History     |    +-----+------------------------------+-----+  |
|  +-----------+-----------+          |                              ^        |
|              |                      v                              |        |
|              |         +------------------------+    +-------------+-----+  |
|              |         | STT Bridge (Deepgram)  |    | LLM Orchestrator  |  |
|              |         | - Multichannel Stream  |    | - Prompt Builder  |  |
|              |         +------------+-----------+    | - CAS Rate Limiter|  |
|              |                      |                | - Token Streamer  |  |
|              |                      v                +---------+---------+  |
|              |         +---------------------------------------+---------+  |
|              |         | Sliding Context Manager & Trigger Engine        |  |
|              |         | - Rolling Ring Buffer (3-5 min transcript)      |  |
|              |         | - Question Detection / Hotkey Override          |  |
|              |         +-----------------------+-------------------------+  |
|              |                                 |                            |
|              v                                 v                            |
|  +-----------------------------------------------------------------------+  |
|  |                      DATA LAYER: MONGODB                              |  |
|  |  Collections: `users`, `profiles`, `sessions`, `transcripts`, `hints` |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+
                       |                                      |
                       v WSS                                  v HTTPS Stream
           +-----------------------+              +-----------------------+
           | Deepgram Streaming    |              | LLM Provider          |
           | STT API (Nova-2)      |              | (Gemini Flash / Groq) |
           +-----------------------+              +-----------------------+

```

## 2. Client Architecture (Electron Multi-Process Model)

Electron splits the desktop application into isolated processes to preserve stability and security.

### 2.1. Main Process (Node.js Runtime)

The Main process acts as the OS controller and owns all privileged operations:

* **Overlay Window Manager:** Instantiates a single frameless, transparent `BrowserWindow` configured with native display protection and non-focusable flags.

* **Global Shortcut Registry (`globalShortcut`):** Registers OS-wide hotkeys that fire even when the user is typing inside VS Code, Zoom, or a browser:

  * `Ctrl+Shift+Space`: Manually trigger an immediate LLM hint generation.

  * `Ctrl+Shift+H`: Toggle overlay visibility (`opacity: 0` / `hide()`).

  * `Ctrl+Shift+I`: Toggle interactive vs. click-through mode (`setIgnoreMouseEvents`).

  * `Ctrl+Shift+X`: Clear active conversation context window.

* **Audio Source Discovery:** Exposes desktop/system audio sources via Electron's `desktopCapturer` (or a dedicated C++ N-API WASAPI loopback addon for zero-popup Windows audio capture).

* **System Tray Controller:** Provides a discreet tray icon for opening settings, inspecting connection status, or cleanly terminating the app.

### 2.2. Preload Script (`contextBridge`)

To enforce Electron security best practices (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), the Preload script exposes a strictly typed, narrow IPC API onto `window.bashAPI`:

* `onHotkeyTrigger(callback)`

* `setClickThrough(enabled: boolean)`

* `getAudioSources()`

* `getAppConfig()` / `saveToken()`

### 2.3. Renderer Process (React + TypeScript + Tailwind CSS)

The Renderer process handles two lightweight responsibilities:

1. **Overlay UI Layer:** A dark-mode, low-glare HUD designed to sit peripherally near the top of the monitor (close to the webcam to maintain natural eye contact). Renders:

   * Live connection & audio level indicator (minimal 4px dot).

   * Streaming hint card restricted to 2–3 concise bullet points.

   * Optional collapsible live transcript ticker for verification.

2. **Client-Side Audio Engine:** Runs a Web Audio API graph with a custom `AudioWorkletNode` to capture, resample, interleave, and package PCM audio off the main UI thread so React animations never stutter.

## 3. Desktop Window Management & Screen-Capture Exclusion

To remain completely invisible during screen sharing (Zoom, Google Meet, Microsoft Teams, OBS, browser screen capture) while remaining crisp on the user's physical monitor, Bash combines several native Electron and Windows API configurations.

### 3.1. `BrowserWindow` Configuration

```
const overlayWindow = new BrowserWindow({
  width: 480,
  height: 320,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,          // Excludes window from Windows Taskbar & Alt+Tab switcher
  focusable: false,           // Prevents stealing focus from IDE or video call
  hasShadow: false,
  resizable: true,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
});

// Core OS-level Screen Capture Exclusion:
// Under the hood on Windows 10 (2004+) / Windows 11, this invokes
// User32.dll -> SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
overlayWindow.setContentProtection(true);

// Keep above fullscreen apps and overlays
overlayWindow.setAlwaysOnTop(true, 'screen-saver');

// Default to click-through so mouse clicks pass straight to underlying windows
overlayWindow.setIgnoreMouseEvents(true, { forward: true });

```

### 3.2. Native OS Behavior Matrix

| Feature | Mechanism | Effect | 
| ----- | ----- | ----- | 
| **Screen Share Invisibility** | `win.setContentProtection(true)` (`WDA_EXCLUDEFROMCAPTURE`) | OS Desktop Window Manager (DWM) omits the window buffer from all capture APIs (DXGI, GDI, WGC). Invisible on Zoom/Meet/OBS; visible on physical monitor. | 
| **Taskbar & Alt+Tab Exclusion** | `skipTaskbar: true` & `WS_EX_TOOLWINDOW` | Window does not show an icon on the taskbar or appear in `Alt+Tab` thumbnails. | 
| **Non-Focus-Stealing** | `focusable: false` | Clicking or updating the overlay never triggers browser `blur` / `visibilitychange` events on web-based coding assessments. | 
| **Click-Through Interaction** | `setIgnoreMouseEvents(true, { forward: true })` | Mouse clicks pass cleanly to the IDE underneath unless the user toggles interactive mode via hotkey to drag/resize the overlay. | 
| **Packaging & Process Footprint** | `electron-builder` custom `productName` & `executableName` | Compiles with clean, user-defined build metadata and single-instance lock (`app.requestSingleInstanceLock()`) to prevent duplicate background processes. | 

## 4. Dual-Channel Audio Capture & Signal Processing Pipeline

### 4.1. Why Stereo Multichannel Beats Naive Mono Mixing

If the interviewer's voice (system loopback) and the candidate's voice (microphone) are mixed into a single mono channel, the STT engine must rely on acoustic speaker diarization, which adds latency and frequently misattributes overlapping speech.

Instead, Bash uses **Dual-Channel Interleaving**:

* **Channel 0 (Left):** System Audio Loopback (Interviewer)

* **Channel 1 (Right):** Microphone Input (Candidate)

By passing `multichannel=true&channels=2` to Deepgram, the backend receives **100% deterministic, zero-latency speaker attribution** (`channel_index: [0, 2]` = Interviewer; `channel_index: [1, 2]` = Candidate).

### 4.2. Capture Strategy (Windows)

1. **System Audio Loopback:**

   * *MVP Path:* Electron `desktopCapturer` with Chromium's `chromeMediaSource: 'desktop'` audio constraint (loopback enabled via `session.setDisplayMediaRequestHandler` using `audio: 'loopback'`).

   * *Enhanced Path:* Custom C++ N-API Native Addon wrapping Windows Core Audio **WASAPI Loopback (`IAudioCaptureClient`)** for direct audio endpoint capture without needing video frame initialization.

2. **Microphone Capture:** Standard `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.

### 4.3. AudioWorklet DSP & Bitrate Specification

Both `MediaStreamAudioSourceNode` streams are merged via a Web Audio `ChannelMergerNode(2)` and routed into a custom `AudioWorkletProcessor`:

* **Target Sample Rate:** $16000\text{ Hz}$ (optimal for speech recognition; downsampled from native $48000\text{ Hz}$).

* **Sample Format:** $16\text{-bit}$ Signed Linear PCM (`Int16`, little-endian), interleaved `[L0, R0, L1, R1, ...]`.

* **Chunk Duration:** $100\text{ ms}$ per WebSocket binary frame ($1600\text{ samples/channel}$).

The resulting sustained upstream audio bandwidth is:

$$
\text{Bitrate} = 16000\text{ Hz} \times 16\text{ bits} \times 2\text{ channels} = 512000\text{ bps} = 64\text{ KB/s}
$$

Each $100\text{ ms}$ binary WebSocket payload is exactly $6.4\text{ KB}$, keeping network serialization overhead negligible even on modest Wi-Fi connections.

## 5. Backend Architecture & Real-Time AI Pipeline

The backend is built with **Node.js, TypeScript, Express, and `ws`**. While designed primarily as a remote cloud service (to protect API keys and persist data to MongoDB), the architecture cleanly supports running locally on `localhost` for zero-RTT personal development.

### 5.1. WebSocket Session Lifecycle

When the user clicks **Start Session** (or hits the start hotkey):

1. Client authenticates via JWT in the WebSocket handshake header (`Authorization: Bearer <token>`).

2. Gateway creates a `SessionController` instance in memory mapped to `sessionId`.

3. `SessionController` opens a persistent upstream WebSocket connection to **Deepgram Streaming API** (`nova-2`, `encoding=linear16`, `sample_rate=16000`, `channels=2`, `multichannel=true`, `interim_results=true`, `endpointing=300`, `utterance_end_ms=1000`).

4. Incoming binary frames from the client are piped directly into Deepgram with zero disk I/O.

### 5.2. Sliding Context Window Manager

Continuous interviews can last 45–60 minutes, which would degrade LLM latency and inflate token costs if sent verbatim on every turn. Each `SessionController` maintains a two-tier memory structure:

* **Active Rolling Buffer (Ring Buffer):** Stores the last $3\text{--}5\text{ minutes}$ of finalized, speaker-tagged utterances (capped at $T_{\max} = 3000\text{ tokens}$).

* **Static Session Context:** Pre-loaded at session start (Candidate Resume summary, Target Role/JD, Custom System Prompt, capped at $1000\text{ tokens}$).

* **Periodic Compression (Optional):** Every 5 minutes, an asynchronous background call summarizes evicted utterances into a $300\text{-token}$ "Earlier Interview Summary" so early technical constraints mentioned by the interviewer are never forgotten.

### 5.3. Smart Triggering Engine

To avoid wasting tokens and cluttering the UI while the interviewer is mid-sentence, LLM generation is gated by a dual-mode trigger engine:

1. **Manual Override (Highest Priority):** User presses `Ctrl+Shift+Space`. The engine immediately flushes the latest interim + finalized transcript buffer and requests a hint.

2. **Automated Question Detection (Auto Mode):**

   * Triggers only on **Channel 0 (Interviewer)** utterances.

   * Fires when Deepgram emits an `is_final: true` or `UtteranceEnd` event AND the utterance passes a lightweight local heuristic filter:

     * Minimum length $\ge 5\text{ words}$ (filters out filler like "Okay", "Makes sense").

     * Matches interrogative markers (`?`, starts with `how/why/what/explain/design/compare/walk me through`, or imperative technical verbs).

   * **Debounce Guard:** Enforces a cooldown period ($D = 4\text{ s}$) between automatic triggers to prevent duplicate responses during multi-part questions.

### 5.4. Fixed-Window Rate Limiter (CAS Atomic Pattern)

To prevent runaway LLM API billing under high concurrency or rapid hotkey spamming, the LLM Orchestrator enforces a **Fixed-Window Rate Limiter** backed by atomic **Compare-And-Swap (CAS)** semantics:

* **Local / Single-Node Implementation:** Uses a `SharedArrayBuffer` with `Int32Array` and `Atomics.compareExchange` (or atomic window struct updates) to increment request counts per user within a fixed time window $W$ (e.g., $W = 60\text{ s}$, limit $L = 12\text{ LLM requests/min}$).

* **Multi-Node / Clustered Implementation:** Uses Redis with an atomic Lua script (`INCR` + conditional `PEXPIRE` on first hit) to guarantee lock-free correctness across horizontally scaled Node.js instances.

The window bucket index $k$ for timestamp $t$ is computed deterministically as:

$$
k = \left\lfloor \frac{t}{W} \right\rfloor
$$

If the atomic counter $c_k \ge L$, the gateway immediately rejects the LLM call and pushes a lightweight `RATE_LIMITED` notification to the overlay with `retryAfterMs`.

### 5.5. LLM Prompting & Token Streaming

* **Primary Model:** Gemini 2.5 Flash / Gemini 1.5 Flash (or Groq Llama 3.3 70B) chosen specifically for sub-$500\text{ ms}$ Time-to-First-Token (TTFT).

* **Cancellation Support:** Each LLM request is bound to an `AbortController`. If the user hits the manual trigger again or clears context while a previous response is still streaming, the in-flight HTTP stream is immediately aborted.

* **System Prompt Constraints:**

  * Output strictly 2–4 ultra-concise bullet points.

  * Bold key technical terms for peripheral scanning.

  * No conversational filler ("Sure, here's how you can answer...").

  * For coding/DSA questions: provide **Approach**, **Edge Cases**, and **Time/Space Complexity** ($O(\cdot)$ notation).

## 6. Network Protocol & API Specification

### 6.1. WebSocket Protocol (`/ws/session`)

#### Client $\to$ Server Messages

* **Binary Frame (`ArrayBuffer`):** Raw interleaved $16\text{-bit}$ PCM stereo audio chunks ($100\text{ ms}$ intervals).

* **JSON Control Frames:**

  ```
  { "type": "SESSION_START", "payload": { "profileId": "prof_123", "autoTrigger": true } }
  { "type": "TRIGGER_HINT",  "payload": { "customInstruction": "Focus on time complexity" } }
  { "type": "CLEAR_CONTEXT", "payload": {} }
  { "type": "PAUSE_AUDIO",   "payload": { "paused": true } }
  { "type": "SESSION_END",   "payload": {} }
  
  ```

#### Server $\to$ Client Messages

```
{ "type": "SESSION_READY",    "payload": { "sessionId": "sess_987" } }
{ "type": "TRANSCRIPT_DELTA", "payload": { "speaker": "interviewer", "text": "How would you design a rate limiter?", "isFinal": true, "timestamp": 1732220400 } }
{ "type": "HINT_START",       "payload": { "hintId": "hint_456", "trigger": "auto" } }
{ "type": "HINT_TOKEN",       "payload": { "hintId": "hint_456", "delta": "- **Fixed Window + CAS**: Use atomic..." } }
{ "type": "HINT_END",         "payload": { "hintId": "hint_456", "latencyMs": 1420 } }
{ "type": "ERROR",            "payload": { "code": "RATE_LIMITED", "message": "Quota reached", "retryAfterMs": 12000 } }

```

### 6.2. REST API Endpoints (`/api/v1`)

| Method | Endpoint | Purpose | 
| ----- | ----- | ----- | 
| `POST` | `/auth/register` & `/auth/login` | Issue short-lived Access JWT ($15\text{ m}$) + Refresh Token. | 
| `GET/POST/PUT` | `/profiles` | CRUD for candidate resumes, target JDs, and custom LLM system prompts. | 
| `GET` | `/sessions` | Paginated list of historical interview sessions. | 
| `GET` | `/sessions/:id` | Fetch full transcript and generated hints for post-interview review. | 
| `DELETE` | `/sessions/:id` | Hard delete session transcript and hints. | 

## 7. Data Architecture & MongoDB Schema

MongoDB is selected for its flexible document modeling of variable-length transcripts and fast write throughput for session archival. During live interviews, transcripts are buffered in memory and flushed asynchronously in batches (every $30\text{ s}$ or on session end) so database I/O never blocks the real-time audio path.

### 7.1. Collections

#### 1. `users`

```
interface UserDoc {
  _id: ObjectId;
  email: string;                 // Unique index
  passwordHash: string;          // Argon2id / bcrypt
  settings: {
    ephemeralMode: boolean;      // If true, skip persisting transcripts to DB
    autoTrigger: boolean;
    overlayOpacity: number;      // 0.4 - 0.95
    hotkeys: Record<string, string>;
  };
  createdAt: Date;
}

```

#### 2. `profiles`

```
interface ProfileDoc {
  _id: ObjectId;
  userId: ObjectId;              // Indexed
  name: string;                  // e.g., "Senior Backend - Distributed Systems"
  resumeSummary: string;
  jobDescription: string;
  customSystemPrompt: string;
  updatedAt: Date;
}

```

#### 3. `sessions`

```
interface SessionDoc {
  _id: ObjectId;
  userId: ObjectId;
  profileId: ObjectId;
  title: string;
  startedAt: Date;
  endedAt?: Date;
  stats: {
    durationSec: number;
    totalHintsGenerated: number;
    avgLatencyMs: number;
  };
}

```

#### 4. `transcript_chunks` (Bucket Pattern)

To avoid MongoDB's $16\text{ MB}$ single-document limit on long interviews, utterances are stored in bucketed documents (max $100$ utterances per chunk):

```
interface TranscriptChunkDoc {
  _id: ObjectId;
  sessionId: ObjectId;
  chunkIndex: number;
  utterances: Array<{
    speaker: 'interviewer' | 'candidate';
    text: string;
    timestamp: Date;
  }>;
}

```

#### 5. `hints`

```
interface HintDoc {
  _id: ObjectId;
  sessionId: ObjectId;
  triggerType: 'auto' | 'manual';
  promptContextSnapshot: string; // Last interviewer question that triggered hint
  responseMarkdown: string;
  modelUsed: string;
  latencyMs: number;
  createdAt: Date;
}

```

### 7.2. Indexing Strategy

* `users`: `{ email: 1 }` (Unique)

* `sessions`: `{ userId: 1, startedAt: -1 }` (Fast dashboard sorting)

* `transcript_chunks`: `{ sessionId: 1, chunkIndex: 1 }` (Unique, ordered sequential read)

* `hints`: `{ sessionId: 1, createdAt: 1 }`

* Optional TTL Index on `transcript_chunks` and `hints` (e.g., `expireAfterSeconds: 2592000`) for automated 30-day privacy cleanup.

## 8. Latency Budget & Performance Engineering

### 8.1. End-to-End Latency Budget (Target: $< 2.5\text{ s}$)

The time from the interviewer finishing a sentence to the first actionable bullet point appearing on the overlay is budgeted as follows:

$$
T_{\text{total}} = T_{\text{chunk}} + T_{\text{net}} + T_{\text{stt}} + T_{\text{endpoint}} + T_{\text{llm\_ttft}} + T_{\text{render}}
$$

| Pipeline Stage | Target Budget | Optimization Strategy | 
| ----- | ----- | ----- | 
| Audio Capture & Worklet Chunking ($T_{\text{chunk}}$) | $100\text{ ms}$ | $100\text{ ms}$ PCM16 frames processed off main thread via `AudioWorklet`. | 
| Client $\leftrightarrow$ Backend Network RTT ($T_{\text{net}}$) | $60\text{ ms}$ | Persistent WSS connection; deploy backend regionally close to user. | 
| Deepgram Streaming STT ($T_{\text{stt}}$) | $300\text{ ms}$ | Pre-warmed WS connection; `nova-2` low-latency model. | 
| Silence Endpointing / Trigger ($T_{\text{endpoint}}$) | $400\text{ ms}$ | Tuned `endpointing=300` (bypassed entirely to $0\text{ ms}$ on manual hotkey). | 
| LLM Time-to-First-Token ($T_{\text{llm\_ttft}}$) | $450\text{ ms}$ | Gemini Flash / Groq; tightly bounded rolling context ($\le 4000\text{ tokens}$). | 
| Client UI Paint ($T_{\text{render}}$) | $16\text{ ms}$ | Batched React state updates synced to `requestAnimationFrame`. | 
| **Total Time-to-First-Hint** | $\approx 1.33\text{ s}$ | Leaves $> 1.1\text{ s}$ safety margin under the $2.5\text{ s}$ NFR ceiling. | 

### 8.2. Electron Resource & Memory Optimization

Because Electron runs Chromium alongside memory-heavy apps (Zoom, Chrome, VS Code), Bash enforces strict client-side hygiene:

* **Single Renderer Architecture:** Never spawn secondary hidden windows; run audio worklets and overlay UI within one minimal renderer.

* **V8 Heap Caps:** Pass `--js-flags="--max-old-space-size=256"` to Electron renderer flags to prevent unbounded memory growth.

* **Disabled Chromium Bloat:** Disable spellchecker, hardware media key handling, and unused DevTools extensions in production builds.

* **Stream Throttling:** Buffer incoming `HINT_TOKEN` deltas and flush them to React state at most every $33\text{ ms}$ ($30\text{ fps}$) rather than re-rendering on every single token packet.

## 9. Security, Privacy & Fault Tolerance

### 9.1. Security Controls

* **Credential Isolation:** Deepgram and LLM API keys exist exclusively in backend environment variables. The desktop client authenticates only via user JWTs.

* **Strict Electron Sandbox:** `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, and strict Content Security Policy (CSP) headers preventing remote script execution.

* **Transport Encryption:** All REST and WebSocket traffic operates strictly over HTTPS / WSS (TLS 1.3).

* **Token Storage:** User refresh tokens on Windows are encrypted at rest using Electron's `safeStorage` API (backed by Windows DPAPI).

### 9.2. Privacy Architecture

* **Ephemeral Mode:** Users can toggle Ephemeral Mode, instructing the backend to hold the sliding transcript strictly in volatile RAM and wipe it immediately upon `SESSION_END` with zero MongoDB persistence.

### 9.3. Resilience & Fault Tolerance

* **Client WebSocket Reconnection:** Exponential backoff ($500\text{ ms}, 1\text{ s}, 2\text{ s}, 4\text{ s}$, capped at $10\text{ s}$) with automatic session resumption using `sessionId`.

* **Deepgram Keep-Alive:** If the user pauses audio, the backend sends a Deepgram `{ "type": "KeepAlive" }` frame every $8\text{ s}$ to prevent silent socket termination.

* **LLM Provider Fallback:** If the primary LLM provider (e.g., Gemini Flash) returns HTTP `429`/`5xx` or exceeds a $2000\text{ ms}$ TTFT timeout, the orchestrator automatically fails over to the secondary provider (e.g., Groq) transparently.

## 10. Monorepo Structure & Build Pipeline

A TypeScript monorepo ensures end-to-end type safety across Electron IPC, WebSocket payloads, and MongoDB models.

```
bash/
├── package.json                    # Workspace root (pnpm / npm workspaces)
├── packages/
│   └── shared/                     # Shared TypeScript contracts
│       ├── ws-protocol.ts          # Strongly typed WS event unions
│       ├── ipc-channels.ts         # Electron IPC channel definitions
│       └── models.ts               # Domain DTOs (Profile, Session, Hint)
├── apps/
│   ├── desktop/                    # Electron + React + Tailwind Client
│   │   ├── electron/
│   │   │   ├── main.ts             # BrowserWindow, setContentProtection, hotkeys
│   │   │   ├── preload.ts          # Secure contextBridge API
│   │   │   └── tray.ts             # System tray controller
│   │   ├── src/
│   │   │   ├── audio/
│   │   │   │   ├── capture.ts      # Loopback + Mic stream setup
│   │   │   │   └── pcm-worklet.ts  # AudioWorklet downsampler & interleaver
│   │   │   ├── components/
│   │   │   │   ├── OverlayHUD.tsx  # Minimalist floating hint renderer
│   │   │   │   └── StatusBar.tsx   # Connection & hotkey indicator
│   │   │   ├── hooks/
│   │   │   │   └── useSessionWS.ts # WebSocket lifecycle & token buffering
│   │   │   └── App.tsx
│   │   ├── electron-builder.yml    # Windows NSIS / portable packaging config
│   │   └── vite.config.ts
│   └── server/                     # Node.js + Express + ws Backend
│       └── src/
│           ├── config/             # Env validation (Zod) & DB connection
│           ├── gateway/
│           │   ├── wsServer.ts     # WS upgrade auth & socket registry
│           │   └── sessionCtrl.ts  # Per-session pipeline orchestrator
│           ├── ai/
│           │   ├── deepgram.ts     # Streaming multichannel STT client
│           │   ├── contextMgr.ts   # Ring buffer + rolling summarization
│           │   ├── trigger.ts      # Question heuristics & debounce engine
│           │   ├── llmClient.ts    # Gemini / Groq streaming + failover
│           │   └── rateLimiter.ts  # Fixed-window CAS rate limiter
│           ├── api/                # Express REST routes & controllers
│           └── db/                 # Mongoose / MongoDB schemas & repos
└── docker-compose.yml              # Local MongoDB + Redis + Server setup

```

### Build & Packaging Flow

1. **Shared Package Compilation:** Compile `packages/shared` first to validate WebSocket and IPC types across client and server.

2. **Client Bundling:** Vite bundles the React Renderer and `AudioWorklet` scripts; `esbuild`/`tsc` compiles Electron Main and Preload scripts.

3. **Desktop Packaging:** `electron-builder` packages the application into a Windows portable `.exe` or NSIS installer with ASAR packaging enabled and native addon rebuilds handled automatically.

4. **Backend Deployment:** Containerized Node.js server deployed with sticky sessions (if scaled across multiple instances behind a load balancer) and connected to MongoDB Atlas.