import { formatArea } from '@/shared/format';
import type { PropertyDetailDto } from '@/shared/api/types';

/**
 * The at-a-glance line: area, bedrooms, bathrooms, parking, dot-separated.
 *
 * Built as a list of present values so the separators land between items rather than
 * after every one — the previous version was an IIFE inside JSX doing the same thing with
 * `flatMap`, which is why it needed a comment to be readable.
 */
export function QuickSpecs({ property }: { property: PropertyDetailDto }) {
  const items: string[] = [];

  if (property.totalArea) items.push(formatArea(property.totalArea));
  if (property.bedrooms != null) {
    items.push(`${property.bedrooms} ${property.bedrooms === 1 ? 'quarto' : 'quartos'}`);
  }
  if (property.bathrooms != null) {
    items.push(`${property.bathrooms} ${property.bathrooms === 1 ? 'banheiro' : 'banheiros'}`);
  }
  if (property.parkingSpaces != null) {
    items.push(`${property.parkingSpaces} ${property.parkingSpaces === 1 ? 'vaga' : 'vagas'}`);
  }

  if (items.length === 0) return null;

  return (
    <>
      {items.map((item, index) => (
        <span key={item} className="flex items-center gap-3">
          {index > 0 && (
            <span className="text-foreground-subtle" aria-hidden="true">
              •
            </span>
          )}
          {item}
        </span>
      ))}
    </>
  );
}
