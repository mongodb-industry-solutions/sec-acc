import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { MongoConfigReader, createMongoSession } from '../src/shared/services/mongo.service';
import type { DocumentRecord, MongoSession } from '../src/shared/models/mongo.model';
import { META_COLLECTION, SCHEMA_DOC_ID, type SchemaVersionDoc } from '../src/shared/models/schema.model';
import { loadRootEnv } from '../src/shared/services/env.service';

interface SeedFile {
  collection: string;
  /** Minimum schema version setup.ts must have reached. */
  requiresSchema: number;
  documents: DocumentRecord[];
}

/** Loads minimal, non-secret baselines from data/seed. Upserts by _id, so reruns change nothing. */
class SeedLoader {
  constructor(
    private readonly session: MongoSession,
    private readonly dir: string,
  ) {}

  async run(): Promise<void> {
    const schema = await this.session.collection<SchemaVersionDoc>(META_COLLECTION).findOne({ _id: SCHEMA_DOC_ID });
    const files = readdirSync(this.dir).filter((name) => name.endsWith('.json')).sort();
    for (const name of files) {
      const seed = JSON.parse(readFileSync(join(this.dir, name), 'utf8')) as SeedFile;
      if ((schema?.version ?? 0) < seed.requiresSchema) {
        throw new Error(`${name} needs schema version ${seed.requiresSchema}. Run setup first.`);
      }
      const store = this.session.collection(seed.collection);
      for (const doc of seed.documents) await store.upsertOne({ _id: doc._id }, doc);
      console.log(`seeded ${seed.documents.length} document(s) into ${seed.collection} from ${name}`);
    }
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const session = createMongoSession(MongoConfigReader.read(process.env));
  await session.connect();
  try {
    await new SeedLoader(session, join(__dirname, '..', 'data', 'seed')).run();
  } finally {
    await session.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'seed failed');
  process.exit(1);
});
