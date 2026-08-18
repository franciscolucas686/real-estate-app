import { z } from 'zod';

// Estes campos são consumidos como dado estruturado, não como texto livre, e é por isso que
// há validação de formato aqui e não só no backend:
// - `whatsapp` alimenta um link wa.me (buildWhatsAppUrl em shared/format.ts), na mesma forma
//   de-só-dígitos que o backend exige em CreateWhatsappNumberDto.number.
// - `email` alimenta um mailto: em pages/contact.tsx.
// - `instagram` alimenta buildInstagramUrl, e por isso guarda o handle puro — o `@Matches`
//   de UpdateSiteSettingsDto no backend recusa `@` e URL exatamente igual.
//
// Nenhum destes transforma: quem normaliza é o campo, antes de escrever no formulário
// (`onlyDigits` / `normalizeInstagramHandle` no onChange). Assim os tipos de entrada e saída
// do schema continuam idênticos, que é o que o resolver do react-hook-form espera.
//
// Todos aceitam string vazia, que é o valor de "não configurado" — sem isso não haveria como
// limpar um campo depois de preenchido.
const phoneDigits = z
  .string()
  .refine((v) => v === '' || /^\d{8,15}$/.test(v), 'Telefone deve ter entre 8 e 15 dígitos.');

const instagramHandle = z
  .string()
  .refine(
    (v) => v === '' || (/^[A-Za-z0-9._]{1,30}$/.test(v) && !v.startsWith('.') && !v.endsWith('.')),
    'Use apenas letras, números, ponto e underline (até 30 caracteres).',
  );

export const siteSettingsSchema = z.object({
  whatsapp: phoneDigits,
  email: z.union([z.literal(''), z.string().email('E-mail inválido.')]),
  instagram: instagramHandle,
  hours: z.string(),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

// Mirrors CreateWhatsappNumberDto (src/whatsapp/dto/create-whatsapp-number.dto.ts):
// @Matches(/^\d{8,15}$/) number.
export const whatsappNumberSchema = z.object({
  number: z.string().regex(/^\d{8,15}$/, 'Número deve ter entre 8 e 15 dígitos.'),
});

export type WhatsappNumberFormValues = z.infer<typeof whatsappNumberSchema>;
