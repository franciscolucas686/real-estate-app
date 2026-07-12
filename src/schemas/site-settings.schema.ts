import { z } from 'zod';

// api-real-estate's UpdateSiteSettingsDto only validates these as @IsString()
// (no format checks). We add real format validation here because these fields
// are actually consumed as structured data in the app, not just free text:
// - `whatsapp`/`phone` feed wa.me links (buildWhatsAppUrl in utils/format.ts),
//   same digit-only shape backend enforces for CreateWhatsappNumberDto.number.
// - `email` feeds a mailto: link in pages/contact.tsx.
// Callers are expected to already strip non-digits on input (see formatPhone
// / formatPhoneAdaptive in utils/format.ts, used the same way today) — this
// only validates the resulting digit string, it doesn't transform it, so the
// schema's input/output types stay identical for react-hook-form's resolver.
const phoneDigits = z
  .string()
  .refine((v) => v === '' || /^\d{8,15}$/.test(v), 'Telefone deve ter entre 8 e 15 dígitos.');

export const siteSettingsSchema = z.object({
  whatsapp: phoneDigits,
  email: z.union([z.literal(''), z.string().email('E-mail inválido.')]),
  phone: phoneDigits,
  hours: z.string(),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

// Mirrors CreateWhatsappNumberDto (src/whatsapp/dto/create-whatsapp-number.dto.ts):
// @Matches(/^\d{8,15}$/) number, optional label.
export const whatsappNumberSchema = z.object({
  number: z.string().regex(/^\d{8,15}$/, 'Número deve ter entre 8 e 15 dígitos.'),
  label: z.string(),
});

export type WhatsappNumberFormValues = z.infer<typeof whatsappNumberSchema>;
