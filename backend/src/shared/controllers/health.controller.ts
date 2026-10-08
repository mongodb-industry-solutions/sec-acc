import type { FastifyInstance } from 'fastify';
import type { ReadinessProbe } from '../models/module.model';

const status = (value: string) => ({
  type: 'object',
  required: ['status'],
  properties: { status: { type: 'string', enum: [value] } },
});

/**
 * Technical endpoints, outside the UI parity matrix. Unauthenticated by design and they expose
 * no data: they return only a status word.
 */
export class HealthController {
  constructor(private readonly readiness: ReadinessProbe) {}

  async register(app: FastifyInstance): Promise<void> {
    app.get('/api/v1/health', {
      schema: { tags: ['ops'], summary: 'Liveness', response: { 200: status('ok') } },
    }, async () => ({ status: 'ok' }));

    app.get('/api/v1/ready', {
      schema: {
        tags: ['ops'],
        summary: 'Readiness',
        response: { 200: status('ready'), 503: status('unavailable') },
      },
    }, async (_request, reply) => {
      try {
        await this.readiness.check();
        return { status: 'ready' };
      } catch (error) {
        // Detail goes to the log only, never to the caller.
        app.log.warn({ err: error }, 'readiness check failed');
        return reply.code(503).send({ status: 'unavailable' });
      }
    });
  }
}
