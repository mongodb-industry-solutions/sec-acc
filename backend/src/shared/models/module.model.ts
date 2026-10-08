import type { FastifyInstance } from 'fastify';

export const MODULES = ['pap', 'pep', 'pip', 'prp', 'pdp', 'mgf', 'audit'] as const;
export type ModuleName = (typeof MODULES)[number];

/** In-process code boundary, not a deployable unit (docs/decisions/0001). */
export interface ModuleDefinition {
  readonly name: ModuleName;
  /** Registers the module's controllers on the single backend app. */
  register(app: FastifyInstance): Promise<void>;
}

/** Readiness depends on the backend's own dependencies only. */
export interface ReadinessProbe {
  check(): Promise<void>;
}
