import { z } from 'zod';
import { SpeakerRoleSchema } from './ws-protocol.js';

/**
 * Domain Data Transfer Objects (DTOs)
 * Shared between Electron Client, Node.js Gateway, and MongoDB Data Layer.
 */

/* ============================================================================
 * TRANSCRIPT UTTERANCE
 * ============================================================================ */

export const TranscriptUtteranceSchema = z.object({
  speaker: SpeakerRoleSchema,
  text: z.string().min(1),
  timestamp: z.number().int().positive(),
  isFinal: z.boolean().default(true),
});
export type TranscriptUtterance = z.infer<typeof TranscriptUtteranceSchema>;

/* ============================================================================
 * HINT DTO
 * ============================================================================ */

export const HintDTOSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  triggerType: z.enum(['auto', 'manual']),
  promptContextSnapshot: z.string().optional(),
  responseMarkdown: z.string(),
  modelUsed: z.string().default('gemini-2.5-flash'),
  latencyMs: z.number().int().nonnegative(),
  createdAt: z.number().int().positive(),
});
export type HintDTO = z.infer<typeof HintDTOSchema>;

/* ============================================================================
 * PROFILE DTO
 * ============================================================================ */

export const ProfileDTOSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().min(1, 'Profile name is required'),
  resumeSummary: z.string().default(''),
  jobDescription: z.string().default(''),
  customSystemPrompt: z.string().default(''),
  updatedAt: z.number().int().positive().optional(),
});
export type ProfileDTO = z.infer<typeof ProfileDTOSchema>;

/* ============================================================================
 * USER SETTINGS DTO
 * ============================================================================ */

export const UserSettingsSchema = z.object({
  ephemeralMode: z.boolean().default(false),
  autoTrigger: z.boolean().default(true),
  overlayOpacity: z.number().min(0.2).max(1.0).default(0.85),
  hotkeys: z.record(z.string(), z.string()).default({
    manualTrigger: 'Ctrl+Shift+Space',
    toggleVisibility: 'Ctrl+Shift+H',
    toggleInteractive: 'Ctrl+Shift+I',
    clearContext: 'Ctrl+Shift+X',
  }),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

/* ============================================================================
 * SESSION DTO
 * ============================================================================ */

export const SessionStatsSchema = z.object({
  durationSec: z.number().int().nonnegative().default(0),
  totalHintsGenerated: z.number().int().nonnegative().default(0),
  avgLatencyMs: z.number().nonnegative().default(0),
});
export type SessionStats = z.infer<typeof SessionStatsSchema>;

export const SessionDTOSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  profileId: z.string().min(1),
  title: z.string().min(1),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive().optional(),
  stats: SessionStatsSchema.default({ durationSec: 0, totalHintsGenerated: 0, avgLatencyMs: 0 }),
});
export type SessionDTO = z.infer<typeof SessionDTOSchema>;
