# Universal AI Assistant Rules & Engineering Charter: Project Bash

**Applies To:** Any AI coding assistant, LLM agent, or IDE copilot (compatible with `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, and `.github/copilot-instructions.md`).

**Project:** Project Bash (Electron + React + Node.js/Express + WebSockets + MongoDB)

**Governance Principle:** This is a **learning-first engineering project**. Your job is not merely to produce working code—your job is to build Project Bash cleanly, one minor milestone at a time, while ensuring the developer understands every architectural trade-off, every third-party package, and every under-the-hood mechanism.

## 1. Mandatory Session Startup Protocol

Before writing a single line of code, suggesting a command, or proposing a refactor in **any** new session, you **MUST**:

1. Read `docs/memory.md` first to understand the current phase, completed milestones, active blockers, and the exact next minor milestone.
2. Read the active milestone specification in `docs/phases.md` (including its **Phase Ending Conditions** and **Learning Checkpoint**).
3. Cross-check `docs/architecture.md` and `docs/bash_prd.md` so your implementation never drifts from locked architectural invariants.
4. State clearly to the user: *"We are currently on Phase X, Milestone X.Y. Here is the scope and plan before we write code."*

## 2. Mandatory Decision Justification Protocol (Compare Alternatives)

For **every** technical, architectural, library, data-structure, or implementation decision (whether choosing a package, designing a database schema, picking an audio format, or selecting a concurrency pattern), you **MUST** explicitly justify the choice by comparing it against real alternatives **before** implementing it.

Use this exact structure whenever making a decision:

> ### Decision: [Name of Choice]
> * **Selected Approach:** What we are proceeding with.
> * **Alternatives Considered:** At least 2 realistic alternatives (e.g., Alternative A, Alternative B).
> * **Why We Chose This:** Concrete technical, latency, DX, or maintainability reasons aligned with Project Bash's NFRs.
> * **Why We Left Out Alternatives:** Specific trade-offs, bottlenecks, complexity costs, or incompatibilities that disqualified each alternative.

Never make a silent or "because it's popular" choice. If the user asks to change a decision, present the trade-offs neutrally before pivoting.

## 3. Mandatory Package & Mechanism Deep-Dive Protocol ("Behind the Scenes")

Whenever you add a **new third-party package** (e.g., `zod`, `ws`, `@deepgram/sdk`, `argon2`, `electron-builder`) OR introduce a **low-level platform mechanism** (e.g., `AudioWorklet`, `setContentProtection`, `Atomics.compareExchange`, `contextBridge`, MongoDB Bucket Pattern), you **MUST** provide a concise, deep technical breakdown covering all four points:

> ### Package / Mechanism Deep-Dive: `[name]`
> 1. **Role in Project Bash:** Exactly what problem this solves in our current milestone.
> 2. **Why We Need It (vs. DIY / Alternatives):** Why we are adding this dependency (or native API) instead of writing it from scratch or picking a competing library.
> 3. **How It Works Behind the Scenes:** Concrete internal mechanics—what happens at the runtime, V8/Node.js event loop, OS API, memory, or network protocol level (no hand-waving or vague buzzwords).
> 4. **Failure Modes / Gotchas:** Key edge cases, memory pitfalls, or security caveats we must guard against when using it.

## 4. Mandatory Automatic `docs/memory.md` Update Protocol

You **MUST** automatically update `docs/memory.md` **by default** upon completing **every minor milestone**, architectural pivot, major bug fix, or blocker discovery—**without waiting for the user to remind you**.

Every automatic update to `docs/memory.md` MUST refresh:
1. Header fields: `Last Updated`, `Current Phase`, and `Next Action`.
2. **Section 4 (`Immediate Focus & Next Steps`):** Move finished work to "What Has Been Done" and advance the immediate next milestone.
3. **Section 5 (`Master Progress Tracker`):** Flip completed items from `[ ]` / `[~]` to `[x]` and mark the next active item `[~]` if started.
4. **Section 6 (`File & Workspace Inventory`):** List newly created or materially updated modules and their purpose.
5. **Section 7 (`Milestone Completion Log`):** Append a dated row summarizing what was built and how it was verified.
6. **Section 8 (`Known Issues, Gotchas & Environment Notes`):** Record any OS quirks, version pins, or workarounds encountered.

If a milestone is only partially complete at the end of a turn, mark it `[~]` (In Progress) in `docs/memory.md` and explicitly log what remains so another AI assistant can resume seamlessly.

## 5. Strict MUST DO Checklist

You **MUST** follow all of these rules throughout the entire lifecycle of Project Bash:

* **One Minor Milestone at a Time:** Scope every implementation turn strictly to the active minor milestone in `docs/phases.md` (e.g., `0.1`, `1.2`, `2.3`).
* **Respect Verification Gates:** After finishing a milestone's code, provide exact commands or manual verification steps to test it. At the end of a phase, verify **every checkbox** in `docs/phases.md`'s Ending Conditions before advancing.
* **Run the Learning Checkpoint:** At the end of each phase, prompt the user with that phase's Learning Checkpoint question (or briefly verify their understanding) before starting the next phase.
* **Preserve End-to-End Type Safety:** Put all shared WebSocket message unions, IPC channel signatures, and DTOs in `packages/shared`. Use TypeScript `strict: true` everywhere.
* **Enforce Electron Security Defaults:** Keep `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and expose only narrow, typed methods via `preload.ts` (`contextBridge`).
* **Keep Secrets Strictly Server-Side:** Store Deepgram, Gemini, Groq, JWT secrets, and MongoDB URIs exclusively in `apps/server` environment variables validated with `zod`.
* **Optimize for Latency & Memory:** Respect the end-to-end $< 2.5\text{ s}$ latency budget and keep audio DSP off the main UI thread (`AudioWorklet`), DB writes batched asynchronously, and Electron Renderer memory tightly bounded.
* **Clean Teardown & Error Handling:** Always clean up `MediaStream` tracks, WebSocket listeners, `AbortController` streams, and timers on pause, disconnect, or shutdown.
* **Write Focused Tests for Core Logic:** Unit-test critical non-UI logic (especially the CAS fixed-window rate limiter, sliding context ring buffer, question-trigger heuristics, and PCM interleaving math).

## 6. Strict MUST NOT DO Checklist (Hard Guardrails)

You **MUST NEVER** violate these rules:

* **MUST NOT skip ahead across multiple phases or milestones** in a single response, even if it seems faster.
* **MUST NOT install a package silently** without explaining its role, alternatives, and behind-the-scenes internals first (Section 3).
* **MUST NOT make unexamined architectural changes** that contradict `docs/architecture.md` or `docs/bash_prd.md` (e.g., switching stereo multichannel audio to mono, moving API keys to Electron, or replacing Electron without explicit user approval).
* **MUST NOT enable `nodeIntegration: true` or disable `contextIsolation`** in Electron `BrowserWindow` to "quickly fix" an IPC issue.
* **MUST NOT hardcode API keys, tokens, or credentials** in source files, client bundles, or git-tracked configs.
* **MUST NOT claim a milestone is verified/complete** if typechecks, builds, or tests were not actually run or confirmed by the user.
* **MUST NOT dump massive monolithic files** without explaining the architecture of the code you wrote and how pieces connect.
* **MUST NOT use `any` in TypeScript** to bypass compiler errors—define proper types, discriminated unions, or `unknown` with runtime guards (`zod`).
* **MUST NOT block the real-time audio/WS hot path** with synchronous disk I/O, synchronous MongoDB writes, or heavy main-thread DSP.
* **MUST NOT forget to update `docs/memory.md`** after completing a milestone.

## 7. Standard Milestone Execution Loop (SOP)

Follow this exact 6-step loop for every minor milestone:

1. **Align:** Confirm the active minor milestone from `docs/memory.md` and `docs/phases.md`, and state the concrete files to be created or modified.
2. **Justify & Explain (Pre-Code):**
   * Present **Decision Justifications** (Section 2) for any design or library choice.
   * Present **Package / Mechanism Deep-Dives** (Section 3) for every new package or platform API introduced in this milestone.
3. **Implement Incrementally:** Write clean, modular, strictly typed code adhering to `docs/architecture.md`.
4. **Verify:** Give clear, runnable test/verification commands (e.g., `typecheck`, unit tests, OBS screen-share check, `.wav` loopback check) and wait for or confirm passing results.
5. **Sync Memory Automatically:** Update `docs/memory.md` (Section 4) with completed milestone status, file inventory, and chronological log.
6. **Gate & Hand-Off:** If this was the final minor milestone of a phase, walk through the **Phase Ending Conditions** and **Learning Checkpoint** before proposing the next phase.

## 8. Cross-Assistant Portability Note

To ensure seamless enforcement across different AI tools, this file (`docs/rules.md`) serves as the canonical instruction set. If using tool-specific auto-loading files in this repository, mirror or reference `docs/rules.md` directly from:
* `AGENTS.md` (OpenAI Codex / universal agents)
* `CLAUDE.md` (Claude Code)
* `.cursor/rules/bash-docs/rules.mdc` or `.cursorrules` (Cursor)
* `.github/copilot-instructions.md` (GitHub Copilot)