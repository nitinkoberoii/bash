/**
 * @bash/server entry point
 */
import {
  APP_METADATA,
  PROJECT_NAME,
  ClientWSMessage,
  ServerWSMessage,
  isClientWSMessage,
} from '@bash/shared';
import { env } from './config/env.js';

export function getServerStatus(): string {
  return `[Server] ${PROJECT_NAME} v${APP_METADATA.version} active on port ${env.PORT} (${env.NODE_ENV})`;
}

/**
 * Handle incoming client WebSocket messages with exhaustive type narrowing
 */
export function handleClientMessage(msg: ClientWSMessage): ServerWSMessage | null {
  switch (msg.type) {
    case 'SESSION_START':
      return {
        type: 'SESSION_READY',
        payload: { sessionId: `sess_${Date.now()}` },
      };
    case 'TRIGGER_HINT':
      return {
        type: 'HINT_START',
        payload: { hintId: `hint_${Date.now()}`, trigger: 'manual' },
      };
    case 'PAUSE_AUDIO':
      return null;
    case 'CLEAR_CONTEXT':
      return null;
    case 'SESSION_END':
      return null;
  }
}

console.log(getServerStatus());
console.log(`[Server] Environment validation passed: MongoDB URI = ${env.MONGODB_URI}`);

// Sanity check type-safe message handler
const mockMsg: unknown = {
  type: 'SESSION_START',
  payload: { profileId: 'prof_test', autoTrigger: true },
};
if (isClientWSMessage(mockMsg)) {
  const reply = handleClientMessage(mockMsg);
  console.log(
    `[Server] Shared contract verification: received ${mockMsg.type} -> replied ${reply?.type}`
  );
}
