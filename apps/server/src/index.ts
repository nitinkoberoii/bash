/**
 * @bash/server entry point
 */
import { APP_METADATA, PROJECT_NAME } from '@bash/shared';
import { env } from './config/env.js';

export function getServerStatus(): string {
  return `[Server] ${PROJECT_NAME} v${APP_METADATA.version} active on port ${env.PORT} (${env.NODE_ENV})`;
}

console.log(getServerStatus());
console.log(`[Server] Environment validation passed: MongoDB URI = ${env.MONGODB_URI}`);
