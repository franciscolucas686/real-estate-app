/**
 * Tudo que não é dígito, removido.
 *
 * O mesmo `/\D/g` estava escrito à mão em doze lugares — os três helpers de telefone em
 * `format.ts`, os três campos de dinheiro do wizard, seis em `settings.tsx` — e
 * `ui/numeric-input.tsx` precisa dele também.
 *
 * Mora num módulo próprio, e não em `shared/format.ts`, porque aquele arquivo importa
 * `@/shared/api/types`: `ui/` é proibido de alcançar `@/shared/api/*`, e a zona do lint
 * casa apenas com o especificador do import, então a aresta transitiva
 * `ui/ → shared/format → shared/api/types` passaria despercebida.
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
