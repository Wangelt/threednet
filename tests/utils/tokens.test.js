const {
  hashToken,
  createOpaqueToken,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../../src/utils/tokens');

const FAKE_USER = { _id: '507f1f77bcf86cd799439011', role: 'customer' };

describe('hashToken', () => {
  test('returns a 64-character hex string', () => {
    expect(hashToken('sometoken')).toMatch(/^[a-f0-9]{64}$/);
  });

  test('is deterministic — same input always produces same output', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  test('different inputs produce different hashes', () => {
    expect(hashToken('token1')).not.toBe(hashToken('token2'));
  });
});

describe('createOpaqueToken', () => {
  test('returns a 64-character hex string', () => {
    expect(createOpaqueToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  test('each call returns a unique value', () => {
    expect(createOpaqueToken()).not.toBe(createOpaqueToken());
  });
});

describe('access token', () => {
  test('round-trips: sign then verify returns correct sub and role', () => {
    const token = signAccessToken(FAKE_USER);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(FAKE_USER._id.toString());
    expect(payload.role).toBe(FAKE_USER.role);
  });

  test('throws when the token is tampered', () => {
    const token = signAccessToken(FAKE_USER);
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });

  test('throws when a refresh token is passed to verifyAccessToken', () => {
    const refresh = signRefreshToken(FAKE_USER);
    expect(() => verifyAccessToken(refresh)).toThrow();
  });
});

describe('refresh token', () => {
  test('round-trips: sign then verify returns correct sub and type', () => {
    const token = signRefreshToken(FAKE_USER);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(FAKE_USER._id.toString());
    expect(payload.type).toBe('refresh');
  });

  test('throws when the token is tampered', () => {
    const token = signRefreshToken(FAKE_USER);
    expect(() => verifyRefreshToken(token + 'x')).toThrow();
  });

  test('throws when an access token is passed to verifyRefreshToken', () => {
    const access = signAccessToken(FAKE_USER);
    expect(() => verifyRefreshToken(access)).toThrow();
  });
});
