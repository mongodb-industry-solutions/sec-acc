import type { FastifyInstance } from 'fastify';

/** Serves the generated OpenAPI document of this service. Technical endpoint, no data. */
export class DocsController {
  async register(app: FastifyInstance): Promise<void> {
    app.get('/api/v1/openapi', {
      schema: {
        tags: ['ops'],
        summary: 'OpenAPI document of this service',
        response: { 200: { type: 'object', additionalProperties: true } },
      },
    }, async () => app.swagger());
  }
}
