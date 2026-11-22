import { z } from 'zod';

/**
 * Speaker Attribution
 * Deterministically tagged via stereo audio channels:
 * - Channel 0 (System Loopback) -> 'interviewer'
 * - Channel 1 (Microphone) -> 'candidate'
 */
export type SpeakerRole = 'interviewer' | 'candidate';
export const SpeakerRoleSchema = z.enum(['interviewer', 'candidate']);

/* ============================================================================
 * CLIENT -> SERVER WEBSOCKET MESSAGES
 * ============================================================================ */

export const SessionStartPayloadSchema = z.object({
  profileId: z.string().min(1, 'profileId cannot be empty'),
  autoTrigger: z.boolean().default(true),
});
export type SessionStartPayload = z.infer<typeof SessionStartPayloadSchema>;

export const TriggerHintPayloadSchema = z.object({
  customInstruction: z.string().optional(),
});
export type TriggerHintPayload = z.infer<typeof TriggerHintPayloadSchema>;

export const ClearContextPayloadSchema = z.object({});
export type ClearContextPayload = z.infer<typeof ClearContextPayloadSchema>;

export const PauseAudioPayloadSchema = z.object({
  paused: z.boolean(),
});
export type PauseAudioPayload = z.infer<typeof PauseAudioPayloadSchema>;

export const SessionEndPayloadSchema = z.object({});
export type SessionEndPayload = z.infer<typeof SessionEndPayloadSchema>;

/**
 * Discriminated union of all Client -> Server JSON frames.
 * Note: Raw audio is transmitted as binary ArrayBuffer frames (Int16 PCM), not JSON.
 */
export type ClientWSMessage =
  | { type: 'SESSION_START'; payload: SessionStartPayload }
  | { type: 'TRIGGER_HINT'; payload: TriggerHintPayload }
  | { type: 'CLEAR_CONTEXT'; payload: ClearContextPayload }
  | { type: 'PAUSE_AUDIO'; payload: PauseAudioPayload }
  | { type: 'SESSION_END'; payload: SessionEndPayload };

export const ClientWSMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SESSION_START'), payload: SessionStartPayloadSchema }),
  z.object({ type: z.literal('TRIGGER_HINT'), payload: TriggerHintPayloadSchema }),
  z.object({ type: z.literal('CLEAR_CONTEXT'), payload: ClearContextPayloadSchema }),
  z.object({ type: z.literal('PAUSE_AUDIO'), payload: PauseAudioPayloadSchema }),
  z.object({ type: z.literal('SESSION_END'), payload: SessionEndPayloadSchema }),
]);

/* ============================================================================
 * SERVER -> CLIENT WEBSOCKET MESSAGES
 * ============================================================================ */

export const SessionReadyPayloadSchema = z.object({
  sessionId: z.string().min(1),
});
export type SessionReadyPayload = z.infer<typeof SessionReadyPayloadSchema>;

export const TranscriptDeltaPayloadSchema = z.object({
  speaker: SpeakerRoleSchema,
  text: z.string(),
  isFinal: z.boolean(),
  timestamp: z.number().int().positive(),
});
export type TranscriptDeltaPayload = z.infer<typeof TranscriptDeltaPayloadSchema>;

export const HintStartPayloadSchema = z.object({
  hintId: z.string().min(1),
  trigger: z.enum(['auto', 'manual']),
});
export type HintStartPayload = z.infer<typeof HintStartPayloadSchema>;

export const HintTokenPayloadSchema = z.object({
  hintId: z.string().min(1),
  delta: z.string(),
});
export type HintTokenPayload = z.infer<typeof HintTokenPayloadSchema>;

export const HintEndPayloadSchema = z.object({
  hintId: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
});
export type HintEndPayload = z.infer<typeof HintEndPayloadSchema>;

export const ErrorCodeSchema = z.enum([
  'RATE_LIMITED',
  'AUTH_FAILED',
  'STT_ERROR',
  'LLM_ERROR',
  'INVALID_MESSAGE',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorPayloadSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  retryAfterMs: z.number().int().positive().optional(),
});
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

/**
 * Discriminated union of all Server -> Client JSON frames.
 */
export type ServerWSMessage =
  | { type: 'SESSION_READY'; payload: SessionReadyPayload }
  | { type: 'TRANSCRIPT_DELTA'; payload: TranscriptDeltaPayload }
  | { type: 'HINT_START'; payload: HintStartPayload }
  | { type: 'HINT_TOKEN'; payload: HintTokenPayload }
  | { type: 'HINT_END'; payload: HintEndPayload }
  | { type: 'ERROR'; payload: ErrorPayload };

export const ServerWSMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SESSION_READY'), payload: SessionReadyPayloadSchema }),
  z.object({ type: z.literal('TRANSCRIPT_DELTA'), payload: TranscriptDeltaPayloadSchema }),
  z.object({ type: z.literal('HINT_START'), payload: HintStartPayloadSchema }),
  z.object({ type: z.literal('HINT_TOKEN'), payload: HintTokenPayloadSchema }),
  z.object({ type: z.literal('HINT_END'), payload: HintEndPayloadSchema }),
  z.object({ type: z.literal('ERROR'), payload: ErrorPayloadSchema }),
]);

/* ============================================================================
 * TYPE GUARDS & UTILITIES
 * ============================================================================ */

export function isClientWSMessage(data: unknown): data is ClientWSMessage {
  return ClientWSMessageSchema.safeParse(data).success;
}

export function isServerWSMessage(data: unknown): data is ServerWSMessage {
  return ServerWSMessageSchema.safeParse(data).success;
}
