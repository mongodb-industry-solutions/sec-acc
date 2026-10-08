import type { DocumentRecord } from './mongo.model';

/** Reference and bookkeeping collection owned by setup.ts. */
export const META_COLLECTION = 'meta';
export const SCHEMA_DOC_ID = 'schema';

/** Written by setup.ts after each applied step. */
export interface SchemaVersionDoc extends DocumentRecord {
  _id: typeof SCHEMA_DOC_ID;
  version: number;
  description: string;
  appliedAt: string;
}
