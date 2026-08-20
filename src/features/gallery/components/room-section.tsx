import { Check, Pencil, Settings2, Trash2, X } from 'lucide-react';
import { ActionTile } from '@/features/gallery/components/action-tile';
import { GalleryImage } from '@/features/gallery/components/gallery-image';
import type { GallerySection } from '@/features/gallery/gallery-section';
import { capitalizeFirstLetter } from '@/shared/format';

/**
 * Which photo tiles a room's grid shows, by index. CSS only — every photo is still rendered
 * exactly once, and there is no viewport check in JS anywhere in this file.
 *
 * Both widths close with the single "Gerenciar fotos" tile, but they don't give a room the same
 * amount of room. Desktop is 5 columns and gets one row, four photos and the tile:
 *   [Foto][Foto][Foto][Foto][Gerenciar]
 * Mobile is 3 columns and gets two, so one more photo fits:
 *   [Foto][Foto][Foto] / [Foto][Foto][Gerenciar]
 *
 * Everything past that is `hidden` at both widths. It is not lost: "Gerenciar fotos" opens the
 * room in `RoomFullscreen`, which renders the whole set. The count beside the room's name is
 * what tells you there is more.
 */
function photoTileVisibility(index: number): string | undefined {
  if (index < 4) return undefined; // visible at every width
  if (index === 4) return 'md:hidden'; // the extra one mobile's second row has space for
  return 'hidden'; // never — reachable through "Gerenciar fotos"
}

// ─── RoomSection Component ───────────────────────────────────────────────────
// One ambiente, stacked with the others at every width, and read-only: its photos are plain
// tiles, never controls. The only thing that differs between mobile and desktop is how many
// tiles past the first three are visible, and that is a data-driven class, not a fork.
interface RoomSectionProps {
  section: GallerySection;
  onManagePhotos: (roomId: string | null) => void;
  editingRoomId: string | null;
  newRoomName: string;
  renameError: string;
  onStartEdit: (roomId: string, name: string) => void;
  onNewRoomNameChange: (value: string) => void;
  onCancelEdit: () => void;
  onRenameRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string, name: string) => void;
}

export function RoomSection({
  section,
  onManagePhotos,
  editingRoomId,
  newRoomName,
  renameError,
  onStartEdit,
  onNewRoomNameChange,
  onCancelEdit,
  onRenameRoom,
  onDeleteRoom,
}: RoomSectionProps) {
  const total = section.images.length;
  const isEditing = section.roomId !== null && editingRoomId === section.roomId;

  return (
    <section className="flex flex-col gap-3">
      {isEditing ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newRoomName}
              onChange={(e) => onNewRoomNameChange(capitalizeFirstLetter(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameRoom(section.roomId!);
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-base text-foreground outline-none focus:border-action"
            />
            <button
              type="button"
              onClick={() => onRenameRoom(section.roomId!)}
              aria-label="Confirmar novo nome do ambiente"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-action text-white"
            >
              <Check size={24} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancelar renomeação do ambiente"
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-border text-foreground"
            >
              <X size={24} />
            </button>
          </div>
          {renameError && <p className="text-xs font-medium text-danger">{renameError}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {/* `min-w-0` instead of `flex-1`: the heading sizes to its own text so the count sits
              against it, and can still shrink below content width for `truncate` to bite. */}
          <h2 className="min-w-0 truncate text-lg font-semibold text-foreground">{section.name}</h2>
          {/* Now load-bearing: with the grid capped at four photos on a desktop and five on a
              phone, this count is the only thing that says a room holds more than you can see. */}
          <span className="shrink-0 text-xs text-foreground-subtle">({total})</span>
          {section.roomId && (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onStartEdit(section.roomId!, section.name)}
                aria-label="Renomear ambiente"
                className="flex size-14 items-center justify-center rounded-full text-foreground-subtle transition-colors md:hover:bg-border"
              >
                <Pencil size={24} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteRoom(section.roomId!, section.name)}
                aria-label="Excluir ambiente"
                className="flex size-14 items-center justify-center rounded-full text-foreground-subtle transition-colors md:hover:bg-border"
              >
                <Trash2 size={24} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
        {section.images.map((img, index) => (
          <GalleryImage
            key={img.id}
            image={img}
            position={index + 1}
            className={photoTileVisibility(index)}
          />
        ))}

        {/* The section's only control, and the one door into everything you can do to a
            photo — uploading included, since `RoomFullscreen` carries its own upload tile.
            After the photos in DOM order with no `col-start`: the grid's own flow lands it in the
            last slot of a full room and shifts it left in a sparse one, so an ambiente with no
            photos at all still shows it without a single special case. */}
        <ActionTile
          icon={<Settings2 size={24} aria-hidden="true" />}
          label="Gerenciar fotos"
          // Suffixed per room: a page with five sections otherwise offers five buttons with
          // one identical name, which tells a screen-reader user nothing about which ambiente
          // they are about to open.
          ariaLabel={`Gerenciar fotos — ${section.name}`}
          onClick={() => onManagePhotos(section.roomId)}
        />
      </div>
    </section>
  );
}
