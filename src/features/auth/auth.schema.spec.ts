import { describe, expect, it } from 'vitest';
import { loginSchema } from '@/features/auth/auth.schema';

describe('loginSchema', () => {
  it('accepts a valid email and a 6+ char password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters (mirrors LoginDto @MinLength(6))', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'password')).toBe(true);
    }
  });

  it('rejects an empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '123456' });
    expect(result.success).toBe(false);
  });
});
