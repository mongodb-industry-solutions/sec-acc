import { describe, expect, it } from 'vitest';
import type { ModuleDefinition } from '../../../../backend/src/shared/models/module.model';
import { ApiApp } from '../../../../backend/src/shared/services/api-app.service';
import { ServerConfig } from '../../../../backend/src/shared/services/config.service';

const probe = { check: async () => undefined };
const failing = { check: async () => { throw new Error('db down'); } };

const module = (register: ModuleDefinition['register']): ModuleDefinition => ({ name: 'pap', register });

describe('ApiApp', () => {
  it('serves health and readiness under /api/v1', async () => {
    const app = await new ApiApp([], probe).build();
    expect((await app.inject('/api/v1/health')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/api/v1/ready')).json()).toEqual({ status: 'ready' });
    await app.close();
  });

  it('fails readiness closed without leaking the cause', async () => {
    const app = await new ApiApp([], failing).build();
    const res = await app.inject('/api/v1/ready');
    expect(res.statusCode).toBe(503);
    expect(res.body).not.toContain('db down');
    await app.close();
  });

  it('includes every route in the generated OpenAPI document', async () => {
    const app = await new ApiApp([], probe).build();
    const paths = Object.keys((app.swagger() as { paths: Record<string, unknown> }).paths);
    expect(paths).toEqual(expect.arrayContaining(['/api/v1/health', '/api/v1/ready', '/api/v1/openapi']));
    await app.close();
  });

  it('registers module routes on the same app and spec', async () => {
    const pap = module(async (app) => {
      app.get('/api/v1/policy', { schema: { response: { 200: { type: 'object' } } } }, async () => ({}));
    });
    const app = await new ApiApp([pap], probe).build();
    expect(Object.keys((app.swagger() as { paths: Record<string, unknown> }).paths)).toContain('/api/v1/policy');
    await app.close();
  });

  it('refuses a route outside /api/v1 or without a response schema', async () => {
    const outside = module(async (app) => { app.get('/health', { schema: { response: { 200: { type: 'object' } } } }, async () => ({})); });
    await expect(new ApiApp([outside], probe).build()).rejects.toThrow(/outside \/api\/v1/);
    const bare = module(async (app) => { app.get('/api/v1/x', async () => ({})); });
    await expect(new ApiApp([bare], probe).build()).rejects.toThrow(/response schema/);
  });
});

describe('ServerConfig', () => {
  it('defaults to loopback and port 3001, and rejects a bad PORT', () => {
    const config = ServerConfig.fromEnv({});
    expect([config.host, config.port]).toEqual(['127.0.0.1', 3001]);
    expect(() => ServerConfig.fromEnv({ PORT: 'x' })).toThrow(/PORT/);
  });
});
