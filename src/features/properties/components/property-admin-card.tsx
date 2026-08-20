import { useState } from 'react';
import { cn } from '@/shared/cn';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Images, MoreVertical, PowerOff, Power, Trash2 } from 'lucide-react';
import type { PropertyCardDto } from '@/shared/api/types';
import { BusinessType, PropertyStatus } from '@/shared/api/types';
import { formatMainPrice, PropertyTypeLabel, BusinessTypeLabel } from '@/shared/format';
import { imageUrl } from '@/shared/image-url';
import { StatusBadge } from '@/features/properties/components/status-badge';
import { Modal } from '@/ui/modal';
import { ConfirmModalContent } from '@/ui/confirm-modal';

/**
 * The card's three action buttons — edit, gallery, more — are one control in three
 * instances, so the class string is written once. It used to be repeated verbatim three
 * times, which is how the odd one out drifts.
 *
 * The hover fills with `action` and flips the icon to white, matching the two other
 * circular icon buttons in the app (`pages/property-form.tsx`, `pages/gallery-management.tsx`).
 * It used to go to `bg-border` from a `bg-gray-200` base — `#e2e8f0` against `#e5e7eb`, three
 * units per channel, so the state existed and was invisible.
 *
 * `active:` has to move with it. With the base now on the `border` token, `active:bg-border`
 * would be a no-op; it deepens to `action-hover` instead, which is also what keeps a press
 * from flashing grey through the middle of a blue hover.
 *
 * The `md:active:` repeat is not redundant. Tailwind emits the `md:` block after the
 * unprefixed one, so from `md` up a bare `active:` loses to `md:hover:` and a press on a
 * pointer would sit at the hover colour instead of deepening — verified in the built CSS,
 * not assumed. Below `md` the unprefixed `active:` is the whole tap feedback.
 */
const ACTION_BUTTON =
  'flex size-10 items-center justify-center rounded-full bg-border text-foreground-subtle transition-colors active:bg-action-hover active:text-primary-foreground md:hover:bg-action md:hover:text-primary-foreground md:active:bg-action-hover';

/**
 * The rows inside "Mais opções", same reasoning as above: one control, three instances, one
 * string. The colour is composed on top because the destructive row must stay red — a
 * delete that turns blue on hover loses the one signal separating it from the other two.
 *
 * The hover tints the row at 10% of its own colour instead of only recolouring the label.
 * A 56px full-width row whose text merely changes tone doesn't say "this is what you're
 * about to trigger" — the surface under the cursor has to answer. The mechanism is the one
 * the "Cancelar" button uses inside this very modal (`ui/confirm-modal.tsx`), and the same
 * tint-plus-matching-text pairing the selected filter chips use.
 *
 * `px-3 -mx-3` cancel each other, so the text does not shift on hover — only the painted
 * area widens, keeping the tint off the icon. `group` is what lets the icon travel with the
 * label: the two power icons carry a fixed `text-muted-foreground` and would otherwise stay
 * grey behind a recoloured label. `Trash2` needs none of that, inheriting `text-danger`.
 */
const MORE_ACTION_ROW =
  'group flex h-14 items-center gap-3 rounded-xl px-3 -mx-3 text-sm transition-colors';

interface PropertyAdminCardProps {
  property: PropertyCardDto;
  onDelete: (id: string, code: string) => void;
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
  // This card only ever renders on the dashboard, so the current querystring *is* the
  // dashboard's own filter/search state (e.g. `?status=PENDING`) — carried along so the
  // property form/gallery's "Voltar" can return to the same filtered view instead of
  // resetting to the unfiltered dashboard.
  const location = useLocation();
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
          className={cn(
            MORE_ACTION_ROW,
            'text-foreground md:hover:bg-action/10 md:hover:text-action',
          )}
        >
          <PowerOff size={20} className="text-muted-foreground md:group-hover:text-action" />
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
          className={cn(
            MORE_ACTION_ROW,
            'text-foreground md:hover:bg-action/10 md:hover:text-action',
          )}
        >
          <Power size={20} className="text-muted-foreground md:group-hover:text-action" />
          Ativar imóvel
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className={cn(
          MORE_ACTION_ROW,
          'text-danger md:hover:bg-danger/10 md:hover:text-danger-hover',
        )}
      >
        <Trash2 size={20} />
        Excluir imóvel
      </button>
    </div>
  ) : (
    <ConfirmModalContent
      message="Tem certeza que deseja excluir este imóvel?"
      onConfirm={() => {
        onDelete(property.id, property.code);
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
          // `@container` so the info row can lay itself out from the *card's* width. The card is
          // 2-up on a phone, 3-up from `md` and 4-up from `xl`, so a media query here would be
          // encoding the dashboard grid's arithmetic inside the card.
          '@container overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm transition-[box-shadow,border-color,opacity] md:hover:border-foreground-subtle/30 md:hover:shadow-md',
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
                src={imageUrl(firstImage.url, 'thumb')}
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
            <div className="flex items-start justify-between gap-2">
              {/*
                "Cód:" and the number are two elements, not one sentence. As a sentence the break
                was a side effect of how far flex managed to shrink the span, which depends on the
                badge's label ("Aluguel" is ~11px wider than "Venda") and on the code's length —
                4 to 7 characters in real data. So one card broke and the one beside it didn't.
                As two elements the decision comes from the card's width, which the grid makes
                identical for every card, so they all break at the same moment.

                The threshold is the worst case on a single line: "Cód:" 4ch + gap 4px + a 7-char
                code ≈ 83px, plus gap-2 and the "Aluguel" badge ≈ 55px, plus the card's `p-3` —
                about 170px of card. `rem` rather than `px` on purpose: at a larger root font the
                text needs more width and the threshold grows with it.
              */}
              <span className="flex min-w-0 flex-col font-mono text-xs font-medium text-muted-foreground @min-[11rem]:flex-row @min-[11rem]:gap-1">
                <span>Cód:</span>
                <span className="truncate">{property.code}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold text-white',
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
              onClick={() =>
                navigate(`/properties/${property.id}/edit`, {
                  state: { from: 'dashboard', dashboardSearch: location.search },
                })
              }
              aria-label="Editar imóvel"
              className={ACTION_BUTTON}
            >
              <Pencil size={20} />
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/properties/${property.id}/gallery`, {
                  state: { from: 'dashboard', dashboardSearch: location.search },
                })
              }
              aria-label="Gerenciar galeria"
              className={ACTION_BUTTON}
            >
              <Images size={20} />
            </button>
            <button
              type="button"
              onClick={openMore}
              aria-label="Mais opções"
              className={ACTION_BUTTON}
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
