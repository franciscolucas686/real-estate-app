import { useState, useRef, useEffect, type Ref } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  Pencil,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  MoveRight,
  DoorOpen,
} from 'lucide-react';
import { useProperty } from '@/features/properties/hooks/use-property';
import { PropertyTypeLabel } from '@/shared/format';
import { useSwipeToSelect } from '@/shared/hooks/use-swipe-to-select';
import { useDisablePullToRefresh } from '@/shared/hooks/use-disable-pull-to-refresh';
import { PageContainer, MAX_WIDTH_CENTER } from '@/layout/page-container';
import { PropertyDetailSkeleton } from '@/features/properties/components/property-skeletons';
import { ConfirmModal } from '@/ui/confirm-modal';
import { Modal } from '@/ui/modal';
import { cn } from '@/shared/cn';
import { useCommitGalleryPatch } from '@/features/gallery/use-commit-gallery-patch';
import {
  buildGalleryPatch,
  type DraftRoom,
  type DraftImage,
} from '@/features/gallery/gallery-draft';
import type { PropertyImageDto } from '@/shared/api/types';
import { galleryRoomSchema, isImageFile } from '@/features/gallery/gallery-room.schema';
import { getErrorMessage } from '@/shared/api/api-error';

type Mode = 'view' | 'photo-select';

/**
 * Sentinel for "show every room's photos", the default selection.
 *
 * It needs its own value because `roomId: null` already means the *unassigned* room — the
 * "Sem ambiente" section — so overloading `null` would make "all" and "unassigned"
 * indistinguishable.
 */
const ALL_ROOMS = '__all__' as const;
type ActiveRoom = string | null | typeof ALL_ROOMS;

interface GallerySection {
  roomId: string | null;
  name: string;
  images: PropertyImageDto[];
}

function toImageDto(img: DraftImage): PropertyImageDto {
  return { id: img.id, url: img.url, label: img.label, order: 0 };
}

export function GalleryManagement() {
  useDisablePullToRefresh();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    from?: string;
    context?: string;
    showSplash?: boolean;
  } | null;
  const fromDashboard = locationState?.from === 'dashboard';
  const fromContext = locationState?.context;
  const showSplash = Boolean(locationState?.showSplash);
  const { data: property, isLoading, isPlaceholderData } = useProperty(id!);

  // State machine
  const [mode, setMode] = useState<Mode>('view');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [renameRoomError, setRenameRoomError] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [addRoomName, setAddRoomName] = useState('');
  const [addRoomError, setAddRoomError] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const commitGallery = useCommitGalleryPatch(id!);
  const confirming = commitGallery.isPending;
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeletePhotosOpen, setConfirmDeletePhotosOpen] = useState(false);

  /**
   * Which room's photos the grid shows, at every viewport.
   *
   * Mobile used to stack every room in sequence while desktop filtered to one — two
   * different mental models for the same task, chosen by width. Unified on filtering, with
   * `ALL_ROOMS` as the default so arriving on a phone still shows every photo, as before.
   */
  const [activeRoomId, setActiveRoomId] = useState<ActiveRoom>(ALL_ROOMS);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Draft gallery state, seeded once from the server on load.
  const [draftRooms, setDraftRooms] = useState<DraftRoom[]>([]);
  const [draftImages, setDraftImages] = useState<DraftImage[]>([]);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const draftImagesRef = useRef<DraftImage[]>([]);
  useEffect(() => {
    draftImagesRef.current = draftImages;
  }, [draftImages]);

  const { containerProps: swipeSelectProps } = useSwipeToSelect({
    enabled: mode === 'photo-select',
    onToggle: togglePhotoSelection,
  });

  useEffect(() => {
    if (property && !isPlaceholderData && !draftInitialized) {
      // One-time hydration of the draft from the server's gallery, guarded
      // by `draftInitialized` so it never re-runs after the first seed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftRooms(
        property.gallery.rooms.map((r) => ({
          id: r.id,
          name: r.name,
          originalName: r.name,
          isNew: false,
          deleted: false,
        })),
      );

      const unassignedImages: DraftImage[] = (property.gallery.unassigned ?? []).map((img) => ({
        id: img.id,
        url: img.url,
        label: img.label,
        roomId: null,
        originalRoomId: null,
        isNew: false,
        deleted: false,
      }));
      const roomImages: DraftImage[] = property.gallery.rooms.flatMap((r) =>
        r.images.map((img) => ({
          id: img.id,
          url: img.url,
          label: img.label,
          roomId: r.id,
          originalRoomId: r.id,
          isNew: false,
          deleted: false,
        })),
      );
      setDraftImages([...unassignedImages, ...roomImages]);
      setDraftInitialized(true);
    }
  }, [property, isPlaceholderData, draftInitialized]);

  // Revoke object URLs created for new-image previews on unmount.
  useEffect(() => {
    return () => {
      draftImagesRef.current.forEach((img) => {
        if (img.isNew) URL.revokeObjectURL(img.url);
      });
    };
  }, []);

  if (isLoading || isPlaceholderData) return <PropertyDetailSkeleton />;

  if (!property) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 md:min-h-full">
        <p className="text-foreground-subtle">Imóvel não encontrado.</p>
      </div>
    );
  }

  const sections: GallerySection[] = [
    {
      roomId: null,
      name: 'Sem ambiente',
      images: draftImages.filter((img) => !img.deleted && img.roomId === null).map(toImageDto),
    },
    ...draftRooms
      .filter((r) => !r.deleted)
      .map((r) => ({
        roomId: r.id,
        name: r.name,
        images: draftImages.filter((img) => !img.deleted && img.roomId === r.id).map(toImageDto),
      })),
  ];

  const totalImages = sections.reduce((sum, s) => sum + s.images.length, 0);

  // "Todos" concatenates every section in order; otherwise the selected room only.
  const visibleImages =
    activeRoomId === ALL_ROOMS
      ? sections.flatMap((section) => section.images)
      : (sections.find((section) => section.roomId === activeRoomId) ?? sections[0]).images;

  /**
   * Where an upload lands. With "Todos" active there is no selected room, so photos go to
   * the unassigned bucket — the same destination mobile's "Sem ambiente" section used.
   */
  const uploadTargetRoomId = activeRoomId === ALL_ROOMS ? null : activeRoomId;

  // Selection handlers
  function togglePhotoSelection(imageId: string) {
    setSelectedPhotoIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId],
    );
  }

  function exitSelectMode() {
    setMode('view');
    setSelectedPhotoIds([]);
  }

  function handleDeleteSelected() {
    if (selectedPhotoIds.length === 0) return;
    const idsToRemove = new Set(selectedPhotoIds);
    setDraftImages((prev) =>
      prev
        .filter((img) => {
          if (idsToRemove.has(img.id) && img.isNew) {
            URL.revokeObjectURL(img.url);
            return false;
          }
          return true;
        })
        .map((img) => (idsToRemove.has(img.id) && !img.isNew ? { ...img, deleted: true } : img)),
    );
    exitSelectMode();
  }

  function handleMoveToRoom(targetRoomId: string | null) {
    if (selectedPhotoIds.length === 0) return;
    const idsToMove = new Set(selectedPhotoIds);
    setDraftImages((prev) =>
      prev.map((img) => (idsToMove.has(img.id) ? { ...img, roomId: targetRoomId } : img)),
    );
    setShowMoveDialog(false);
    exitSelectMode();
  }

  function handleUpload(roomId: string | null, files: FileList | null) {
    if (!files || files.length === 0) return;
    // accept="image/*" already scopes the native picker; this only guards
    // against drag-and-drop or a picker that lets non-images through.
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;
    const newImages: DraftImage[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      label: null,
      roomId,
      originalRoomId: roomId,
      isNew: true,
      deleted: false,
      file,
    }));
    setDraftImages((prev) => [...prev, ...newImages]);
  }

  function handleAddRoom() {
    const result = galleryRoomSchema.safeParse({ name: addRoomName });
    if (!result.success) {
      setAddRoomError(result.error.issues[0]?.message ?? 'Nome inválido.');
      return;
    }
    setAddRoomError('');
    setDraftRooms((prev) => [
      ...prev,
      {
        id: `temp-${crypto.randomUUID()}`,
        name: result.data.name,
        originalName: null,
        isNew: true,
        deleted: false,
      },
    ]);
    setAddingRoom(false);
    setAddRoomName('');
  }

  function handleRenameRoom(roomId: string) {
    // An empty name means "give up renaming", not a validation error — same
    // as before. Anything else goes through the shared schema so both add
    // and rename enforce the exact same rule (mirrors CreatePropertyRoomDto).
    if (!newRoomName.trim()) {
      setRenameRoomError('');
      setEditingRoomId(null);
      return;
    }
    const result = galleryRoomSchema.safeParse({ name: newRoomName });
    if (!result.success) {
      setRenameRoomError(result.error.issues[0]?.message ?? 'Nome inválido.');
      return;
    }
    setRenameRoomError('');
    setDraftRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, name: result.data.name } : r)),
    );
    setEditingRoomId(null);
    setNewRoomName('');
  }

  function handleDeleteRoom(roomId: string) {
    setDraftRooms((prev) =>
      prev
        .map((r) => (r.id === roomId ? { ...r, deleted: true } : r))
        .filter((r) => !(r.deleted && r.isNew)),
    );
    setActiveRoomId((prev) => (prev === roomId ? null : prev));
    setDraftImages((prev) =>
      prev
        .filter((img) => {
          if (img.roomId === roomId && img.isNew) {
            URL.revokeObjectURL(img.url);
            return false;
          }
          return true;
        })
        .map((img) => (img.roomId === roomId && !img.isNew ? { ...img, deleted: true } : img)),
    );
  }

  async function handleConfirm() {
    setConfirmError('');
    try {
      // mutateAsync resolves only after onSuccess finishes invalidating, so the next
      // screen never renders from a cache that predates the upload.
      await commitGallery.mutateAsync(buildGalleryPatch(draftRooms, draftImages));
      navigateAfterFinish();
    } catch (e) {
      setConfirmError(getErrorMessage(e));
    }
  }

  function navigateAfterFinish() {
    if (fromDashboard) {
      navigate('/dashboard');
    } else if (fromContext === 'post-create') {
      navigate(`/properties/${id}`, { state: { context: 'post-create', showSplash } });
    } else {
      navigate(`/properties/${id}`);
    }
  }

  return (
    <div
      data-slot="page-gallery-management"
      className="flex min-h-dvh flex-col pb-24 md:min-h-full"
    >
      {/* Header */}
      <PageContainer
        withSafeAreaTop
        maxWidth="wide"
        className="sticky top-0 z-10 flex items-center gap-3 bg-background py-4"
      >
        <button
          type="button"
          onClick={() => {
            if (mode === 'photo-select') {
              exitSelectMode();
            } else if (fromContext === 'post-create') {
              navigate(`/properties/${id}/edit`, { state: { context: 'post-create' } });
            } else {
              navigate(`/dashboard`);
            }
          }}
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 md:hover:bg-border/60"
        >
          {mode === 'photo-select' ? <X size={24} /> : <ChevronLeft size={24} />}
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {mode === 'photo-select' ? 'Selecionar fotos' : 'Editar galeria'}
          </h1>
          <p className="truncate text-xs text-foreground-subtle">
            {mode === 'photo-select' && selectedPhotoIds.length > 0
              ? `${selectedPhotoIds.length} selecionada${selectedPhotoIds.length !== 1 ? 's' : ''}`
              : ` Cód. ${property.code} · ${PropertyTypeLabel[property.type]} · ${totalImages} foto${totalImages !== 1 ? 's' : ''}`}
          </p>
        </div>
        {mode === 'view' && (
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {totalImages > 0 && (
              <button
                type="button"
                onClick={() => setMode('photo-select')}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors md:hover:border-foreground-subtle/40 md:hover:bg-surface"
              >
                <ImageIcon size={18} aria-hidden="true" />
                {/* Label shortens on a phone, but the accessible name keeps the noun so a
                    screen reader hears the same thing on both. */}
                Selecionar<span className="hidden md:inline">&nbsp;fotos</span>
              </button>
            )}

            {/* No "Adicionar fotos" button here any more: the grid's upload tile carries that
                action at every width, and having both put two controls with the same
                accessible name on the page. */}

            {/* The mobile action bar at the bottom already owns "Concluir". */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="hidden items-center gap-2 rounded-full bg-action px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-60 md:flex md:hover:bg-action-hover"
            >
              {confirming ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Check size={18} aria-hidden="true" />
              )}
              Concluir alterações
            </button>
          </div>
        )}
      </PageContainer>

      {/* Always mounted. It was gated on `isDesktop`, and the "Adicionar fotos" tile now
          renders at every width — leaving the gate would make the tile a no-op on a phone. */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(uploadTargetRoomId, e.target.files)}
      />

      {mode === 'view' && confirmError && (
        <PageContainer maxWidth="wide" className="pb-4">
          <p
            role="alert"
            className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {confirmError}
          </p>
        </PageContainer>
      )}

      {/* Sections — one composition. The `isDesktop` fork that used to live here rendered a
          filtered grid with a sidebar on desktop and a vertical stack of every room on
          mobile: not two layouts for one interaction, but two different interactions. */}
      <PageContainer
        maxWidth="wide"
        className="flex flex-1 flex-col gap-5 md:flex-row md:gap-8"
        {...swipeSelectProps}
      >
        <GallerySidebar
          sections={sections}
          activeRoomId={activeRoomId}
          onSelectRoom={setActiveRoomId}
          editingRoomId={editingRoomId}
          newRoomName={newRoomName}
          renameError={renameRoomError}
          onStartEdit={(roomId, name) => {
            setEditingRoomId(roomId);
            setNewRoomName(name);
            setRenameRoomError('');
          }}
          onCancelEdit={() => {
            setEditingRoomId(null);
            setRenameRoomError('');
          }}
          onRenameRoom={handleRenameRoom}
          onDeleteRoom={(roomId, name) => setRoomToDelete({ id: roomId, name })}
          addingRoom={addingRoom}
          addRoomName={addRoomName}
          addRoomError={addRoomError}
          onAddRoomNameChange={(v) => {
            setAddRoomName(v);
            setAddRoomError('');
          }}
          onStartAddRoom={() => setAddingRoom(true)}
          onConfirmAddRoom={handleAddRoom}
          onCancelAddRoom={() => {
            setAddingRoom(false);
            setAddRoomName('');
            setAddRoomError('');
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3 lg:grid-cols-5">
            {visibleImages.map((img, index) => (
              <GalleryImage
                key={img.id}
                image={img}
                mode={mode}
                isSelected={selectedPhotoIds.includes(img.id)}
                onToggle={togglePhotoSelection}
                position={index + 1}
              />
            ))}

            {mode === 'view' && (
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface text-foreground-subtle transition-colors md:hover:border-foreground-subtle/40 md:hover:bg-surface-raised"
              >
                <Upload size={24} aria-hidden="true" />
                <span className="text-xs font-medium">Adicionar fotos</span>
              </button>
            )}
          </div>
        </div>
      </PageContainer>

      {mode === 'photo-select' ? (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 p-4 backdrop-blur-md border-t border-border">
          <div className={`flex gap-3 ${MAX_WIDTH_CENTER.wide}`}>
            <button
              type="button"
              onClick={() => setConfirmDeletePhotosOpen(true)}
              disabled={selectedPhotoIds.length === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-danger text-danger font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-danger/10 md:hover:bg-danger/10"
            >
              <Trash2 size={24} />
              Excluir ({selectedPhotoIds.length})
            </button>
            <button
              type="button"
              onClick={() => setShowMoveDialog(true)}
              disabled={selectedPhotoIds.length === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-action text-white font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-action-hover md:hover:bg-action-hover"
            >
              <MoveRight size={24} />
              Mover
            </button>
          </div>
        </div>
      ) : (
        /* Mobile action bar. `md:hidden` rather than `!isDesktop`: the desktop header
           already carries "Concluir", and the guard for the add-room input having focus is
           gone because that input now lives in the sidebar, not under this bar. */
        <div className="fixed inset-x-0 bottom-0 bg-background/90 p-4 backdrop-blur-sm md:hidden">
          <div className={`flex flex-col gap-2 ${MAX_WIDTH_CENTER.content}`}>
            {confirmError && (
              <p
                role="alert"
                className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              >
                {confirmError}
              </p>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-colors disabled:opacity-60 active:bg-action-hover md:hover:bg-action-hover"
            >
              {confirming ? (
                <Loader2 size={24} className="animate-spin" />
              ) : fromDashboard ? (
                'Editar galeria'
              ) : (
                'Adicionar fotos e concluir'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sheet on mobile, centered dialog on desktop — one element, CSS decides. */}
      <MoveDialog
        open={showMoveDialog}
        sections={sections}
        onMove={handleMoveToRoom}
        onClose={() => setShowMoveDialog(false)}
      />

      {/* Delete room confirmation */}
      <ConfirmModal
        open={roomToDelete !== null}
        message={`Você tem certeza que deseja excluir o ambiente "${roomToDelete?.name}"?`}
        onConfirm={() => {
          if (roomToDelete) handleDeleteRoom(roomToDelete.id);
          setRoomToDelete(null);
        }}
        onClose={() => setRoomToDelete(null)}
      />

      {/* Delete selected photos confirmation */}
      <ConfirmModal
        open={confirmDeletePhotosOpen}
        message="Você tem certeza que deseja excluir essas fotos?"
        onConfirm={() => {
          handleDeleteSelected();
          setConfirmDeletePhotosOpen(false);
        }}
        onClose={() => setConfirmDeletePhotosOpen(false)}
      />
    </div>
  );
}

// ─── GalleryImage Component ──────────────────────────────────────────────────
interface GalleryImageProps {
  image: PropertyImageDto;
  mode: Mode;
  isSelected: boolean;
  onToggle: (imageId: string) => void;
  /** 1-based position, for the accessible name. */
  position: number;
}

/**
 * A photo in the gallery grid — and, in selection mode, a real checkbox.
 *
 * It used to be a plain `<div>` with an `<img>`: selection happened entirely through
 * pointer events captured by `useSwipeToSelect` on the container. That meant three
 * failures at once. There was no way to select a photo with a keyboard (WCAG 2.1.1),
 * nothing announced that a photo *could* be selected or that it *was* (no role, no
 * `aria-checked`), and drag was the only path to multi-select (WCAG 2.5.7 asks for a
 * single-pointer alternative — tap worked, but nothing said so).
 *
 * The swipe gesture is kept: dragging across a dozen photos is genuinely faster than
 * twelve taps. It is now an accelerator on top of an accessible control rather than the
 * only way in. `data-swipe-select-id` is what the gesture handler looks for, so the
 * attribute stays.
 */
function GalleryImage({ image, mode, isSelected, onToggle, position }: GalleryImageProps) {
  const selecting = mode === 'photo-select';

  const figure = (
    <>
      <img
        src={image.url}
        alt={image.label ?? `Foto ${position}`}
        className={cn(
          'h-full w-full rounded-xl object-cover transition-all',
          isSelected && 'ring-4 ring-action ring-offset-2',
        )}
      />
      {selecting && (
        <span
          aria-hidden="true"
          className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-surface-raised shadow-md"
        >
          {isSelected && (
            <span className="flex size-5 items-center justify-center rounded-full bg-action">
              <Check size={16} className="text-primary-foreground" />
            </span>
          )}
        </span>
      )}
    </>
  );

  if (!selecting) {
    return <div className="relative aspect-square">{figure}</div>;
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Foto ${position}${image.label ? ` — ${image.label}` : ''}`}
      onClick={() => onToggle(image.id)}
      data-swipe-select-id={image.id}
      // pan-y lets a vertical drag scroll the page while a horizontal one is claimed by
      // the selection gesture — the same intent detection useSwipeToSelect does in JS.
      style={{ touchAction: 'pan-y' }}
      className="relative aspect-square cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {figure}
    </button>
  );
}

// ─── AddRoomInline Component ─────────────────────────────────────────────────
// The inline "new room name" form, shared between the mobile stacked-sections
// list (end of the list) and the desktop sidebar (below the room list).
interface AddRoomInlineProps {
  name: string;
  error: string;
  onNameChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

function AddRoomInline({
  name,
  error,
  onNameChange,
  onConfirm,
  onCancel,
  onFocus,
  onBlur,
  className,
  ref,
}: AddRoomInlineProps) {
  return (
    <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Nome do ambiente"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          className="flex-1 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-action placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={onConfirm}
          aria-label="Confirmar novo ambiente"
          className="flex size-10 items-center justify-center rounded-full bg-action text-white"
        >
          <Check size={24} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar novo ambiente"
          className="flex size-10 items-center justify-center rounded-full bg-border text-foreground"
        >
          <X size={24} />
        </button>
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

// ─── GallerySidebar Component ────────────────────────────────────────────────
// Desktop-only "Cômodos" sidebar — filters the main content area to a single
// room's photos (unlike mobile, which stacks every `RoomSection`). Room
// rename/delete controls live here (on item hover) instead of in a section
// header, since only one room's content is on screen at a time.
interface GallerySidebarProps {
  sections: GallerySection[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  editingRoomId: string | null;
  newRoomName: string;
  renameError: string;
  onStartEdit: (roomId: string, name: string) => void;
  onCancelEdit: () => void;
  onRenameRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string, name: string) => void;
  addingRoom: boolean;
  addRoomName: string;
  addRoomError: string;
  onAddRoomNameChange: (value: string) => void;
  onStartAddRoom: () => void;
  onConfirmAddRoom: () => void;
  onCancelAddRoom: () => void;
}

function GallerySidebar({
  sections,
  activeRoomId,
  onSelectRoom,
  editingRoomId,
  newRoomName,
  renameError,
  onStartEdit,
  onCancelEdit,
  onRenameRoom,
  onDeleteRoom,
  addingRoom,
  addRoomName,
  addRoomError,
  onAddRoomNameChange,
  onStartAddRoom,
  onConfirmAddRoom,
  onCancelAddRoom,
}: GallerySidebarProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 md:w-64 md:gap-4">
      <span className="text-sm font-semibold text-foreground">Cômodos</span>

      {/* One list, two presentations: a horizontally scrolling row of chips below `md`,
          a vertical rail from `md` up. Not two renderings — the items are identical. */}
      <div className="-mx-gutter flex gap-1 overflow-x-auto px-gutter pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
        {sections.map((section) => {
          const key = section.roomId ?? 'unassigned';

          if (section.roomId && editingRoomId === section.roomId) {
            return (
              <div key={key} className="flex flex-col gap-1.5 px-1 py-1">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newRoomName}
                    onChange={(e) => onStartEdit(section.roomId!, e.target.value)}
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
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-white"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    aria-label="Cancelar renomeação do ambiente"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-border text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
                {renameError && <p className="text-xs font-medium text-danger">{renameError}</p>}
              </div>
            );
          }

          const active = section.roomId === activeRoomId;

          return (
            <div
              key={key}
              className={cn(
                'group flex shrink-0 items-center gap-1 rounded-xl pr-1 transition-colors md:shrink',
                active ? 'bg-action/10 text-action' : 'text-foreground md:hover:bg-surface',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectRoom(section.roomId)}
                className="flex flex-1 items-center gap-2 py-2.5 pl-3 text-left"
              >
                <DoorOpen size={18} className="shrink-0" />
                <span className="flex-1 truncate text-sm font-medium">{section.name}</span>
                <span className="shrink-0 text-xs text-foreground-subtle">
                  ({section.images.length})
                </span>
              </button>
              {section.roomId && (
                // Always visible on touch: `group-hover` is unreachable without a pointer,
                // so the only way to rename or delete a room was a mouse.
                <div className="flex shrink-0 items-center gap-1 md:hidden md:group-hover:flex">
                  <button
                    type="button"
                    onClick={() => onStartEdit(section.roomId!, section.name)}
                    aria-label="Renomear ambiente"
                    className="flex size-7 items-center justify-center rounded-full text-foreground-subtle hover:bg-border"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRoom(section.roomId!, section.name)}
                    aria-label="Excluir ambiente"
                    className="flex size-7 items-center justify-center rounded-full text-foreground-subtle hover:bg-border"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addingRoom ? (
        <AddRoomInline
          name={addRoomName}
          error={addRoomError}
          onNameChange={onAddRoomNameChange}
          onConfirm={onConfirmAddRoom}
          onCancel={onCancelAddRoom}
        />
      ) : (
        <button
          type="button"
          onClick={onStartAddRoom}
          className="flex items-center gap-2 text-sm font-medium text-action transition-colors hover:text-action-hover"
        >
          <Plus size={18} />
          Adicionar ambiente
        </button>
      )}
    </div>
  );
}

// ─── MoveDialog Component ────────────────────────────────────────────────────
// A single Modal: sheet on mobile, centered dialog on desktop, decided by CSS.
interface MoveDialogProps {
  open: boolean;
  sections: GallerySection[];
  onMove: (roomId: string | null) => void;
  onClose: () => void;
}

function MoveDialog({ open, sections, onMove, onClose }: MoveDialogProps) {
  const content = (
    <div className="flex flex-col gap-2 px-6 pb-4 md:px-0 md:pb-0">
      {sections.map((section) => {
        const key = section.roomId ?? 'unassigned';
        return (
          <button
            key={key}
            type="button"
            onClick={() => onMove(section.roomId)}
            className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors active:bg-border md:hover:bg-border/60"
          >
            <span>{section.name}</span>
            <span className="text-xs text-foreground-subtle">({section.images.length})</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-border text-sm font-semibold text-foreground transition-colors md:hover:bg-border/70"
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Mover para">
      {content}
    </Modal>
  );
}
