import { Field, Input } from '@/features/properties/components/form/form-controls';
import { MapPin } from 'lucide-react';
import { toPlaceCase } from '@/shared/format';
import type { FormState, Setter } from '@/features/properties/components/form/form-state';

export function Step2({
  form,
  set,
  onOpenMap,
  onSubmit,
}: {
  form: FormState;
  set: Setter;
  onOpenMap: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <Field label="Cidade *">
        <Input
          placeholder="Ex: Sorocaba"
          value={form.city}
          onChange={(v) => set('city', toPlaceCase(v))}
        />
      </Field>
      <Field label="Estado *">
        <Input
          placeholder="Ex: SP"
          value={form.state}
          onChange={(v) => set('state', v.toUpperCase())}
          maxLength={2}
        />
      </Field>
      <Field label="Bairro *">
        <Input
          placeholder="Ex: Centro"
          value={form.neighborhood}
          onChange={(v) => set('neighborhood', toPlaceCase(v))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          enterKeyHint="go"
        />
      </Field>

      <button
        type="button"
        onClick={onOpenMap}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised text-sm font-medium text-foreground transition-colors active:bg-border md:col-span-3 md:hover:bg-border/60"
      >
        <MapPin size={18} className="text-action" />
        {form.latitude !== null ? 'Alterar localização no mapa' : 'Selecionar localização no mapa'}
      </button>
    </>
  );
}

// ─── Step 3: Characteristics ──────────────────────────────────────────────────
