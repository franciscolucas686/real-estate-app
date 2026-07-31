import { describe, expect, it } from 'vitest';
import { siteSettingsSchema, whatsappNumberSchema } from '@/features/settings/site-settings.schema';

describe('siteSettingsSchema', () => {
  it('accepts all-empty optional fields', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '',
      email: '',
      phone: '',
      hours: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a fully filled valid payload', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '11999990000',
      email: 'contato@imobiliaria.com',
      phone: '1122223333',
      hours: 'Seg-Sex: 9h às 18h',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email format (stricter than backend UpdateSiteSettingsDto on purpose, see schema comment)', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '',
      email: 'not-an-email',
      phone: '',
      hours: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a whatsapp number outside the 8-15 digit range', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '123',
      email: '',
      phone: '',
      hours: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('whatsappNumberSchema (mirrors CreateWhatsappNumberDto)', () => {
  it('accepts an 8-15 digit number', () => {
    expect(whatsappNumberSchema.safeParse({ number: '11999990000' }).success).toBe(true);
  });

  it('rejects a number shorter than 8 digits', () => {
    expect(whatsappNumberSchema.safeParse({ number: '1234567' }).success).toBe(false);
  });

  it('rejects a number longer than 15 digits', () => {
    expect(whatsappNumberSchema.safeParse({ number: '1'.repeat(16) }).success).toBe(false);
  });

  it('rejects non-digit characters (input must already be stripped by the caller)', () => {
    expect(whatsappNumberSchema.safeParse({ number: '(11) 99999-0000' }).success).toBe(false);
  });
});
