import { describe, expect, it } from 'vitest';
import { MongoConfigError, MongoConfigReader } from '../../../../backend/src/shared/services/mongo.service';

const valid = { MONGODB_TYPE: 'ce', MONGODB_VERSION: '9.0.0', MONGODB_URI: 'mongodb://user:secret@host/db' };

describe('MongoConfigReader', () => {
  it('reads a valid configuration and defaults the database name', () => {
    const config = MongoConfigReader.read(valid);
    expect(config).toMatchObject({ type: 'ce', version: '9.0.0', database: 'acc' });
  });

  it.each(['atlas', 'ea', 'ce'])('accepts type %s', (type) => {
    expect(MongoConfigReader.read({ ...valid, MONGODB_TYPE: type }).type).toBe(type);
  });

  it('names every invalid variable and never leaks the URI', () => {
    const attempt = () => MongoConfigReader.read({ MONGODB_TYPE: 'x', MONGODB_URI: 'secret-value' });
    expect(attempt).toThrow(MongoConfigError);
    try {
      attempt();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('MONGODB_TYPE');
      expect(message).toContain('MONGODB_VERSION');
      expect(message).toContain('MONGODB_URI');
      expect(message).not.toContain('secret-value');
    }
  });

  it('does not infer the type from the URI', () => {
    const env = { ...valid, MONGODB_TYPE: '', MONGODB_URI: 'mongodb+srv://u:p@c.mongodb.net/db' };
    expect(() => MongoConfigReader.read(env)).toThrow(/MONGODB_TYPE/);
  });
});
