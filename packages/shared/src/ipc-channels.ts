/**
 * Electron IPC Channel Constants & Type Contracts
 * Enforces end-to-end type safety between Main process and Renderer (via preload contextBridge).
 */

export const IPC_CHANNELS = {
  // Global Hotkey Notifications (Main -> Renderer)
  HOTKEY_TRIGGER: 'bash:hotkey:trigger',
  HOTKEY_TOGGLE_VISIBILITY: 'bash:hotkey:toggle-visibility',
  HOTKEY_TOGGLE_INTERACTIVE: 'bash:hotkey:toggle-interactive',
  HOTKEY_CLEAR_CONTEXT: 'bash:hotkey:clear-context',

  // Window & Mouse Control (Renderer -> Main)
  SET_CLICK_THROUGH: 'bash:window:set-click-through',
  SET_OPACITY: 'bash:window:set-opacity',

  // Audio Device Discovery (Renderer <-> Main)
  GET_AUDIO_SOURCES: 'bash:audio:get-sources',

  // Secure OS Token Storage (Renderer <-> Main via safeStorage)
  SAVE_AUTH_TOKEN: 'bash:auth:save-token',
  GET_AUTH_TOKEN: 'bash:auth:get-token',
  CLEAR_AUTH_TOKEN: 'bash:auth:clear-token',

  // System Tray & Lifecycle (Renderer -> Main)
  APP_QUIT: 'bash:app:quit',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/**
 * Audio Source Descriptor returned by desktopCapturer in Electron Main
 */
export interface AudioSourceDescriptor {
  id: string;
  name: string;
  kind: 'screen' | 'window' | 'loopback';
}

/**
 * Hotkey Action identifiers emitted from Electron Main to Renderer
 */
export type HotkeyAction =
  'manual-trigger' | 'toggle-visibility' | 'toggle-interactive' | 'clear-context';

/**
 * Type-safe signature contracts for Electron IPC invocations (Renderer -> Main)
 */
export interface IPCInvokeContract {
  [IPC_CHANNELS.SET_CLICK_THROUGH]: (ignore: boolean) => Promise<boolean>;
  [IPC_CHANNELS.SET_OPACITY]: (opacity: number) => Promise<boolean>;
  [IPC_CHANNELS.GET_AUDIO_SOURCES]: () => Promise<AudioSourceDescriptor[]>;
  [IPC_CHANNELS.SAVE_AUTH_TOKEN]: (token: string) => Promise<boolean>;
  [IPC_CHANNELS.GET_AUTH_TOKEN]: () => Promise<string | null>;
  [IPC_CHANNELS.CLEAR_AUTH_TOKEN]: () => Promise<boolean>;
  [IPC_CHANNELS.APP_QUIT]: () => Promise<void>;
}

/**
 * Type-safe contract for listeners (Main -> Renderer events)
 */
export interface IPCListenerContract {
  [IPC_CHANNELS.HOTKEY_TRIGGER]: () => void;
  [IPC_CHANNELS.HOTKEY_TOGGLE_VISIBILITY]: () => void;
  [IPC_CHANNELS.HOTKEY_TOGGLE_INTERACTIVE]: (interactive: boolean) => void;
  [IPC_CHANNELS.HOTKEY_CLEAR_CONTEXT]: () => void;
}
