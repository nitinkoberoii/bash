/**
 * @bash/desktop entry point placeholder
 */
import {
  APP_METADATA,
  PROJECT_NAME,
  IPC_CHANNELS,
  ClientWSMessage,
  ServerWSMessage,
} from '@bash/shared';

export function getClientStatus(): string {
  return `[Desktop] ${PROJECT_NAME} v${APP_METADATA.version} active on ${APP_METADATA.targetPlatform}`;
}

export function createStartMessage(profileId: string): ClientWSMessage {
  return {
    type: 'SESSION_START',
    payload: {
      profileId,
      autoTrigger: true,
    },
  };
}

export function handleServerMessage(msg: ServerWSMessage): void {
  switch (msg.type) {
    case 'SESSION_READY':
      console.log(`[Desktop] Session established: ${msg.payload.sessionId}`);
      break;
    case 'TRANSCRIPT_DELTA':
      console.log(`[Desktop] [${msg.payload.speaker}] ${msg.payload.text}`);
      break;
    case 'HINT_START':
    case 'HINT_TOKEN':
    case 'HINT_END':
      // Streaming hint lifecycle
      break;
    case 'ERROR':
      console.error(`[Desktop] Server error ${msg.payload.code}: ${msg.payload.message}`);
      break;
  }
}

console.log(getClientStatus());
console.log(
  `[Desktop] Registered IPC channels: ${Object.keys(IPC_CHANNELS).length} channels ready`
);
const testStart = createStartMessage('prof_default');
console.log(`[Desktop] Shared contract verification: prepared ${testStart.type} for transmission`);
