import { MongoConfigReader, createMongoSession } from '../src/shared/services/mongo.service';
import type { ModuleDefinition } from '../src/shared/models/module.model';
import { loadRootEnv } from '../src/shared/services/env.service';
import { ServerConfig } from '../src/shared/services/config.service';
import { ApiApp } from '../src/shared/services/api-app.service';

/**
 * The one place that registers the in-process modules. Empty until a module has a verified
 * requirement and a REST contract (docs/development/roadmap.md).
 */
const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [];

/** Canonical entry point. Never mutates the database (setup.ts and seed.ts own that). */
async function main(): Promise<void> {
  loadRootEnv();
  const config = ServerConfig.fromEnv(process.env);
  const mongo = createMongoSession(MongoConfigReader.read(process.env));

  const app = await new ApiApp(MODULE_DEFINITIONS, { check: () => mongo.ping() }).build();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await mongo.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  // Config errors name variables, never values.
  console.error(error instanceof Error ? error.message : 'startup failed');
  process.exit(1);
});
