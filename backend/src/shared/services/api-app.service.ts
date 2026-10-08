import Fastify, { type FastifyInstance, type RouteOptions } from 'fastify';
import swagger from '@fastify/swagger';
import { DocsController } from '../controllers/docs.controller';
import { HealthController } from '../controllers/health.controller';
import type { ModuleDefinition, ReadinessProbe } from '../models/module.model';

export const API_PREFIX = '/api/v1';

/**
 * Contract guard: a route that is not under /api/v1, has no schema, or is hidden from the
 * OpenAPI document cannot be registered. This is what makes "every endpoint is in the spec" true.
 */
export function assertRouteContract(route: RouteOptions): void {
  const where = `${String(route.method)} ${route.url}`;
  if (!route.url.startsWith(`${API_PREFIX}/`)) throw new Error(`Route outside ${API_PREFIX}: ${where}`);
  const schema = route.schema as { response?: unknown; hide?: boolean } | undefined;
  if (!schema?.response) throw new Error(`Route without response schema: ${where}`);
  if (schema.hide) throw new Error(`Route hidden from OpenAPI: ${where}`);
}

/** Builds the single backend app: shared plumbing plus every in-process module. */
export class ApiApp {
  constructor(
    private readonly modules: readonly ModuleDefinition[],
    private readonly readiness: ReadinessProbe,
  ) {}

  async build(): Promise<FastifyInstance> {
    const app = Fastify({
      logger: { redact: ['req.headers.authorization', 'req.headers.cookie'] },
    });
    app.addHook('onRoute', assertRouteContract);

    await app.register(swagger, {
      openapi: { info: { title: 'ACC API', version: '0.0.0' } },
    });
    await new HealthController(this.readiness).register(app);
    await new DocsController().register(app);
    for (const module of this.modules) await module.register(app);
    await app.ready();
    return app;
  }
}
