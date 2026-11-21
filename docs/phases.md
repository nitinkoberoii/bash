# Project Bash: Phased Implementation Roadmap & Milestones

**Architecture Reference:** `docs/architecture.md` (v2.1 — Electron + React + Node.js/Express + WebSockets + MongoDB)

**Purpose:** This document breaks Project Bash into sequential, verifiable phases. Each phase is subdivided into minor milestones (separating **Core Logic**, **Third-Party Packages**, and **UI**) so you can build iteratively with AI assistance while genuinely mastering every layer of the stack.

---

## How to Use This Roadmap (Learning with AI)

1. **One Minor Milestone at a Time:** Never ask AI to generate an entire phase at once. Scope each coding session to a single sub-milestone (e.g., `1.2` or `2.3`).
2. **Verify Before Moving On:** Do not advance until every checkbox in the **Phase Ending Conditions** passes on your machine.
3. **Explain It Back:** At the end of each phase, complete the **Learning Checkpoint** to make sure you understand *why* the code works—especially for system design and interview discussions.

---

## Phase 0: Monorepo Foundation & Shared Contracts

**Objective:** Establish a clean, strongly typed TypeScript monorepo (`apps/desktop`, `apps/server`, `packages/shared`) and local infrastructure so client and server share exact WebSocket and IPC types from day one.

**Learning Focus:** Workspace dependency management, TypeScript project references, schema-first runtime validation (`zod`), and containerized local databases.

### Minor Milestones

* **Milestone 0.1 — Monorepo & Tooling Setup**
  * Initialize workspace root (`pnpm` or `npm workspaces`) with `packages/shared`, `apps/desktop`, and `apps/server`.
  * Configure shared `tsconfig.base.json`, ESLint, and Prettier rules.
  * Add root convenience scripts (`dev:server`, `dev:desktop`, `typecheck`).
* **Milestone 0.2 — Third-Party Packages & Local Infrastructure**
  * Install core utility packages (`typescript`, `tsx`, `zod`, `dotenv`).
  * Create `docker-compose.yml` to spin up a local MongoDB instance (and optional Redis container for later distributed rate-limiting experiments).
  * Build a strict `env.ts` loader in `apps/server` using `zod` so missing API keys fail fast at startup.
* **Milestone 0.3 — Shared Protocol Contracts (`packages/shared`)**
  * Define discriminated union types in `ws-protocol.ts` for all Client $\to$ Server and Server $\to$ Client JSON messages.
  * Define typed Electron IPC channel constants and payload signatures in `ipc-channels.ts`.
  * Define core domain DTOs (`UserSettings`, `ProfileDTO`, `HintDTO`, `TranscriptUtterance`).

### Phase 0 Ending Conditions (Definition of Done)

* [ ] `npm run typecheck` (or `pnpm typecheck`) succeeds cleanly across all three workspaces with zero errors.
* [ ] Importing a type from `@bash/shared` works inside both `apps/desktop` and `apps/server`.
* [ ] `docker compose up -d` starts MongoDB locally and a health check script connects successfully.
* [ ] Starting the server without a required `.env` variable throws a clear, human-readable `zod` validation error.

> **Learning Checkpoint:** Explain how TypeScript discriminated unions (using a `type` field on WebSocket messages) prevent runtime parsing bugs between client and server.

---

## Phase 1: Electron Desktop Shell & Screen-Capture-Excluded Overlay

**Objective:** Build the native Windows desktop shell featuring a transparent, always-on-top, non-focus-stealing overlay that stays invisible to screen-sharing software, controlled via OS-wide hotkeys.

**Learning Focus:** Electron multi-process architecture (Main vs. Preload vs. Renderer), OS window flags (`WDA_EXCLUDEFROMCAPTURE`), IPC security (`contextBridge`), and non-intrusive HUD UX.

### Minor Milestones

* **Milestone 1.1 — Third-Party Packages & Desktop Boilerplate**
  * Scaffold `apps/desktop` with `electron`, `vite`, `react`, `react-dom`, and `tailwindcss`.
  * Configure Vite + `electron` dev workflow with hot-reload for the Renderer and clean compilation for Main/Preload (`tsup` or `vite-plugin-electron`).
  * Enforce single-instance lock (`app.requestSingleInstanceLock()`).
* **Milestone 1.2 — Stealth Overlay `BrowserWindow` (Main Process)**
  * Configure the frameless, transparent `BrowserWindow` with `alwaysOnTop: true`, `skipTaskbar: true`, `focusable: false`, and `hasShadow: false`.
  * Enable OS-level screen-capture exclusion via `overlayWindow.setContentProtection(true)`.
  * Implement click-through defaults using `setIgnoreMouseEvents(true, { forward: true })`.
* **Milestone 1.3 — Secure Preload Bridge, Global Hotkeys & System Tray**
  * Expose a narrow, typed `window.bashAPI` via `contextBridge` with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
  * Register OS-wide shortcuts (`globalShortcut`):
    * `Ctrl+Shift+H`: Hide/show overlay.
    * `Ctrl+Shift+I`: Toggle click-through vs. interactive drag/resize mode.
    * `Ctrl+Shift+Space`: Emit manual hint trigger event to Renderer.
    * `Ctrl+Shift+X`: Emit clear-context event.
  * Add a discreet Windows System Tray icon with a Quit / Toggle Visibility menu.
* **Milestone 1.4 — UI Milestone: Minimalist Overlay HUD (Mocked State)**
  * Design and build `OverlayHUD.tsx` and `StatusBar.tsx` with Tailwind CSS using low-glare dark neutral tones.
  * Add a visual badge indicating `LOCKED (Click-Through)` vs. `INTERACTIVE (Draggable)` mode.
  * Render mocked bullet-point hints and verify readability when positioned near the top-center of your monitor over VS Code and a browser.

### Phase 1 Ending Conditions (Definition of Done)

* [ ] Launching the app displays a transparent, dark-mode floating card on your physical monitor without appearing on the Windows Taskbar or `Alt+Tab` switcher.
* [ ] **Screen-Share Verification Test:** Share your entire screen in OBS Studio, Google Meet, or Zoom—the Bash overlay is completely invisible in the capture feed while remaining clearly visible to your eyes.
* [ ] Clicking over the overlay in `LOCKED` mode passes clicks directly into VS Code underneath without stealing focus or firing browser `blur` events.
* [ ] Pressing `Ctrl+Shift+I` lets you drag and reposition the overlay; pressing `Ctrl+Shift+H` hides and restores it instantaneously.

> **Learning Checkpoint:** Why does Electron separate the Main and Renderer processes, and why is disabling `nodeIntegration` + using `contextBridge` critical for security?

---

## Phase 2: Dual-Channel Audio Capture & Signal Processing Pipeline

**Objective:** Capture both system output audio (interviewer) and microphone input (candidate) simultaneously, merge them into a deterministic 2-channel stereo stream, and downsample off the main UI thread into $16000\text{ Hz}$ `Int16` PCM chunks.

**Learning Focus:** Windows loopback capture in Electron, Web Audio API graphs (`ChannelMergerNode`), real-time DSP inside an `AudioWorkletProcessor`, and PCM binary encoding math.

### Minor Milestones

* **Milestone 2.1 — System Loopback & Microphone Stream Acquisition**
  * Configure `session.defaultSession.setDisplayMediaRequestHandler` in Electron Main to automatically grant system audio loopback (`audio: 'loopback'`) without a user picker popup.
  * Acquire the system loopback `MediaStream` and the user microphone `MediaStream` (`echoCancellation: true`, `noiseSuppression: true`) in `apps/desktop/src/audio/capture.ts`.
  * Handle clean teardown (`track.stop()`) when pausing or ending a session.
* **Milestone 2.2 — Stereo Graph & Custom `AudioWorkletProcessor`**
  * Route System Audio into Channel 0 (Left) and Microphone into Channel 1 (Right) via a `ChannelMergerNode(2)`.
  * Write `pcm-worklet.ts` running on the dedicated audio rendering thread:
    * Downsample incoming audio (typically $48000\text{ Hz}$) to $16000\text{ Hz}$.
    * Convert `Float32` samples ($[-1.0, 1.0]$) into interleaved $16\text{-bit}$ signed integers (`Int16Array`: `[L0, R0, L1, R1, ...]`).
    * Batch samples into $100\text{ ms}$ frames ($6.4\text{ KB}$ per frame) and transfer buffers via `port.postMessage` using transferable objects to avoid memory copies.
* **Milestone 2.3 — UI Milestone: Audio Diagnostics & Local Loopback Verifier**
  * Build a collapsible dual-channel audio meter in `StatusBar.tsx` showing live RMS volume levels for **Ch 0 (System)** and **Ch 1 (Mic)** independently.
  * Add a dev-only "Record 5s `.wav` Test" button that wraps captured PCM chunks in a valid RIFF/WAV header and saves/plays it back locally to verify zero clipping, crackling, or channel bleed.

### Phase 2 Ending Conditions (Definition of Done)

* [ ] Playing a YouTube interview video on your PC lights up **only** the System (Ch 0) meter; speaking into your mic lights up **only** the Mic (Ch 1) meter.
* [ ] The dev `.wav` test file plays back clear, intelligible stereo audio at $16000\text{ Hz}$ with the video in the left ear and your voice in the right ear.
* [ ] Console telemetry confirms chunks emit steadily every $100\text{ ms}$ at exactly $6400\text{ bytes}$ per frame ($\approx 64\text{ KB/s}$).
* [ ] React overlay animations remain smooth at $60\text{ fps}$ with zero UI stutter while audio capture is active.

> **Learning Checkpoint:** Why do we interleave System and Mic audio into a 2-channel stereo PCM stream instead of mixing them into a single mono track before sending to STT?

---

## Phase 3: Backend WebSocket Gateway & Streaming Transcription (STT)

**Objective:** Build the Node.js WebSocket gateway, stream live binary PCM audio from Electron to the server, integrate Deepgram's streaming API, and render real-time speaker-tagged transcripts in the overlay.

**Learning Focus:** Full-duplex WebSockets (`ws`), binary vs. text frame routing, backpressure handling, third-party streaming STT integration, and exponential backoff reconnection.

### Minor Milestones

* **Milestone 3.1 — Third-Party Packages & Node.js Gateway Scaffold**
  * Install backend packages in `apps/server`: `express`, `ws`, `@types/ws`, `cors`, `pino` (structured low-overhead logging).
  * Build `wsServer.ts` with a session registry (`Map<string, SessionController>`), ping/pong heartbeat checks, and clean binary vs. JSON frame demultiplexing.
* **Milestone 3.2 — Client WebSocket Hook & Audio Streaming**
  * Implement `useSessionWS.ts` in `apps/desktop` to connect to `/ws/session`, send `SESSION_START`, stream `AudioWorklet` binary frames, and reconnect with exponential backoff ($500\text{ ms} \to 10\text{ s}$ cap).
  * Add `PAUSE_AUDIO` support so muted sessions stop transmitting binary audio frames.
* **Milestone 3.3 — Third-Party Package Milestone: Deepgram Streaming Bridge**
  * Install `@deepgram/sdk` (or implement a direct WebSocket bridge) in `apps/server/src/ai/deepgram.ts`.
  * Configure streaming parameters: `model=nova-2`, `encoding=linear16`, `sample_rate=16000`, `channels=2`, `multichannel=true`, `interim_results=true`, `endpointing=300`, `utterance_end_ms=1000`.
  * Map `channel_index: [0, 2]` $\to$ `interviewer` and `channel_index: [1, 2]` $\to$ `candidate`.
  * Implement Deepgram `KeepAlive` frames every $8\text{ s}$ during paused/silent periods to prevent socket timeouts.
* **Milestone 3.4 — UI Milestone: Live Transcript Ticker**
  * Add a compact, toggleable transcript drawer in `OverlayHUD.tsx` displaying interim (dimmed) and finalized (crisp) text labeled `INT` vs. `YOU`.
  * Display live connection status (`Disconnected`, `Connecting`, `Live`, `Paused`) in `StatusBar.tsx`.

### Phase 3 Ending Conditions (Definition of Done)

* [ ] Playing a mock technical interview video while speaking responses aloud produces real-time, accurately separated `INT` and `YOU` transcript lines in the Electron overlay.
* [ ] End-to-end transcription latency (speech $\to$ text visible in HUD) averages under $600\text{ ms}$.
* [ ] Pausing audio for $30\text{ s}$ and resuming continues transcription seamlessly without Deepgram dropping the connection.
* [ ] Killing and restarting the Node.js server causes the Electron client to automatically reconnect and display updated status without crashing.

> **Learning Checkpoint:** How does Deepgram's `interim_results` vs. `is_final` + `endpointing` work, and why is distinguishing them critical before feeding text into an LLM?

---

## Phase 4: AI Reasoning Pipeline, Context Engine & CAS Rate Limiter

**Objective:** Turn raw streaming transcripts into sub-second, scannable interview hints using a bounded sliding context window, smart question triggers, an atomic CAS rate limiter, and streaming LLM responses.

**Learning Focus:** Ring buffer context management, NLP trigger heuristics & debouncing, lock-free Compare-And-Swap (CAS) fixed-window rate limiting, streaming LLM token delivery, and `AbortController` cancellation.

### Minor Milestones

* **Milestone 4.1 — Sliding Context Window Manager (`contextMgr.ts`)**
  * Implement a rolling ring buffer per `SessionController` storing the latest $3\text{--}5\text{ minutes}$ of finalized utterances (token budget $\le 3000\text{ tokens}$).
  * Prepend static session context (mocked Resume summary, Job Description, System Prompt $\le 1000\text{ tokens}$).
  * Support `CLEAR_CONTEXT` to instantly flush the rolling buffer when an interview topic pivots abruptly.
* **Milestone 4.2 — Smart Trigger Engine (`trigger.ts`)**
  * Implement **Manual Trigger** (`Ctrl+Shift+Space` $\to$ `TRIGGER_HINT`) with highest priority, immediately flushing both finalized and latest interim text.
  * Implement **Auto-Trigger** on `interviewer` utterances only: minimum $\ge 5\text{ words}$, interrogative/imperative technical markers (`?`, `how`, `why`, `design`, `explain`, `compare`, `walk me through`), and a $4\text{ s}$ debounce guard.
* **Milestone 4.3 — Fixed-Window CAS Rate Limiter (`rateLimiter.ts`)**
  * Implement a fixed-window rate limiter computing window index $k = \lfloor t / W \rfloor$ (e.g., $W = 60\text{ s}$, $L = 12\text{ requests/min}$).
  * Build the single-node atomic engine using `SharedArrayBuffer`, `Int32Array`, and `Atomics.compareExchange` (CAS loop) so concurrent requests cannot race past the quota.
  * Emit structured `ERROR` (`code: 'RATE_LIMITED'`, `retryAfterMs`) events to the client when throttled.
  * Write unit tests simulating $50$ concurrent requests to verify exact quota enforcement.
* **Milestone 4.4 — Third-Party Package Milestone: Streaming LLM Client & Failover**
  * Install `@google/genai` (Gemini Flash) and `groq-sdk` (secondary failover provider) in `apps/server`.
  * Engineer the strict system prompt: $2\text{--}4$ concise bullet points, bold technical keywords, zero conversational fluff, and explicit Approach + Edge Cases + $O(\cdot)$ Complexity for coding questions.
  * Stream tokens incrementally (`HINT_START` $\to$ `HINT_TOKEN` $\to$ `HINT_END`) with `AbortController` support so a new trigger immediately cancels any previous in-flight generation.
  * Add automatic provider failover if primary TTFT exceeds $2000\text{ ms}$ or returns HTTP `429`/`5xx`.
* **Milestone 4.5 — UI Milestone: Streaming Hint Card & Controls**
  * Install lightweight Markdown renderer (`react-markdown`) in `apps/desktop`.
  * Buffer incoming `HINT_TOKEN` deltas in `useSessionWS.ts` and flush to React state at most every $33\text{ ms}$ ($30\text{ fps}$) to keep CPU usage minimal.
  * Display subtle animations for generating state, rate-limit countdown toast, and latency badge (`e.g., 1.4s`).

### Phase 4 Ending Conditions (Definition of Done)

* [ ] Asking a system design or DSA question in a mock video automatically triggers a structured, 2–4 bullet-point hint within $< 2.5\text{ s}$ without manual intervention.
* [ ] Pressing `Ctrl+Shift+Space` while a hint is mid-stream immediately aborts the old stream and begins streaming a fresh response.
* [ ] Triggering more than $L$ requests within $60\text{ s}$ trips the CAS rate limiter, prevents extra LLM API calls, and shows a clean cooldown message in the HUD.
* [ ] Unit tests for the CAS rate limiter and trigger heuristics pass $100\%$.
* [ ] Simulating a primary LLM outage (e.g., invalid primary key) seamlessly fails over to the secondary provider within one request.

> **Learning Checkpoint:** Walk through how a Compare-And-Swap (`Atomics.compareExchange`) loop prevents race conditions without using traditional mutex locks, and explain the classic boundary-burst edge case of fixed-window rate limiting.

---

## Phase 5: Authentication, MongoDB Persistence & Review Dashboard

**Objective:** Secure the platform with JWT authentication, persist profiles and interview histories in MongoDB using the bucket pattern, and provide clean UI flows for configuring prompts and reviewing past sessions.

**Learning Focus:** MongoDB schema design (Bucket Pattern & indexing), password hashing (`argon2`/`bcrypt`), JWT auth + WebSocket handshake authentication, Electron OS-level credential encryption (`safeStorage`), and privacy-by-design (Ephemeral Mode).

### Minor Milestones

* **Milestone 5.1 — Third-Party Packages & MongoDB Data Layer**
  * Install `mongoose` (or native `mongodb` driver), `jsonwebtoken`, and `argon2` (or `bcryptjs`) in `apps/server`.
  * Implement models and indexes for `users`, `profiles`, `sessions`, `transcript_chunks` (max $100$ utterances per document), and `hints`.
  * Wire asynchronous batch flushing into `SessionController` (flush every $30\text{ s}$ and on `SESSION_END`) so database writes never block live audio processing.
  * Implement **Ephemeral Mode**: when enabled, skip all `transcript_chunks` and `hints` DB writes and wipe RAM buffers immediately on `SESSION_END`.
* **Milestone 5.2 — Express REST API & Authenticated WebSocket Handshake**
  * Build `/api/v1/auth` (`register`, `login`, `refresh`) issuing short-lived Access JWTs ($15\text{ m}$) + Refresh Tokens.
  * Build `/api/v1/profiles` and `/api/v1/sessions` CRUD endpoints scoped strictly to `req.user.id`.
  * Enforce JWT verification during the WebSocket `upgrade` handshake (`Authorization: Bearer <token>`), rejecting unauthenticated connections before opening Deepgram sockets.
* **Milestone 5.3 — Electron Secure Token Storage (`safeStorage`)**
  * Use Electron's `safeStorage.encryptString` / `decryptString` (backed by Windows DPAPI) in the Main process to persist user refresh tokens safely on disk.
* **Milestone 5.4 — UI Milestone: Settings, Profiles & Session Review Views**
  * Create a clean secondary Settings/Dashboard view (accessible via the System Tray or an interactive HUD toggle—keeping the main overlay window ultra-lightweight).
  * Build Login/Register screen, Profile Editor (Resume summary, Target JD, Custom System Prompt), Ephemeral Mode toggle, and Opacity slider ($0.4\text{--}0.95$).
  * Build a Post-Interview Review screen displaying saved transcripts alongside the exact hints generated at each timestamp, with a one-click Delete Session action.

### Phase 5 Ending Conditions (Definition of Done)

* [ ] Unauthenticated WebSocket connections are rejected with HTTP `401` before reaching `SessionController`.
* [ ] Creating a custom Profile (e.g., "Senior Backend Engineer — Node.js") injects that profile's resume/JD into the LLM's answers during the next live session.
* [ ] Completing a 10-minute test session persists bucketed transcripts and hints to MongoDB and renders them accurately in the Review view.
* [ ] Enabling **Ephemeral Mode** and running a session results in zero transcript/hint documents written to MongoDB.
* [ ] Restarting the desktop app keeps the user logged in securely via `safeStorage` without storing plaintext tokens on disk.

> **Learning Checkpoint:** Why does `docs/architecture.md` use the MongoDB Bucket Pattern (`transcript_chunks` capped at $100$ utterances) instead of embedding an unbounded array of utterances directly inside the `sessions` document?

---

## Phase 6: Performance Tuning, Resilience & Windows Packaging

**Objective:** Profile and optimize end-to-end latency and memory footprint, harden the app against real-world network and hardware failures, and compile a clean, distributable Windows desktop executable.

**Learning Focus:** Latency instrumentation, Chromium/V8 memory profiling, chaos/fault testing, Content Security Policy (CSP) hardening, and native Windows bundling with `electron-builder`.

### Minor Milestones

* **Milestone 6.1 — Latency Instrumentation & Electron Memory Hygiene**
  * Instrument timestamps across the full pipeline ($T_{\text{chunk}}, T_{\text{net}}, T_{\text{stt}}, T_{\text{endpoint}}, T_{\text{llm\_ttft}}, T_{\text{render}}$) and log p50/p95 latency summaries on `SESSION_END`.
  * Apply Electron production optimizations: V8 heap cap (`--max-old-space-size=256`), disable spellchecker and unused Chromium background features, verify zero leaked `MediaStream` tracks or WebSocket listeners across repeated Start/Stop cycles.
* **Milestone 6.2 — Fault Tolerance & Edge-Case Hardening**
  * Test and harden recovery for:
    * Wi-Fi disconnect/reconnect mid-interview.
    * Switching default Windows audio output (e.g., plugging in Bluetooth headphones).
    * Deepgram unexpected socket close (auto-reopen transparently inside `SessionController`).
    * Strict Content Security Policy (CSP) meta tags blocking remote/inline script execution.
* **Milestone 6.3 — Third-Party Package Milestone: Windows Packaging (`electron-builder`)**
  * Install and configure `electron-builder` with `electron-builder.yml` for Windows x64 (portable `.exe` and/or NSIS installer) with ASAR packaging enabled.
  * Configure clean build metadata (`productName`, `executableName`, custom icon) and verify that `AudioWorklet` files and preload scripts resolve cleanly inside the packaged `.asar` archive.
  * Run a full end-to-end mock interview using the compiled `.exe` against your deployed (or local) server.

### Phase 6 Ending Conditions (Definition of Done)

* [ ] Measured p95 Time-to-First-Hint ($T_{\text{total}}$) is strictly under $2.5\text{ s}$ across 20 consecutive test questions.
* [ ] Running a 45-minute continuous session keeps Electron Renderer RAM stable (no monotonic memory leak) and CPU usage low enough that VS Code + a video call remain lag-free.
* [ ] The packaged Windows `.exe` launches cleanly on a fresh run, passes the OBS/Zoom screen-capture invisibility test, captures dual-channel audio, and streams hints end-to-end.
* [ ] Zero secrets (Deepgram/LLM/MongoDB keys) appear anywhere inside the unpacked ASAR bundle.

> **Learning Checkpoint:** What are the biggest contributors to end-to-end latency in a streaming voice-to-LLM pipeline, and which single architectural decision saved the most milliseconds?

---

## Summary Milestone Tracker

| Phase | Core Deliverable | Primary Third-Party Packages | Key Verification Gate |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Monorepo & Shared Types | `typescript`, `zod`, Docker | Cross-workspace typecheck + DB ping |
| **Phase 1** | Stealth Electron Overlay HUD | `electron`, `vite`, `react`, `tailwindcss` | Invisible on OBS/Zoom screen share |
| **Phase 2** | Dual-Channel PCM16 Audio | Native Web Audio + `AudioWorklet` | Clear stereo $16000\text{ Hz}$ `.wav` test |
| **Phase 3** | WS Gateway & Streaming STT | `express`, `ws`, `@deepgram/sdk` | Sub-$600\text{ ms}$ labeled live transcript |
| **Phase 4** | Context, Triggers, CAS & LLM | `@google/genai`, `groq-sdk`, `react-markdown` | $< 2.5\text{ s}$ streaming hints + CAS tests |
| **Phase 5** | Auth, MongoDB & Dashboard | `mongoose`, `jsonwebtoken`, `argon2` | JWT WS auth + Ephemeral Mode verified |
| **Phase 6** | Tuning & Windows Packaging | `electron-builder` | Clean `.exe` passes 45-min soak test |