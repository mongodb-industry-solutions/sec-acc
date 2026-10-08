import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Loads the optional root `.env`. A missing file is not an error and variables already in the
 * environment win (dotenv never overrides). Paths are relative to this file, never to the cwd, and
 * cover both tsx (backend/src/...) and compiled (backend/dist/src/...) layouts.
 */
export function loadRootEnv(): void {
  config({
    path: ['../../../../.env', '../../../../../.env'].map((p) => resolve(__dirname, p)),
    quiet: true,
  });
}
