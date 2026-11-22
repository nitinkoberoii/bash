import { contextBridge, ipcRenderer } from 'electron';
import { PROJECT_NAME, APP_METADATA, IPC_CHANNELS } from '@bash/shared';

const bashAPI = {
  projectName: PROJECT_NAME,
  version: APP_METADATA.version,
  platform: APP_METADATA.targetPlatform,
  ipcChannels: IPC_CHANNELS,

  // Window & Mouse Passthrough Controls
  setClickThrough: (ignore: boolean): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_CLICK_THROUGH, ignore),

  quitApp: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),

  // Global Hotkey Subscriptions
  onInteractiveToggle: (callback: (isInteractive: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isInteractive: boolean) => {
      callback(isInteractive);
    };
    ipcRenderer.on(IPC_CHANNELS.HOTKEY_TOGGLE_INTERACTIVE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HOTKEY_TOGGLE_INTERACTIVE, handler);
    };
  },

  onManualTrigger: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.HOTKEY_TRIGGER, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HOTKEY_TRIGGER, handler);
    };
  },

  onClearContext: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.HOTKEY_CLEAR_CONTEXT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HOTKEY_CLEAR_CONTEXT, handler);
    };
  },

  ping: (): string => 'pong',
};

contextBridge.exposeInMainWorld('bashAPI', bashAPI);

export type BashAPI = typeof bashAPI;
