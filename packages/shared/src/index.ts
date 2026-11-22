/**
 * @bash/shared
 * Central export hub for shared types, contracts, DTOs, and schemas across Electron client and Node backend.
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

// WebSocket Protocol Contracts & Schemas
export * from './ws-protocol.js';

// Electron IPC Contracts & Channel Constants
export * from './ipc-channels.js';

// Domain Data Transfer Objects (DTOs)
export * from './models.js';
