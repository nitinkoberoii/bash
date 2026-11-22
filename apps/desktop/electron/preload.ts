import { contextBridge, ipcRenderer } from 'electron';
import { PROJECT_NAME, APP_METADATA, IPC_CHANNELS } from '@bash/shared';

const bashAPI = {
  projectName: PROJECT_NAME,
  version: APP_METADATA.version,
  platform: APP_METADATA.targetPlatform,
  ipcChannels: IPC_CHANNELS,
  setClickThrough: (ignore: boolean): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_CLICK_THROUGH, ignore),
  ping: (): string => 'pong',
};

contextBridge.exposeInMainWorld('bashAPI', bashAPI);

export type BashAPI = typeof bashAPI;
