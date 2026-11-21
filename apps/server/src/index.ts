/**
 * @bash/server entry point placeholder (Milestone 0.1)
 */
import { APP_METADATA, PROJECT_NAME } from '@bash/shared';

export function getServerStatus(): string {
  return `[Server] ${PROJECT_NAME} v${APP_METADATA.version} active`;
}

console.log(getServerStatus());
