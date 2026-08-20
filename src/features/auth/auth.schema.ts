import { z } from 'zod';

// Mirrors api-real-estate's LoginDto (src/auth/dto/login.dto.ts):
// @IsEmail() email, @IsString() @MinLength(6) password.
export const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
