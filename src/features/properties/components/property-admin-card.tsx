import { useState } from 'react';
import { cn } from '@/shared/cn';
import { useNavigate } from 'react-router-dom';
import { Pencil, Images, MoreVertical, PowerOff, Power, Trash2 } from 'lucide-react';
import type { PropertyCardDto } from '@/shared/api/types';
import { BusinessType, PropertyStatus } from '@/shared/api/types';
import { formatMainPrice, PropertyTypeLabel, BusinessTypeLabel } from '@/shared/format';
import { StatusBadge } from '@/features/properties/components/status-badge';
import { Modal } from '@/ui/modal';
import { ConfirmModalContent } from '@/ui/confirm-modal';

interface PropertyAdminCardProps {
  property: PropertyCardDto;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  /**
   * True while a write against *this* property is in flight. The parent owns a single
   * mutation for the whole grid and compares its `variables` against each id, so the
   * card only needs the boolean.
   */
  isPending?: boolean;
  className?: string;
}

export function PropertyAdminCard({
  property,
  onDelete,
  onActivate,
  onDeactivate,
  isPending = false,
  className,
}: PropertyAdminCardProps) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstImage = property.previewImages[0];

  function openMore() {
    setConfirmDelete(false);
    setMoreOpen(true);
  }

  function closeMore() {
    setMoreOpen(false);
    setConfirmDelete(false);
  }

  const moreActionsContent = !confirmDelete ? (
    <div className="flex flex-col px-6 pb-4 md:px-0 md:pb-0">
      {property.status !== PropertyStatus.INACTIVE && (
        <button
          type="button"
          onClick={() => {
            onDeactivate(property.id);
            closeMore();
          }}
          className="flex h-14 items-center gap-3 text-sm text-foreground transition-colors md:hover:text-action"
        >
          <PowerOff size={20} className="text-muted-foreground" />
          Desativar imóvel
        </button>
      )}
      {property.status !== PropertyStatus.ACTIVE && property.status !== PropertyStatus.PENDING && (
        <button
          type="button"
          onClick={() => {
            onActivate(property.id);
            closeMore();
          }}
          className="flex h-14 items-center gap-3 text-sm text-foreground transition-colors md:hover:text-action"
        >
          <Power size={20} className="text-muted-foreground" />
          Ativar imóvel
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="flex h-14 items-center gap-3 text-sm text-danger transition-colors md:hover:text-danger-hover"
      >
        <Trash2 size={20} />
        Excluir imóvel
      </button>
    </div>
  ) : (
    <ConfirmModalContent
      message="Tem certeza que deseja excluir este imóvel?"
      onConfirm={() => {
        onDelete(property.id);
        closeMore();
      }}
      onClose={() => setConfirmDelete(false)}
    />
  );

  return (
    <>
      <article
        data-slot="property-admin-card"
        aria-busy={isPending || undefined}
        className={cn(
          'overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm transition-[box-shadow,border-color,opacity] md:hover:border-foreground-subtle/30 md:hover:shadow-md',
          // Dim and lock the card while its own write is in flight, so a second tap
          // can't queue a conflicting status change on the same property.
          isPending && 'pointer-events-none opacity-60',
          className,
        )}
      >
        {/* Clickable area: thumbnail through price */}
        <div className="cursor-pointer" onClick={() => navigate(`/properties/${property.id}`)}>
          {/* Thumbnail */}
          <div className="relative h-36">
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

            <StatusBadge status={property.status} className="absolute left-2 top-2" />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-1 p-3 pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-medium text-muted-foreground">
                Cód: {property.code}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-2xs font-semibold text-white',
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
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 pt-1">
          <div className="mt-1 flex justify-around border-t border-border pt-2">
            <button
              type="button"
              onClick={() => navigate(`/properties/${property.id}/edit`)}
              aria-label="Editar imóvel"
              className="flex size-10 items-center justify-center rounded-full bg-surface text-foreground-subtle transition-colors active:bg-border md:hover:bg-border"
            >
              <Pencil size={20} />
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/properties/${property.id}/gallery`, { state: { from: 'dashboard' } })
              }
              aria-label="Gerenciar galeria"
              className="flex size-10 items-center justify-center rounded-full bg-surface text-foreground-subtle transition-colors active:bg-border md:hover:bg-border"
            >
              <Images size={20} />
            </button>
            <button
              type="button"
              onClick={openMore}
              aria-label="Mais opções"
              className="flex size-10 items-center justify-center rounded-full bg-surface text-foreground-subtle transition-colors active:bg-border md:hover:bg-border"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </article>

      {/* Sheet on mobile, centered dialog on desktop — one element, CSS decides.
          While confirming a delete the surface keeps its accessible name but drops
          the visible heading, so the confirmation copy is the only thing competing
          for attention. */}
      <Modal
        open={moreOpen}
        onClose={closeMore}
        title={confirmDelete ? 'Confirmar exclusão' : 'Mais opções'}
        hideTitle={confirmDelete}
      >
        {moreActionsContent}
      </Modal>
    </>
  );
}
