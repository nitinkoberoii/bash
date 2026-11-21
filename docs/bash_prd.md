# Product Requirements Document (PRD)

**Project Name:** Bash
**Document Version:** 2.1 (Node/Electron Stealth Architecture)
**Product Type:** Stealth Native Desktop Application (Electron/Node.js)
**One-liner:** A real-time, low-latency AI interview copilot that provides discreet, actionable hints as an invisible desktop overlay, bypassing screen share captures and Task Manager scrutiny.

## 1. Problem Statement

Technical and behavioral interviews are high-pressure environments. Candidates often blank on specific terms or struggle to structure their thoughts. Existing solutions either require bulky desktop software that is visible on screen shares, introduce severe latency, or trigger suspicion during proctored or heavily monitored interviews.

## 2. Solution

**Bash** is a lightweight, stealthy native desktop application built with Electron. It captures the system's output audio (the interviewer) and the microphone (the candidate) natively. It transcribes the conversation in real-time and uses a high-speed LLM to generate concise hints. Crucially, Bash renders these hints on a transparent, always-on-top desktop overlay that is programmatically hidden from all screen recording and screen sharing software.

## 3. Target Audience

* Software Engineers facing technical and system design interviews.
* Candidates dealing with strictly monitored or screen-shared technical assessments.
* Job seekers wanting real-time structural guidance without detection.

## 4. Core Features (MVP)

### 4.1. Native Dual Audio Capture

* **System Audio Loopback:** Capture the interviewer's voice directly from the operating system using Electron's `desktopCapturer` or a custom Node Native Addon (C++) interacting with WASAPI.
* **Microphone Capture:** Native microphone stream capture via the Web Audio API or Node audio modules.
* **Local Mixing:** Mixing of both audio streams locally to minimize backend data transfer.

### 4.2. Stealth & Evasion Mechanisms

* **Screen Share Invisibility:** Utilize Electron's `win.setContentProtection(true)` which invokes the `SetWindowDisplayAffinity` Windows API to ensure the UI is completely invisible to Zoom, Teams, Google Meet, and OBS.
* **Process Masquerading:** Name the compiled executable (`.exe`) and Electron background processes to mimic standard OS background utilities (e.g., `RuntimeBroker.exe`, `svchost.exe`) to blend into the Task Manager list.

### 4.3. Real-Time Processing Pipeline

* **Streaming Transcription:** Convert the mixed audio stream into text with sub-second latency.
* **Sliding Context Window:** Maintain a rolling buffer of the last 3-5 minutes of conversation.
* **Smart Triggering:** LLM generation is triggered by NLP heuristics (detecting a question) or a hidden, global keyboard shortcut (e.g., `Ctrl+Shift+Space`), avoiding constant API polling.

### 4.4. Unobtrusive User Interface (UI)

* **Transparent Overlay:** A borderless, transparent, always-on-top BrowserWindow in Electron.
* **Low-Glare Design:** Dark mode styling with neutral tones that blend into dark terminal or IDE backgrounds.
* **Scan-Optimized Text:** AI output restricted to 2-3 short bullet points, easily readable in a quick glance.

## 5. Technical Architecture

### 5.1. Client-Side (Native Application)

* **Core Framework:** Electron (Node.js backend, Chromium frontend).
* **Frontend:** React with TypeScript and Tailwind CSS (for rendering the UI overlay).
* **Native Hooks (Node.js):** `ffi-napi` (Foreign Function Interface) or Node Native Addons (C++) for any deep OS-level calls that Electron's core API doesn't cover.

### 5.2. Backend & Infrastructure

* **Server:** Node.js with Express (can be hosted remotely or bundled locally within the Electron main process to reduce latency).
* **Real-time Transport:** WebSockets for duplex communication.
* **Rate Limiting:** Custom fixed-window algorithm using Compare-And-Swap (CAS) to manage LLM API costs.
* **Database:** MongoDB for persistent storage of users and transcripts.

### 5.3. Third-Party Integrations

* **Speech-to-Text (STT):** Deepgram (Streaming WebSocket API) for ultra-low latency transcription.
* **Large Language Model (LLM):** Gemini 1.5 Flash or Groq.

## 6. Non-Functional Requirements (NFRs)

* **Latency:** The total round trip time (Speech -> Text -> LLM -> UI) must not exceed 2-3 seconds.
* **Resource Optimization:** Because Electron relies on V8 and Chromium, strict memory management is required to prevent the app from lagging the user's system while they are coding or sharing their screen.
* **OS Dependency:** The MVP will be strictly **Windows-only** to ensure `setContentProtection` and audio loopbacks function flawlessly for evasion.

## 7. Future Scope (Post-MVP)

* **Advanced Evasion:** Custom C++ Node Addons to manipulate process memory and further obscure the Electron footprint from aggressive anti-cheat software.
* **Mac Support:** Implementing macOS-specific screen capture exclusions.
* **OCR Integration:** Taking stealth screenshots of the user's screen using `desktopCapturer` and feeding it to the LLM for multimodal context.