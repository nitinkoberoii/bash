/**
 * @bash/desktop entry point placeholder (Milestone 0.1)
 */
import { APP_METADATA, PROJECT_NAME } from '@bash/shared';

export function getClientStatus(): string {
  return `[Desktop] ${PROJECT_NAME} v${APP_METADATA.version} active on ${APP_METADATA.targetPlatform}`;
}

console.log(getClientStatus());
