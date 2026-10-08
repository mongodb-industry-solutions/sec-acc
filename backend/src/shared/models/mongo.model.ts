import type { MongoCapabilities, MongoDeployment, MongoDeploymentType } from '@ist-sec/mongo-compat';

export interface MongoConfig {
  /** Selected only by MONGODB_TYPE, never inferred from the URI. */
  readonly type: MongoDeploymentType;
  readonly version: string;
  /** Secret. Never log or serialize it. */
  readonly uri: string;
  readonly database: string;
}

/** Plain document shape. Driver types never cross this boundary. */
export type DocumentRecord = { _id: string } & Record<string, unknown>;
export type DocumentFilter = Record<string, unknown>;

export interface IndexSpec {
  readonly keys: Readonly<Record<string, 1 | -1>>;
  readonly name?: string;
  readonly unique?: boolean;
  /** Seconds. Makes it a TTL index. */
  readonly expireAfterSeconds?: number;
}

export interface CollectionOptions {
  /** `$jsonSchema` validator, applied on create and re-applied on change. */
  readonly validator?: Readonly<Record<string, unknown>>;
}

export interface DocumentStore<T extends DocumentRecord = DocumentRecord> {
  insertOne(doc: T): Promise<void>;
  findOne(filter: DocumentFilter): Promise<T | null>;
  find(filter: DocumentFilter, options?: { limit?: number }): Promise<T[]>;
  /** Replaces the matching document, or inserts it. Idempotent for seeds. */
  upsertOne(filter: DocumentFilter, doc: T): Promise<void>;
}

/** Schema operations. Only setup.ts may call these. */
export interface SchemaAdmin {
  ensureCollection(name: string, options?: CollectionOptions): Promise<void>;
  ensureIndex(collection: string, spec: IndexSpec): Promise<void>;
}

/** The stable entry point for every database consumer. */
export interface MongoSession {
  readonly schema: SchemaAdmin;
  /** Declared until connect() probes the cluster, then detected (mongo-compat). */
  readonly deployment: MongoDeployment;
  readonly capabilities: MongoCapabilities;
  connect(): Promise<void>;
  ping(): Promise<void>;
  close(): Promise<void>;
  collection<T extends DocumentRecord = DocumentRecord>(name: string): DocumentStore<T>;
}
