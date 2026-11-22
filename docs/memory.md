# Project Memory & AI Handoff Document: Project Bash

**Project Name:** Bash

**Architecture Version:** 2.1 (Node.js / Electron Stealth Desktop Architecture)

**Last Updated:** 2026-11-22

**Current Phase:** Phase 1 — Milestone 1.3 Complete (Ready for Milestone 1.4)

**Next Action:** Advance to **Phase 1 — Milestone 1.4 (UI Milestone: Minimalist Overlay HUD — OverlayHUD.tsx, StatusBar.tsx with mocked hints)**

> **MANDATORY AI UPDATE PROTOCOL (DEFAULT BEHAVIOR)**
>
> Any AI assistant working on this repository **MUST** read `docs/rules.md` and `docs/memory.md` at the start of every session and **MUST automatically update this file upon completing every minor milestone** (or after any architectural pivot, major bug fix, or blocker discovery) **without waiting for the user to ask**.
>
> Every update must refresh:
>
> 1. `Last Updated`, `Current Phase`, and `Next Action` in the header.
>
> 2. Section 4 (`Immediate Focus & Next Steps`).
>
> 3. Section 5 (`Master Progress Tracker`) checkboxes and status tags.
>
> 4. Section 6 (`File & Workspace Inventory`) for newly created/modified key modules.
>
> 5. Section 7 (`Milestone Completion Log`) with a dated entry and verification summary.

## 1. Fast AI Onboarding: What Is Project Bash?

**Project Bash** is a personal, low-latency, desktop-native AI interview copilot built for **Windows 10/11 (x64)**. It captures bidirectional audio in real time (system output = interviewer, microphone = candidate), streams live audio to a Speech-to-Text engine, and renders concise, scannable bullet-point hints inside a transparent, always-on-top desktop overlay that is programmatically excluded from screen sharing and screen recording.

### Canonical Reference Documents

Always cross-check these files before making structural decisions:

* **`docs/rules.md`** — Universal AI assistant rules, MUST/MUST NOT guardrails, mandatory decision trade-off justifications, behind-the-scenes package/mechanism deep-dives, and automatic `docs/memory.md` update protocol.

* **`docs/bash_prd.md`** — Product requirements, user goals, stealth requirements, and NFRs (v2.1).

* **`docs/architecture.md`** — Full system design, Electron process model, stereo PCM audio pipeline, WebSocket/REST protocols, CAS rate limiter, MongoDB schema, and latency budget.

* **`docs/phases.md`** — Sequential 7-phase roadmap (`Phase 0` through `Phase 6`), split into minor milestones (Core, Third-Party Packages, UI) with explicit Ending Conditions and Learning Checkpoints.

* **`docs/memory.md`** *(this file)* — Single source of truth for current project progress, completed work, active context, and next steps.

### Primary Tech Stack

* **Desktop Client:** Electron (Main + Preload + Renderer), React, TypeScript, Tailwind CSS, Vite, Web Audio API (`AudioWorklet`).

* **Backend Server:** Node.js, TypeScript, Express, WebSockets (`ws`), Zod, Pino.

* **Database:** MongoDB (local Docker for dev; Mongoose / native driver).

* **AI Services:** Deepgram Streaming STT (`nova-2`), Gemini Flash (primary LLM), Groq (secondary failover LLM).

* **Packaging:** `electron-builder` (Windows x64 portable `.exe` / NSIS).

## 2. MVP Definition (v1.0 Scope)

The project is considered **MVP Complete** only when all of the following are verified end-to-end on Windows 10/11:

1. **Invisible Desktop Overlay:** Borderless, transparent, always-on-top, non-focus-stealing, click-through Electron HUD excluded from screen capture (`setContentProtection(true)` $\to$ `WDA_EXCLUDEFROMCAPTURE`) and hidden from Taskbar / `Alt+Tab`, controlled via global hotkeys (`Ctrl+Shift+H/I/Space/X`).

2. **Dual-Channel Audio Capture:** Simultaneous capture of Windows system audio loopback (Channel 0 / Interviewer) and microphone (Channel 1 / Candidate), resampled in an `AudioWorklet` to interleaved $16000\text{ Hz}$, $16\text{-bit}$ signed PCM stereo chunks ($100\text{ ms}$ frames, $64\text{ KB/s}$).

3. **Real-Time Transcription & Hints:** WebSocket streaming to Node.js backend $\to$ Deepgram multichannel STT $\to$ sliding context window ($3\text{--}5\text{ min}$ rolling buffer) $\to$ smart question trigger + manual hotkey override $\to$ streaming LLM hints ($2\text{--}4$ concise bullet points) in under $2.5\text{ s}$ Time-to-First-Hint.

4. **Cost & Concurrency Protection:** Fixed-window rate limiter using atomic Compare-And-Swap (`Atomics.compareExchange`) guarding LLM calls.

5. **Auth, Persistence & Privacy:** JWT-authenticated REST + WebSocket handshake, MongoDB persistence (bucketed `transcript_chunks`, `profiles`, `sessions`, `hints`), OS-encrypted client token storage (`safeStorage`), and an **Ephemeral Mode** toggle (zero DB writes).

6. **Clean Packaging:** Distributable Windows `.exe` built via `electron-builder` with zero API secrets bundled on the client.

### Explicitly Out of Scope for MVP (Post-MVP)

* macOS / Linux support.

* Screen OCR / multimodal screenshot capture.

* Advanced C++ DLL injection / kernel-level anti-cheat evasion.

* Multi-region Redis cluster scaling (single-node atomic CAS is MVP; Redis Lua is future scale).

## 3. Locked Architectural Decisions & Invariants

Do **not** reverse these decisions unless explicitly instructed by the user:

1. **Node/Electron Stack:** Pivoted from Browser Extension $\to$ Tauri/Rust $\to$ **Electron (Node.js/TypeScript)** to keep a unified JS/TS stack while retaining native OS screen-capture exclusion via `win.setContentProtection(true)`.

2. **Strict Electron Security:** Always enforce `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and typed `contextBridge` IPC.

3. **Zero Client Secrets:** Deepgram, Gemini, Groq, and MongoDB credentials live **exclusively** on the Node.js backend.

4. **Stereo Multichannel over Mono Mixing:** Keep System Audio on Channel 0 and Mic on Channel 1 for $100\%$ deterministic speaker attribution in Deepgram without diarization latency.

5. **Learning-First Workflow:** Build **one minor milestone at a time**, justify every decision against its alternatives, explain every new package/mechanism behind the scenes (per `docs/rules.md`), and pass each phase's Learning Checkpoint and Ending Conditions before moving forward.

## 4. Immediate Focus & Next Steps

* **What Has Been Done Until Now:**

  * Completed all 5 pre-development governance and design documents (`bash_prd.md`, `architecture.md`, `phases.md`, `memory.md`, `rules.md`).

  * **Completed Milestone 0.1 (Monorepo & Tooling Setup):** Initialized `pnpm` workspace with `packages/shared`, `apps/desktop`, and `apps/server`. Configured `tsconfig.base.json` and project references (`composite: true`), ESLint 9 + Prettier, root convenience scripts (`typecheck`, `format`, `lint`, `dev:server`).

  * **Completed Milestone 0.2 (Third-Party Packages & Local Infrastructure):** Installed `zod`, `dotenv`, and `tsx`. Created `docker-compose.yml` for local MongoDB 7.0 container. Built fail-fast `env.ts` configuration loader in `apps/server` with Zod validation.

  * **Completed Milestone 0.3 (Shared Protocol Contracts):** Defined strongly typed discriminated unions for WebSocket control frames in `ws-protocol.ts` (with runtime Zod schemas and type guards), Electron IPC channels and signatures in `ipc-channels.ts`, and core domain DTOs (`TranscriptUtterance`, `HintDTO`, `ProfileDTO`, `UserSettings`, `SessionDTO`) in `models.ts`. Verified cross-package consumption in both `apps/server` and `apps/desktop`.

  * **Phase 0 Gate Verified:** All Phase 0 Ending Conditions met.

  * **Completed Milestone 1.1 (Third-Party Packages & Desktop Boilerplate):** Scaffolded `apps/desktop` with `electron`, `vite`, `react`, `react-dom`, `tailwindcss`, `vite-plugin-electron/simple`, `postcss`, and `autoprefixer`. Configured Electron Main process with single-instance lock (`app.requestSingleInstanceLock()`), Preload script with typed `contextBridge`, React 19 root with Tailwind CSS styling, and Vite dev/build workflows. Verified duplicate instance rejection, second-instance IPC focus signaling, clean build artifacts, and passing monorepo-wide typecheck/lint.

  * **Completed Milestone 1.2 (Stealth Overlay BrowserWindow):** Transformed `BrowserWindow` into a frameless, transparent overlay (`frame: false`, `transparent: true`, `hasShadow: false`, `focusable: false`, `skipTaskbar: true`, `resizable: false`, `alwaysOnTop: true, 'screen-saver'`) centered horizontally near the top edge of the primary display. Activated OS-level screen-capture exclusion via `setContentProtection(true)` (`WDA_EXCLUDEFROMCAPTURE`), click-through mouse passthrough via `setIgnoreMouseEvents(true, { forward: true })`, and implemented the IPC handler for `IPC_CHANNELS.SET_CLICK_THROUGH`. Updated `index.html`, `index.css`, and `App.tsx` to render transparent glass with a low-glare floating card.

  * **Completed Milestone 1.3 (Secure Preload Bridge, Global Hotkeys & System Tray):** Built dedicated Windows System Tray controller in `electron/tray.ts` generating a 16x16 RGBA in-memory icon with Toggle Visibility, Toggle Interactive, and Quit menus. Registered OS-wide global shortcuts via `globalShortcut` in `electron/main.ts` (`Ctrl+Shift+H` for hide/show, `Ctrl+Shift+I` for click-through toggle, `Ctrl+Shift+Space` for manual trigger, and `Ctrl+Shift+X` for context flush). Exposed typed subscriber APIs on `window.bashAPI` via `preload.ts` (`contextBridge`) with automatic unlistener cleanup. Wired reactive state in `App.tsx` to dynamically flip between `LOCKED (Click-Through)` and `INTERACTIVE (Draggable)` modes, enable window dragging when unlocked (`-webkit-app-region: drag`), and display transient toast notifications on trigger/clear hotkeys. Handled clean teardown (`unregisterAll`, `destroySystemTray`) on `will-quit`.

* **What We Need to Do Right Now:**

  * Advance to **Phase 1 — Milestone 1.4: UI Milestone: Minimalist Overlay HUD (Mocked State)**:
    * Design and build `OverlayHUD.tsx` and `StatusBar.tsx` with Tailwind CSS using low-glare dark neutral tones.
    * Add visual badge indicating `LOCKED (Click-Through)` vs. `INTERACTIVE (Draggable)` mode.
    * Render mocked bullet-point hints and verify readability when positioned near the top-center of your monitor over VS Code and a browser.

* **Active Blockers / Open Decisions:**

  * Confirm primary LLM provider key availability before Phase 4 (Gemini Flash vs. Groq).

## 5. Master Progress Tracker

**Legend:** `[ ]` Pending | `[~]` In Progress | `[x]` Completed

### Pre-Development: Design & Specifications (`Completed`)

* `[x]` **Doc 0.1** — Product Requirements Document (`docs/bash_prd.md` v2.1)

* `[x]` **Doc 0.2** — System Architecture & Design Spec (`docs/architecture.md` v2.1)

* `[x]` **Doc 0.3** — Phased Roadmap & Minor Milestones (`docs/phases.md`)

* `[x]` **Doc 0.4** — Project Memory & AI Handoff Log (`docs/memory.md`)

* `[x]` **Doc 0.5** — Universal AI Assistant Rules File (`docs/rules.md`)

### Phase 0: Monorepo Foundation & Shared Contracts (`Completed`)

* `[x]` **0.1** — Monorepo & Tooling Setup (`packages/shared`, `apps/desktop`, `apps/server`)

* `[x]` **0.2** — Third-Party Packages & Local Infrastructure (`zod`, `docker-compose.yml` for MongoDB, `env.ts`)

* `[x]` **0.3** — Shared Protocol Contracts (`ws-protocol.ts`, `ipc-channels.ts`, `models.ts`)

* `[x]` **Gate:** Phase 0 Ending Conditions & Learning Checkpoint Verified

### Phase 1: Electron Desktop Shell & Screen-Capture-Excluded Overlay (`In Progress`)

* `[x]` **1.1** — Third-Party Packages & Desktop Boilerplate (`electron`, `vite`, `react`, `tailwindcss`)

* `[x]` **1.2** — Stealth Overlay `BrowserWindow` (`setContentProtection(true)`, `skipTaskbar`, `focusable: false`, click-through)

* `[x]` **1.3** — Secure Preload Bridge (`contextBridge`), Global Hotkeys & System Tray

* `[ ]` **1.4** — **UI Milestone:** Minimalist Overlay HUD (`OverlayHUD.tsx`, `StatusBar.tsx` with mocked hints)

* `[ ]` **Gate:** Phase 1 Ending Conditions (OBS/Meet screen-share invisibility test) & Learning Checkpoint Verified

### Phase 2: Dual-Channel Audio Capture & Signal Processing Pipeline (`Pending`)

* `[ ]` **2.1** — System Audio Loopback (`setDisplayMediaRequestHandler`) & Microphone Acquisition

* `[ ]` **2.2** — Stereo `ChannelMergerNode(2)` & `AudioWorkletProcessor` ($16000\text{ Hz}$ `Int16` PCM, $100\text{ ms}$ frames)

* `[ ]` **2.3** — **UI Milestone:** Dual-Channel Audio Meters & Local 5s `.wav` Loopback Verifier

* `[ ]` **Gate:** Phase 2 Ending Conditions & Learning Checkpoint Verified

### Phase 3: Backend WebSocket Gateway & Streaming Transcription (`Pending`)

* `[ ]` **3.1** — Third-Party Packages (`express`, `ws`, `pino`) & Node.js Gateway Scaffold

* `[ ]` **3.2** — Client WebSocket Hook (`useSessionWS.ts`), Binary Audio Streaming & Backoff Reconnect

* `[ ]` **3.3** — **Third-Party Package Milestone:** Deepgram Streaming Bridge (`nova-2`, multichannel, KeepAlive)

* `[ ]` **3.4** — **UI Milestone:** Live Transcript Ticker (`INT` vs. `YOU` labels & status indicator)

* `[ ]` **Gate:** Phase 3 Ending Conditions & Learning Checkpoint Verified

### Phase 4: AI Reasoning Pipeline, Context Engine & CAS Rate Limiter (`Pending`)

* `[ ]` **4.1** — Sliding Context Window Manager (`contextMgr.ts`, rolling ring buffer)

* `[ ]` **4.2** — Smart Trigger Engine (`trigger.ts`, manual override + question heuristics + $4\text{ s}$ debounce)

* `[ ]` **4.3** — Fixed-Window CAS Rate Limiter (`rateLimiter.ts`, `Atomics.compareExchange` + concurrency unit tests)

* `[ ]` **4.4** — **Third-Party Package Milestone:** Streaming LLM Client (`@google/genai`, `groq-sdk`, `AbortController`, failover)

* `[ ]` **4.5** — **UI Milestone:** Streaming Hint Card (`react-markdown`, $33\text{ ms}$ throttled flush, latency & quota UI)

* `[ ]` **Gate:** Phase 4 Ending Conditions & Learning Checkpoint Verified

### Phase 5: Authentication, MongoDB Persistence & Review Dashboard (`Pending`)

* `[ ]` **5.1** — Third-Party Packages (`mongoose`, `jsonwebtoken`, `argon2`) & MongoDB Data Layer (Bucket Pattern + Ephemeral Mode)

* `[ ]` **5.2** — Express REST API (`/api/v1`) & Authenticated WebSocket Upgrade Handshake

* `[ ]` **5.3** — Electron Secure Token Storage (`safeStorage` / Windows DPAPI)

* `[ ]` **5.4** — **UI Milestone:** Login/Register, Profile Editor, Settings & Post-Interview Session Review Views

* `[ ]` **Gate:** Phase 5 Ending Conditions & Learning Checkpoint Verified

### Phase 6: Performance Tuning, Resilience & Windows Packaging (`Pending`)

* `[ ]` **6.1** — Pipeline Latency Instrumentation & Electron V8/Memory Hygiene

* `[ ]` **6.2** — Fault Tolerance (Wi-Fi drops, audio device switch, Deepgram reconnect, CSP hardening)

* `[ ]` **6.3** — **Third-Party Package Milestone:** Windows Packaging (`electron-builder`, ASAR verification, end-to-end soak test)

* `[ ]` **Gate:** Phase 6 Ending Conditions (p95 $< 2.5\text{ s}$, 45-min soak test, clean `.exe`) & Learning Checkpoint Verified

## 6. File & Workspace Inventory

### Root Monorepo & Tooling Configuration

* `package.json` — Monorepo root manifest declaring workspace dependencies, `typecheck`, `lint`, and formatting scripts.
* `pnpm-workspace.yaml` — Defines workspace topology (`packages/*`, `apps/*`).
* `docker-compose.yml` — Container definition for local MongoDB 7.0 development (`bash_mongodb`) with healthcheck and volume persistence.
* `tsconfig.base.json` — Shared strict compiler options (`NodeNext`, `composite: true`, `strict: true`).
* `tsconfig.json` — Root project reference coordinator linking all workspace projects for single-command `tsc -b`.
* `eslint.config.mjs` — ESLint 9 Flat Config with TypeScript integration (ignoring build distribution directories `dist/` and `dist-electron/`).
* `.prettierrc.json` & `.prettierignore` — Deterministic formatting rules and exclusions.
* `.gitignore` — Ignore patterns for `node_modules`, build artifacts, `.env` files, and system files.

### Packages & Applications

* `packages/shared/` — Common TypeScript contracts library (`@bash/shared`).
  * `package.json` — Package configuration exporting ES modules and `.d.ts` types (with `zod`).
  * `tsconfig.json` — Project references composite TypeScript configuration (`composite: true`).
  * `src/ws-protocol.ts` — Discriminated unions, Zod schemas, and type guards for all Client and Server WebSocket control messages.
  * `src/ipc-channels.ts` — Typed Electron IPC channel constants, invoke contracts, and listener contracts.
  * `src/models.ts` — Domain DTOs (`TranscriptUtterance`, `HintDTO`, `ProfileDTO`, `UserSettings`, `SessionDTO`).
  * `src/index.ts` — Central re-export hub for all contracts and core metadata.
* `apps/server/` — Node.js backend workspace (`@bash/server`).
  * `package.json` — Workspace manifest consuming `@bash/shared: workspace:*`, `zod`, `dotenv`, and `tsx`.
  * `tsconfig.json` — Project references configuration extending root base.
  * `.env.example` — Template defining all required environment variables for development.
  * `src/config/env.ts` — Strict, fail-fast environment loader validating runtime variables with Zod schemas.
  * `src/index.ts` — Server entry point validating environment and handling typed WebSocket message contracts.
* `apps/desktop/` — Electron + React desktop workspace (`@bash/desktop`).
  * `package.json` — Desktop workspace manifest configuring Vite, React 19, Tailwind CSS, and `dist-electron/main.js` entry point.
  * `vite.config.ts` — Vite build and dev configuration utilizing `@vitejs/plugin-react` and `vite-plugin-electron/simple`.
  * `tailwind.config.js` & `postcss.config.js` — Utility CSS configuration defining low-glare dark HUD color tokens and PostCSS plugins.
  * `electron/tray.ts` — Dedicated Windows System Tray controller with in-memory 16x16 icon, toggle visibility/interactive menus, and quit action.
  * `electron/main.ts` — Main process entry point enforcing single-instance lock, top-center monitor positioning, `setContentProtection(true)`, `setIgnoreMouseEvents(true, { forward: true })`, global shortcuts (`Ctrl+Shift+H/I/Space/X`), and system tray lifecycle.
  * `electron/preload.ts` — Typed Preload script exposing `window.bashAPI` with `onInteractiveToggle`, `onManualTrigger`, `onClearContext`, and `setClickThrough` via `contextBridge`.
  * `src/main.tsx` — React 19 entry point mounting the root application into `#root`.
  * `src/App.tsx` — Stealth floating HUD overlay component with transparent background, dynamic status badge (`LOCKED` vs. `INTERACTIVE`), hotkey toast banner, and scannable technical hints.
  * `src/index.css` & `index.html` — Transparent background styling and user-select suppression for seamless glass rendering.
  * `src/types/electron.d.ts` — TypeScript ambient declaration attaching typed `bashAPI` to `window`.
  * `tsconfig.json` — Composite TypeScript project references configuration with DOM and React JSX support.

### Documentation Artifacts

* `docs/rules.md` — Universal AI assistant rules, trade-off justification protocol, behind-the-scenes deep-dive rules, and auto-memory enforcement.

* `docs/bash_prd.md` — Product Requirements Document (v2.1).

* `docs/architecture.md` — Full technical architecture & design specification (v2.1).

* `docs/phases.md` — Phased milestones and verification gates.

* `docs/memory.md` — Live project memory & AI handoff state.

## 7. Milestone Completion Log (Chronological)

| Date | Phase / Milestone | Summary of Work Completed | Verification Status | 
| ----- | ----- | ----- | ----- | 
| `2026-11-22` | `Doc 0.1` | Drafted `docs/bash_prd.md` and finalized pivot to Node.js / Electron stealth desktop architecture (v2.1). | Approved by user | 
| `2026-11-22` | `Doc 0.2` | Created comprehensive `docs/architecture.md` covering Electron IPC/stealth, stereo PCM16 pipeline, WS/REST contracts, CAS rate limiter, MongoDB schema, and latency budget. | Approved by user | 
| `2026-11-22` | `Doc 0.3` | Created `docs/phases.md` breaking the build into Phases 0–6 with minor Core, Third-Party Package, and UI milestones plus ending conditions. | Approved by user | 
| `2026-11-22` | `Doc 0.4` | Created `docs/memory.md` to track project progress, MVP scope, invariants, and automated AI handoff state. | Approved by user | 
| `2026-11-22` | `Doc 0.5` | Created `docs/rules.md` defining universal MUST/MUST NOT guardrails, mandatory alternative comparisons, behind-the-scenes package/mechanism deep-dives, and default `docs/memory.md` auto-updates. | Completed & logged | 
| `2026-11-22` | `Phase 0 / 0.1` | Initialized pnpm monorepo workspace (`packages/shared`, `apps/desktop`, `apps/server`), shared TypeScript configuration with project references (`composite: true`), ESLint 9 + Prettier, and root convenience scripts (`typecheck`, `lint`, `format`). | Verified clean (`pnpm typecheck`, `pnpm run lint`, `pnpm format:check`, runtime imports passed with code 0) | 
| `2026-11-22` | `Phase 0 / 0.2` | Installed core utility packages (`zod`, `dotenv`, `tsx`), created `docker-compose.yml` for local MongoDB 7.0 container with health checks, and built fail-fast Zod-validated `env.ts` loader in `apps/server`. | Verified clean (missing env throws human-readable validation error; valid env boots cleanly with code 0) | 
| `2026-11-22` | `Phase 0 / 0.3` | Implemented shared protocol contracts in `packages/shared`: `ws-protocol.ts` (discriminated union message types + Zod schemas + type guards), `ipc-channels.ts` (Electron IPC contracts), and `models.ts` (domain DTOs). Verified cross-package consumption in `apps/server` and `apps/desktop`. | Verified clean (`tsc -b`, `eslint .`, `prettier`, and runtime message handler tests passed with code 0) | 
| `2026-11-22` | `Phase 0 Gate` | Verified all Phase 0 Ending Conditions across monorepo typechecks, cross-package imports, and Zod fail-fast validation. | Phase 0 Complete |
| `2026-11-22` | `Phase 1 / 1.1` | Scaffolded `apps/desktop` with Electron, Vite, React 19, and Tailwind CSS. Implemented single-instance lock (`app.requestSingleInstanceLock()`), Preload contextBridge, and React overlay component. | Verified clean: automated single-instance lock test (duplicate instance rejected, primary focused, code 0), build artifacts generated, and monorepo `pnpm format`, `pnpm lint`, and `pnpm typecheck` passed with code 0. |
| `2026-11-22` | `Phase 1 / 1.2` | Transformed `BrowserWindow` into frameless, transparent overlay with `setContentProtection(true)` (`WDA_EXCLUDEFROMCAPTURE`), click-through passthrough (`setIgnoreMouseEvents`), `focusable: false`, and `skipTaskbar: true`. Updated `App.tsx` and CSS for glass rendering with floating HUD card. | Verified clean: automated Electron launch test passed with `alwaysOnTop = true`, stealth overlay verified, build artifacts generated, and monorepo `pnpm format`, `pnpm lint`, and `pnpm typecheck` passed with code 0. |
| `2026-11-22` | `Phase 1 / 1.3` | Built Windows System Tray controller (`electron/tray.ts`), registered global shortcuts (`Ctrl+Shift+H/I/Space/X`), exposed typed listener bridge (`preload.ts`), and wired interactive drag vs click-through mode in `App.tsx` with hotkey toast feedback. | Verified clean: automated launch test verified shortcut registration and tray creation, build passed, and monorepo `pnpm format`, `pnpm lint`, and `pnpm typecheck` passed with code 0. |

## 8. Known Issues, Gotchas & Environment Notes

* **Windows & pnpm Installations:** Per sandbox policy, pnpm commands that alter packages (`pnpm install`, `pnpm add`) should be run with elevated bypass permissions on Windows to handle hard-link creation cleanly, while verification scripts (`typecheck`, `lint`, `format`) run securely within the sandbox.
* **pnpm v11 Build Script Approvals:** Modern pnpm enforces security checks on packages that execute build scripts (`esbuild` post-install). Running `pnpm approve-builds --all` registers permanent approval for trusted dependencies.
* **Prettier Markdown Safety:** Excluded `docs/` and `*.md` from formatting checks in `.prettierignore` to protect LaTeX math formulas (`KaTeX`) and markdown tables from unintended line-wrapping mutations.
* **`ELECTRON_RUN_AS_NODE` Gotcha:** When executing Electron test commands from IDE-spawned terminal sessions, `ELECTRON_RUN_AS_NODE=1` is inherited from the IDE's environment, causing `electron.exe` to strip all Electron APIs and run as pure Node.js. Child test processes must delete `ELECTRON_RUN_AS_NODE` from `process.env` to run in native Electron app mode.
* **Electron CommonJS vs ESM Main Entry:** Inside Node.js, `electron`'s npm stub exports an executable path rather than native framework APIs. Compiling the Electron Main process as CommonJS (`formats: ["cjs"]` via `vite-plugin-electron/simple`) allows Electron's internal `Module._load` hook to provide native `app`, `BrowserWindow`, and `shell` APIs seamlessly.
* **Windows GUI Headless Execution:** Windows GUI applications require an interactive desktop window station (`WinSta0\Default`) to create HWNDs. Running automated Electron launch tests requires running outside the restricted sandbox (`BypassSandbox: true`) with `--no-sandbox` and `--disable-gpu` flags.
* **Chromium Single-Instance Lockfile Isolation in Automated Tests:** When running automated Electron tests in CI or sandbox commands, passing `--user-data-dir` avoids permissions conflicts on `%APPDATA%` and guarantees clean test isolation.
* **Windows Notification Area (Tray) Headless Handling:** Windows `Shell_NotifyIconW` gracefully warns if running in non-interactive / headless CI environments; wrapping `tray.ts` with error guards prevents headless test runner crashes while fully activating on user desktop sessions.
