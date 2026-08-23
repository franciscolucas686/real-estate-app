import { Lock } from 'lucide-react';
import { Field, Input, Select } from '@/features/properties/components/form/form-controls';
import type { FormState, Setter } from '@/features/properties/components/form/form-state';
import { onlyDigits } from '@/shared/digits';
import { PropertyType, BusinessType, SaleType } from '@/shared/api/types';
import { PropertyTypeLabel, BusinessTypeLabel, SaleTypeLabel } from '@/shared/format';
import { formatPhone, formatPrice } from '@/shared/format';
import { cn } from '@/shared/cn';

export function Step1({
  form,
  set,
  onSubmit,
}: {
  form: FormState;
  set: Setter;
  onSubmit: () => void;
}) {
  const typeOptions = Object.values(PropertyType).map((v) => ({
    label: PropertyTypeLabel[v],
    value: v,
  }));

  return (
    <>
      {/* Mobile keeps the closed dropdown; desktop exposes the options as chips instead
          (no more hiding a required field behind a click), toggled by CSS alone so the
          two breakpoints don't fork into separate component trees. */}
      <Field label="Tipo de imóvel *" className="md:hidden">
        <Select
          value={form.type}
          onChange={(v) => set('type', v)}
          options={typeOptions}
          placeholder="Selecione..."
        />
      </Field>

      <Field asGroup label="Tipo de imóvel *" className="hidden md:flex">
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => {
            const selected = form.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('type', opt.value)}
                className={cn(
                  'min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors',
                  selected
                    ? 'border-action bg-action/10 text-action'
                    : 'border-border bg-surface-raised text-foreground',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field asGroup label="Tipo de negócio *">
        <div className="grid grid-cols-2 gap-2 md:max-w-xs">
          {[BusinessType.SALE, BusinessType.RENT].map((bt) => (
            <button
              key={bt}
              type="button"
              onClick={() => set('businessType', bt)}
              className={cn(
                'h-12 rounded-xl border text-sm font-medium transition-colors',
                form.businessType === bt
                  ? 'border-action bg-action/10 text-action'
                  : 'border-border bg-surface-raised text-foreground',
              )}
            >
              {BusinessTypeLabel[bt]}
            </button>
          ))}
        </div>
      </Field>

      {form.businessType === BusinessType.SALE && (
        <Field asGroup label="Modalidade de venda *">
          <div className="flex flex-wrap gap-2">
            {Object.values(SaleType).map((st) => {
              const sel = form.saleTypes.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    set(
                      'saleTypes',
                      sel ? form.saleTypes.filter((s) => s !== st) : [...form.saleTypes, st],
                    )
                  }
                  className={cn(
                    'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                    sel
                      ? 'border-action bg-action/10 text-action'
                      : 'border-border bg-surface-raised text-foreground',
                  )}
                >
                  {SaleTypeLabel[st]}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {form.businessType !== BusinessType.RENT && (
        <Field label="Preço *" className="md:max-w-xs">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: R$ 450.000"
            value={formatPrice(form.price)}
            onChange={(v) => set('price', onlyDigits(v))}
          />
        </Field>
      )}

      {form.businessType === BusinessType.RENT && (
        <Field label="Valor do aluguel *" className="md:max-w-xs">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: R$ 2.500"
            value={formatPrice(form.rentPrice)}
            onChange={(v) => set('rentPrice', onlyDigits(v))}
          />
        </Field>
      )}

      <Field label="Condomínio — opcional" className="md:max-w-xs">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Ex: R$ 800"
          value={formatPrice(form.condoFee)}
          onChange={(v) => set('condoFee', onlyDigits(v))}
        />
      </Field>

      {/* Proprietário.
          Fica na etapa 1 e não na 2 (localização) nem na 3 (características) porque não é
          nem uma coisa nem outra: é a moldura comercial do anúncio — o que se vende, por
          quanto, e por conta de quem —, que é o que esta etapa já reúne. E é a etapa mais
          curta, então dois campos obrigatórios a mais custam menos aqui do que na lista de
          specs condicionais da etapa 3.

          O aviso de privacidade é parte do campo, não decoração: sem ele o operador não tem
          como saber que este telefone não vai para a vitrine — e a diferença entre este
          número e o da imobiliária é justamente essa. */}
      <div className="flex flex-col gap-4 border-t border-border pt-5">
        <div className="flex items-start gap-2">
          <Lock size={14} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Proprietário</span>
            <span className="text-xs text-muted-foreground">
              Visível apenas para a equipe — não aparece para visitantes do site.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-4">
          <Field label="Nome do proprietário *">
            <Input
              placeholder="Ex: Maria Silva"
              value={form.ownerName}
              onChange={(v) => set('ownerName', v)}
            />
          </Field>

          {/* Mesmo par que `pages/settings.tsx` usa no WhatsApp da imobiliária: exibe
              formatado, guarda só dígitos. É o formato que o backend exige e o que
              `buildOwnerWhatsAppUrl` espera. */}
          <Field label="WhatsApp do proprietário *">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Ex: (15) 99999-9999"
              value={formatPhone(form.ownerPhone)}
              onChange={(v) => set('ownerPhone', onlyDigits(v).slice(0, 11))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              enterKeyHint="go"
            />
          </Field>
        </div>
      </div>

      <span className="text-xs text-muted-foreground">
        * Campos marcados com asterisco são obrigatórios.
      </span>
    </>
  );
}

// ─── Location picker map ─────────────────────────────────────────────────────
