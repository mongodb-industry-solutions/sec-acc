import { MongoClient, type Collection } from 'mongodb';
import {
  capabilitiesOf, declaredDeployment, detectDeployment,
  type MongoCapabilities, type MongoDeployment, type MongoDeploymentType,
} from '@ist-sec/mongo-compat';
import type {
  CollectionOptions, DocumentFilter, DocumentRecord, DocumentStore, IndexSpec, MongoConfig, MongoSession, SchemaAdmin,
} from '../models/mongo.model';

type Env = Record<string, string | undefined>;

const TYPES: readonly MongoDeploymentType[] = ['atlas', 'ea', 'ce'];
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/;
const URI = /^mongodb(\+srv)?:\/\/\S+$/;

/** Lists every invalid variable by name. Never includes a value, because the URI is a secret. */
export class MongoConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid MongoDB configuration:\n- ${problems.join('\n- ')}`);
  }
}

/** Fails closed with an actionable message instead of degrading a guarantee silently. */
export class CapabilityError extends Error {}

/**
 * Strict on purpose: mongo-compat's parseDeploymentType falls back to atlas, but ACC rejects an
 * unknown MONGODB_TYPE instead of assuming a product.
 */
export class MongoConfigReader {
  static read(env: Env): MongoConfig {
    const problems: string[] = [];
    const type = env.MONGODB_TYPE?.trim();
    const version = env.MONGODB_VERSION?.trim();
    const uri = env.MONGODB_URI?.trim();

    if (!type || !(TYPES as readonly string[]).includes(type)) {
      problems.push(`MONGODB_TYPE must be one of ${TYPES.join('|')}`);
    }
    if (!version || !VERSION.test(version)) {
      problems.push('MONGODB_VERSION must be a version such as 9.0.0');
    }
    if (!uri || !URI.test(uri)) {
      problems.push('MONGODB_URI is required and must start with mongodb:// or mongodb+srv://');
    }
    if (problems.length > 0) throw new MongoConfigError(problems);

    return {
      type: type as MongoDeploymentType,
      version: version as string,
      uri: uri as string,
      database: env.MONGODB_DB?.trim() || 'acc',
    };
  }
}

/** Throws unless the deployment supports `id`. Product/version rules come from mongo-compat only. */
export function requireCapability(session: MongoSession, id: keyof MongoCapabilities): void {
  if (session.capabilities[id] !== true) {
    throw new CapabilityError(
      `Capability "${id}" is not available on ${session.deployment.type} ${session.deployment.version.raw}. `
        + 'See docs/mongodb/compatibility.md.',
    );
  }
}

class DriverStore<T extends DocumentRecord> implements DocumentStore<T> {
  constructor(private readonly col: Collection<DocumentRecord>) {}

  async insertOne(doc: T): Promise<void> {
    await this.col.insertOne(doc as DocumentRecord);
  }

  async findOne(filter: DocumentFilter): Promise<T | null> {
    return (await this.col.findOne(filter as never)) as T | null;
  }

  async find(filter: DocumentFilter, options: { limit?: number } = {}): Promise<T[]> {
    return (await this.col.find(filter as never, { limit: options.limit }).toArray()) as unknown as T[];
  }

  async upsertOne(filter: DocumentFilter, doc: T): Promise<void> {
    await this.col.replaceOne(filter as never, doc as DocumentRecord, { upsert: true });
  }
}

/**
 * The only place the `mongodb` driver is imported. Deployment and capabilities are resolved by
 * mongo-compat: declared from the environment, then replaced by the probe on connect().
 */
class DriverSession implements MongoSession {
  readonly schema: SchemaAdmin;
  private readonly client: MongoClient;
  private current: MongoDeployment;

  constructor(private readonly config: MongoConfig) {
    this.current = declaredDeployment(config.type, config.version);
    this.client = new MongoClient(config.uri, { appName: 'acc', serverSelectionTimeoutMS: 5000 });
    this.schema = {
      ensureCollection: (name, options) => this.ensureCollection(name, options),
      ensureIndex: (collection, spec) => this.ensureIndex(collection, spec),
    };
  }

  get deployment(): MongoDeployment {
    return this.current;
  }

  get capabilities(): MongoCapabilities {
    return capabilitiesOf(this.current);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.current = await detectDeployment(this.client, this.current);
  }

  async ping(): Promise<void> {
    await this.client.db(this.config.database).command({ ping: 1 });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  collection<T extends DocumentRecord = DocumentRecord>(name: string): DocumentStore<T> {
    return new DriverStore<T>(this.client.db(this.config.database).collection<DocumentRecord>(name));
  }

  private async ensureCollection(name: string, options: CollectionOptions = {}): Promise<void> {
    const db = this.client.db(this.config.database);
    const exists = (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0;
    if (!exists) {
      await db.createCollection(name, options.validator ? { validator: options.validator } : {});
    } else if (options.validator) {
      await db.command({ collMod: name, validator: options.validator });
    }
  }

  private async ensureIndex(collection: string, spec: IndexSpec): Promise<void> {
    await this.client.db(this.config.database).collection(collection).createIndex(
      { ...spec.keys },
      { name: spec.name, unique: spec.unique, expireAfterSeconds: spec.expireAfterSeconds },
    );
  }
}

export function createMongoSession(config: MongoConfig): MongoSession {
  return new DriverSession(config);
}
