import { contextBridge } from 'electron';
import { PROJECT_NAME, APP_METADATA, IPC_CHANNELS } from '@bash/shared';

const bashAPI = {
  projectName: PROJECT_NAME,
  version: APP_METADATA.version,
  platform: APP_METADATA.targetPlatform,
  ipcChannels: IPC_CHANNELS,
  ping: (): string => 'pong',
};

contextBridge.exposeInMainWorld('bashAPI', bashAPI);

export type BashAPI = typeof bashAPI;
