import { capabilityFindings, describeDeployment } from '@ist-sec/mongo-compat';
import { MongoConfigReader, createMongoSession } from '../src/shared/services/mongo.service';
import type { MongoSession, SchemaAdmin } from '../src/shared/models/mongo.model';
import { loadRootEnv } from '../src/shared/services/env.service';
import { META_COLLECTION, SCHEMA_DOC_ID, type SchemaVersionDoc } from '../src/shared/models/schema.model';

interface SchemaStep {
  readonly version: number;
  readonly description: string;
  apply(admin: SchemaAdmin): Promise<void>;
}

/**
 * The sole authoritative, versioned definition of database structure. Append only: never edit an
 * applied step, add the next version. Collections, validators and indexes arrive with the module
 * that has a verified access pattern for them (see docs/mongodb/data-model.md).
 */
const STEPS: readonly SchemaStep[] = [
  {
    version: 1,
    description: 'meta collection: schema version and reference data',
    apply: (admin) => admin.ensureCollection(META_COLLECTION),
  },
];

class SchemaRunner {
  constructor(private readonly session: MongoSession) {}

  async run(): Promise<void> {
    const meta = this.session.collection<SchemaVersionDoc>(META_COLLECTION);
    const current = (await meta.findOne({ _id: SCHEMA_DOC_ID }))?.version ?? 0;
    const pending = STEPS.filter((step) => step.version > current);
    if (pending.length === 0) {
      console.log(`schema already at version ${current}`);
      return;
    }
    // Not safe for concurrent runs. Run setup from one place (deployment job), never at server start.
    for (const step of pending) {
      await step.apply(this.session.schema);
      await meta.upsertOne({ _id: SCHEMA_DOC_ID }, {
        _id: SCHEMA_DOC_ID,
        version: step.version,
        description: step.description,
        appliedAt: new Date().toISOString(),
      });
      console.log(`applied schema step ${step.version}: ${step.description}`);
    }
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const session = createMongoSession(MongoConfigReader.read(process.env));
  await session.connect();
  console.log(`target ${describeDeployment(session.deployment)}`);
  for (const finding of capabilityFindings(session.deployment)) console[finding.warn ? 'warn' : 'log'](finding.text);
  try {
    await new SchemaRunner(session).run();
  } finally {
    await session.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'setup failed');
  process.exit(1);
});
