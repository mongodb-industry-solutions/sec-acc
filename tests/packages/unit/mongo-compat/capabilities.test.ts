import { describe, expect, it } from 'vitest';
import { capabilitiesOf, declaredDeployment } from '../../../../packages/mongo-compat/src';

describe('capabilitiesOf', () => {
  it('denies automatic encryption and Atlas Search on Community Edition', () => {
    const caps = capabilitiesOf(declaredDeployment('ce', '9.0.0'));
    expect(caps.automaticEncryption).toBe(false);
    expect(caps.atlasSearch).toBe(false);
    expect(caps.changeStreams).toBe(false);
  });

  it('declares Atlas as a replica set with QE GA query types on 9.0', () => {
    const caps = capabilitiesOf(declaredDeployment('atlas', '9.0.0'));
    expect(caps.transactions).toBe(true);
    expect(caps.qeTextSearchProfile.substring).toBe('substring');
  });
});
