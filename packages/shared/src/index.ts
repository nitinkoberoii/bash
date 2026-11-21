/**
 * @bash/shared
 * Shared contracts, types, and constants across Electron desktop and Node.js server.
 */

export const PROJECT_NAME = 'Project Bash';
export const PROTOCOL_VERSION = '2.1';

export interface AppMetadata {
  name: string;
  version: string;
  targetPlatform: 'win32';
}

export const APP_METADATA: AppMetadata = {
  name: PROJECT_NAME,
  version: PROTOCOL_VERSION,
  targetPlatform: 'win32',
};
