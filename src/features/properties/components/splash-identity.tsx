import { PropertyTypeLabel } from '@/shared/format';
import type { PropertyDetailDto } from '@/shared/api/types';

/**
 * Which property the splash is talking about — type, city, code.
 *
 * Both post-create splashes render it, so it is written once: they are the same statement
 * about the same property at two moments, and two near-identical markup blocks is how the
 * second one drifts. Neither said which property it meant before — after registering three
 * listings in a row, "Imóvel criado!" identified none of them, and the finalize splash
 * carried only the code, buried inside its own title.
 *
 * It sits as a sibling of the title block rather than inside it, so the splash's own
 * `gap-4` separates the two groups: the outcome reads as one thing, the property as
 * another. No new spacing value is introduced for it.
 *
 * The bullet is `aria-hidden` for the reason `QuickSpecs` hides its own — a screen reader
 * announcing "Casa bullet Sorocaba" is reading punctuation as content. The code keeps the
 * `font-mono` treatment it has in the contact rail, so the same value looks the same
 * wherever it appears.
 */
export function SplashIdentity({ property }: { property: PropertyDetailDto }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <p className="text-sm text-muted-foreground">
        {PropertyTypeLabel[property.type]} <span aria-hidden="true">•</span> {property.city}
      </p>
      <p className="font-mono text-sm text-muted-foreground">Cód. {property.code}</p>
    </div>
  );
}
