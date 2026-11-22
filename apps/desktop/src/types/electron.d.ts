import type { BashAPI } from '../../electron/preload';

declare global {
  interface Window {
    bashAPI: BashAPI;
  }
}
