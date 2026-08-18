import { describe, expect, it } from 'vitest';
import { siteSettingsSchema, whatsappNumberSchema } from '@/features/settings/site-settings.schema';

describe('siteSettingsSchema', () => {
  it('accepts all-empty optional fields', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '',
      email: '',
      instagram: '',
      hours: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a fully filled valid payload', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '11999990000',
      email: 'contato@imobiliaria.com',
      instagram: 'francine.gestora_1',
      hours: 'Seg-Sex: 9h às 18h',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email format (stricter than backend UpdateSiteSettingsDto on purpose, see schema comment)', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '',
      email: 'not-an-email',
      instagram: '',
      hours: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a whatsapp number outside the 8-15 digit range', () => {
    const result = siteSettingsSchema.safeParse({
      whatsapp: '123',
      email: '',
      instagram: '',
      hours: '',
    });
    expect(result.success).toBe(false);
  });

  /*
   * O campo guarda o handle puro, e o schema é a segunda metade dessa regra — a primeira é o
   * `normalizeInstagramHandle` no onChange do campo, que tira `@` e URL antes de escrever no
   * formulário. Estes casos existem para o dia em que alguém trocar o input por um `register`
   * simples e a normalização sumir sem nada reclamar.
   */
  const instagram = (value: string) =>
    siteSettingsSchema.safeParse({ whatsapp: '', email: '', instagram: value, hours: '' }).success;

  it('aceita um handle com ponto e underline', () => {
    expect(instagram('francine.gestora_1')).toBe(true);
  });

  it('recusa o "@" — o armazenamento é sem prefixo', () => {
    expect(instagram('@francinegestora')).toBe(false);
  });

  it('recusa uma URL completa — quem monta o link é buildInstagramUrl', () => {
    expect(instagram('https://instagram.com/francinegestora')).toBe(false);
  });

  it('recusa espaço e acentuação', () => {
    expect(instagram('francine gestora')).toBe(false);
    expect(instagram('imobiliária')).toBe(false);
  });

  it('recusa acima de 30 caracteres', () => {
    expect(instagram('a'.repeat(30))).toBe(true);
    expect(instagram('a'.repeat(31))).toBe(false);
  });

  it('recusa ponto no início ou no fim, que o Instagram também não aceita', () => {
    expect(instagram('.francine')).toBe(false);
    expect(instagram('francine.')).toBe(false);
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
