import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Resolve .env whether running from monorepo root or apps/server directory
const serverEnvPath = path.resolve(process.cwd(), 'apps/server/.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  // Fall back to default dotenv search
  dotenv.config();
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .default('mongodb://localhost:27017/bash'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  DEEPGRAM_API_KEY: z.string().min(1, 'DEEPGRAM_API_KEY is required for live audio transcription'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for hint generation'),
  GROQ_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type ServerEnv = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, unknown> = process.env): ServerEnv {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.format();
    const errorDetails: string[] = [];

    for (const [key, val] of Object.entries(formattedErrors)) {
      if (key === '_errors') continue;
      const fieldError = val as { _errors?: string[] };
      if (fieldError._errors && fieldError._errors.length > 0) {
        errorDetails.push(`  - [${key}]: ${fieldError._errors.join(', ')}`);
      }
    }

    const message = [
      '================================================================================',
      '[BASH SERVER ERROR] Invalid or Missing Environment Configuration:',
      ...errorDetails,
      '================================================================================',
      'Please check your apps/server/.env file against apps/server/.env.example',
    ].join('\n');

    console.error(message);
    throw new Error(message);
  }

  return result.data;
}

// Auto-parsed singleton for application use
export const env = parseEnv();
