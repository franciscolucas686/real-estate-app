import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Images } from 'lucide-react';
import type { PropertyCardDto } from '../../types/api';
import { BusinessType } from '../../types/api';
import {
  formatMainPrice,
  PropertyTypeLabel,
  BusinessTypeLabel,
  isPending,
} from '../../utils/format';

interface PropertyAdminCardProps {
  property: PropertyCardDto;
  onDelete: (id: string) => void;
  className?: string;
}

export function PropertyAdminCard({ property, onDelete, className }: PropertyAdminCardProps) {
  const navigate = useNavigate();
  const pending = isPending(property);
  const firstImage = property.previewImages[0];

  return (
    <article
      data-slot="property-admin-card"
      className={twMerge(
        'overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm',
        className,
      )}
    >
      {/* Thumbnail */}
      <div
        className="relative h-36 cursor-pointer"
        onClick={() => navigate(`/properties/${property.id}`)}
      >
        {firstImage ? (
          <img
            src={firstImage.url}
            alt={PropertyTypeLabel[property.type]}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-border">
            <span className="text-xs text-muted-foreground">Sem fotos</span>
          </div>
        )}

        {/* Pending badge */}
        {pending && (
          <span className="absolute right-2 top-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-white">
            Pendente
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-medium text-muted-foreground">
            Cód: {property.code}
          </span>
          <span
            className={twMerge(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
              property.businessType === BusinessType.SALE ? 'bg-action' : 'bg-accent',
            )}
          >
            {BusinessTypeLabel[property.businessType]}
          </span>
        </div>

        <span className="text-sm font-medium text-foreground line-clamp-1">
          {PropertyTypeLabel[property.type]} · {property.neighborhood}
        </span>

        <span className="text-base font-bold text-foreground">
          {formatMainPrice(property.businessType, property.price, property.rentPrice)}
        </span>

        {/* Actions */}
        <div className="mt-1 flex gap-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => navigate(`/properties/${property.id}/edit`)}
            aria-label="Editar imóvel"
            className="flex size-9 items-center justify-center rounded-full bg-surface text-foreground-subtle transition-colors active:bg-border"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/properties/${property.id}/gallery`)}
            aria-label="Gerenciar galeria"
            className="flex size-9 items-center justify-center rounded-full bg-surface text-foreground-subtle transition-colors active:bg-border"
          >
            <Images size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(property.id)}
            aria-label="Excluir imóvel"
            className="flex size-9 items-center justify-center rounded-full bg-surface text-danger transition-colors active:bg-danger/10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
