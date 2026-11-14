import { consume } from '../lib/rateLimiter';

describe('Unit Test: rateLimiter', () => {
  it('allows initial requests under the capacity limit', () => {
    const ip = `test-ip-${Date.now()}`;
    const res = consume(ip);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(29);
    expect(res.resetMs).toBeGreaterThan(0);
  });

  it('decrements remaining tokens with successive calls', () => {
    const ip = `test-ip-successive-${Date.now()}`;
    const first = consume(ip);
    const second = consume(ip);
    expect(first.remaining).toBe(29);
    expect(second.remaining).toBe(28);
  });

  it('rejects requests once bucket capacity is exhausted', () => {
    const ip = `test-ip-exhaust-${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      const res = consume(ip);
      expect(res.allowed).toBe(true);
    }
    const blocked = consume(ip);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('handles empty or missing ip gracefully', () => {
    const res = consume('');
    expect(res).toBeDefined();
    expect(typeof res.allowed).toBe('boolean');
  });
});

