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

interface GallerySection {
  roomId: string | null;
  name: string;
  images: PropertyImageDto[];
}

/** Key for room-keyed state maps — `roomId` is `null` for "Sem ambiente". */
function sectionKey(roomId: string | null): string {
  return roomId ?? 'unassigned';
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
    dashboardSearch?: string;
  } | null;
  const fromDashboard = locationState?.from === 'dashboard';
  const fromContext = locationState?.context;
  const showSplash = Boolean(locationState?.showSplash);
  // Carried from `PropertyAdminCard` when opened from a filtered dashboard (e.g.
  // `?status=PENDING`), so "Voltar" and finishing the gallery return to that same filtered
  // view instead of resetting it.
  const dashboardSearch = locationState?.dashboardSearch ?? '';
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
   * Which desktop sections are showing more than their first 15 photos. Mobile never sets
   * this — "Ver mais" there opens `fullscreenRoom` instead of expanding in place — so it's
   * read only behind `md:` classes.
   */
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(new Set());

  /**
   * The room a mobile "Ver mais" opened into its own full-screen view — `{ roomId }` rather
   * than a bare `string | null` so "closed" (`null`) and "open on the unassigned room"
   * (`{ roomId: null }`) stay distinguishable.
   */
  const [fullscreenRoom, setFullscreenRoom] = useState<{ roomId: string | null } | null>(null);

  /** Set right before opening the shared file picker, since upload no longer has a single
   *  page-wide target room — each section (and the fullscreen view) uploads to its own. */
  const [pendingUploadRoomId, setPendingUploadRoomId] = useState<string | null>(null);
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

  // The mobile full-screen room view pushes a history entry when it opens, so the
  // hardware/gesture back button closes *it* instead of leaving the whole gallery page —
  // `closeRoomFullscreen` consumes that entry via `history.back()`, and this listener is
  // what actually clears the state once that pop happens.
  useEffect(() => {
    function handlePopState() {
      setFullscreenRoom(null);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  function requestUpload(roomId: string | null) {
    setPendingUploadRoomId(roomId);
    uploadInputRef.current?.click();
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

  function toggleExpanded(roomId: string | null) {
    const key = sectionKey(roomId);
    setExpandedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openRoomFullscreen(roomId: string | null) {
    // Pushed so the hardware/gesture back button closes the room view instead of leaving
    // the gallery page — see the `popstate` listener above.
    window.history.pushState({ gallerySection: true }, '');
    setFullscreenRoom({ roomId });
  }

  function closeRoomFullscreen() {
    if (window.history.state?.gallerySection) {
      // Consumes the entry pushed by `openRoomFullscreen`, which triggers the `popstate`
      // listener that actually clears `fullscreenRoom` — one back-press, not two.
      window.history.back();
    } else {
      setFullscreenRoom(null);
    }
  }

  /**
   * "Ver mais" means different things at different widths: on a phone there's no room to
   * expand a section in place, so it opens a dedicated full-screen view; on a wider screen
   * it just reveals the rest of the grid. `matchMedia` is read here, once, at the moment of
   * the click — not stored in state or used to pick between component trees — so this isn't
   * the `useIsDesktop` fork the rest of the app deliberately avoids.
   */
  function handleViewMore(roomId: string | null) {
    if (window.matchMedia('(min-width: 768px)').matches) {
      toggleExpanded(roomId);
    } else {
      openRoomFullscreen(roomId);
    }
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
      navigate(`/dashboard${dashboardSearch}`);
    } else if (fromContext === 'post-create') {
      navigate(`/properties/${id}`, { state: { context: 'post-create', showSplash } });
    } else {
      navigate(`/properties/${id}`);
    }
  }

  const fullscreenSection = fullscreenRoom
    ? (sections.find((s) => s.roomId === fullscreenRoom.roomId) ?? null)
    : null;

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
              navigate(`/dashboard${dashboardSearch}`);
            }
          }}
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 md:hover:bg-border/60"
        >
          {mode === 'photo-select' ? <X size={24} /> : <ChevronLeft size={24} />}
        </button>
        <div className="flex-1 min-w-0">
          {/* Matches the property wizard's console header, which steps up to `2xl` from
              `md`. Left at a flat `lg` this was the only console page whose title stayed
              phone-sized on a desktop. */}
          <h1 className="truncate text-lg font-bold text-foreground md:text-2xl">
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

            {/* No "Adicionar fotos" button here any more: each section's upload tile carries
                that action, and having both put two controls with the same accessible name
                on the page. */}

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

      {/* Always mounted; the shared picker is aimed at whichever section (or the fullscreen
          view) last called `requestUpload`. */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(pendingUploadRoomId, e.target.files)}
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

      {/* Sections — one composition at every width. Mobile shows 3 photos per room and
          "Ver mais" opens a dedicated full-screen view; desktop shows up to 15 (5×3) and
          "Ver mais" expands the section in place. Both are the same markup: only the CSS
          visibility of tiles past index 3/15 and what the "Ver mais" click does differ. */}
      <PageContainer maxWidth="wide" className="flex flex-1 flex-col gap-8" {...swipeSelectProps}>
        {sections.map((section) => (
          <RoomSection
            key={sectionKey(section.roomId)}
            section={section}
            mode={mode}
            selectedPhotoIds={selectedPhotoIds}
            onTogglePhoto={togglePhotoSelection}
            expanded={expandedRoomIds.has(sectionKey(section.roomId))}
            onViewMore={() => handleViewMore(section.roomId)}
            onToggleExpand={() => toggleExpanded(section.roomId)}
            onUpload={requestUpload}
            editingRoomId={editingRoomId}
            newRoomName={newRoomName}
            renameError={renameRoomError}
            onStartEdit={(roomId, name) => {
              setEditingRoomId(roomId);
              setNewRoomName(name);
              setRenameRoomError('');
            }}
            onNewRoomNameChange={setNewRoomName}
            onCancelEdit={() => {
              setEditingRoomId(null);
              setRenameRoomError('');
            }}
            onRenameRoom={handleRenameRoom}
            onDeleteRoom={(roomId, name) => setRoomToDelete({ id: roomId, name })}
          />
        ))}

        {addingRoom ? (
          <AddRoomInline
            name={addRoomName}
            error={addRoomError}
            onNameChange={(v) => {
              setAddRoomName(v);
              setAddRoomError('');
            }}
            onConfirm={handleAddRoom}
            onCancel={() => {
              setAddingRoom(false);
              setAddRoomName('');
              setAddRoomError('');
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingRoom(true)}
            className="flex items-center gap-2 self-start text-sm font-medium text-action transition-colors md:hover:text-action-hover"
          >
            <Plus size={18} />
            Adicionar ambiente
          </button>
        )}
      </PageContainer>

      {/* Hidden while the fullscreen room view is open — it carries its own copy of this bar
          so the two are never mounted at once. */}
      {!fullscreenRoom &&
        (mode === 'photo-select' ? (
          <SelectionActionBar
            selectedCount={selectedPhotoIds.length}
            onDelete={() => setConfirmDeletePhotosOpen(true)}
            onMove={() => setShowMoveDialog(true)}
          />
        ) : (
          /* Mobile action bar. `md:hidden` rather than `!isDesktop`: the desktop header
             already carries "Concluir". */
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
        ))}

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

      {/* Mobile-only: what a "Ver mais" opens instead of expanding in place. Reuses the same
          mode/selectedPhotoIds session and the same move/delete modals above — it's a
          filtered view onto the same edit, not a parallel one. */}
      {fullscreenSection && (
        <RoomFullscreen
          section={fullscreenSection}
          mode={mode}
          selectedPhotoIds={selectedPhotoIds}
          onTogglePhoto={togglePhotoSelection}
          onClose={closeRoomFullscreen}
          onEnterSelect={() => setMode('photo-select')}
          onExitSelect={exitSelectMode}
          onUpload={requestUpload}
          onRequestDeleteSelected={() => setConfirmDeletePhotosOpen(true)}
          onRequestMoveSelected={() => setShowMoveDialog(true)}
        />
      )}
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
  /** Responsive truncation classes from the parent grid (`RoomSection`). */
  className?: string;
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
function GalleryImage({
  image,
  mode,
  isSelected,
  onToggle,
  position,
  className,
}: GalleryImageProps) {
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
    return <div className={cn('relative aspect-square', className)}>{figure}</div>;
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
      className={cn(
        'relative aspect-square cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      {figure}
    </button>
  );
}

// ─── AddRoomInline Component ─────────────────────────────────────────────────
// The inline "new room name" form, at the end of the stacked sections list.
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

// ─── RoomSection Component ───────────────────────────────────────────────────
// One ambiente, stacked with the others at every width. Only two things change between
// mobile and desktop, both via plain data-driven classes (not a component fork): how many
// tiles past the first 3 are visible, and whether "Ver mais" is shown at all past 15.
interface RoomSectionProps {
  section: GallerySection;
  mode: Mode;
  selectedPhotoIds: string[];
  onTogglePhoto: (imageId: string) => void;
  /** Desktop-only "expanded past 15" state — irrelevant on mobile, where "Ver mais" opens
   *  the fullscreen view instead. */
  expanded: boolean;
  onViewMore: () => void;
  onToggleExpand: () => void;
  onUpload: (roomId: string | null) => void;
  editingRoomId: string | null;
  newRoomName: string;
  renameError: string;
  onStartEdit: (roomId: string, name: string) => void;
  onNewRoomNameChange: (value: string) => void;
  onCancelEdit: () => void;
  onRenameRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string, name: string) => void;
}

function RoomSection({
  section,
  mode,
  selectedPhotoIds,
  onTogglePhoto,
  expanded,
  onViewMore,
  onToggleExpand,
  onUpload,
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
              onChange={(e) => onNewRoomNameChange(e.target.value)}
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
      ) : (
        <div className="flex items-center gap-2">
          <DoorOpen size={18} className="shrink-0 text-foreground-subtle" aria-hidden="true" />
          <h2 className="flex-1 truncate text-sm font-semibold text-foreground">{section.name}</h2>
          <span className="shrink-0 text-xs text-foreground-subtle">({total})</span>
          {section.roomId && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onStartEdit(section.roomId!, section.name)}
                aria-label="Renomear ambiente"
                className="flex size-7 items-center justify-center rounded-full text-foreground-subtle transition-colors md:hover:bg-border"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteRoom(section.roomId!, section.name)}
                aria-label="Excluir ambiente"
                className="flex size-7 items-center justify-center rounded-full text-foreground-subtle transition-colors md:hover:bg-border"
              >
                <Trash2 size={14} />
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
            mode={mode}
            isSelected={selectedPhotoIds.includes(img.id)}
            onToggle={onTogglePhoto}
            position={index + 1}
            className={
              index < 3
                ? undefined
                : index < 15
                  ? 'hidden md:block'
                  : cn('hidden', expanded && 'md:block')
            }
          />
        ))}

        {mode === 'view' && (
          <button
            type="button"
            onClick={() => onUpload(section.roomId)}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface text-foreground-subtle transition-colors md:hover:border-foreground-subtle/40 md:hover:bg-surface-raised"
          >
            <Upload size={24} aria-hidden="true" />
            <span className="text-xs font-medium">Adicionar fotos</span>
          </button>
        )}
      </div>

      {total > 3 && (
        <button
          type="button"
          onClick={onViewMore}
          className={cn(
            'self-start text-sm font-semibold text-action transition-colors md:hover:text-action-hover',
            total > 15 ? 'md:inline-flex' : 'md:hidden',
          )}
        >
          Ver mais
        </button>
      )}
      {total > 15 && expanded && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="hidden self-start text-sm font-semibold text-action transition-colors md:inline-flex md:hover:text-action-hover"
        >
          Ver menos
        </button>
      )}
    </section>
  );
}

// ─── SelectionActionBar Component ────────────────────────────────────────────
// Excluir/Mover, shared between the main page and the fullscreen room view so the two
// never carry separate copies of the same logic.
function SelectionActionBar({
  selectedCount,
  onDelete,
  onMove,
}: {
  selectedCount: number;
  onDelete: () => void;
  onMove: () => void;
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-(--z-fixed) bg-background/95 p-4 backdrop-blur-md border-t border-border">
      <div className={`flex gap-3 ${MAX_WIDTH_CENTER.wide}`}>
        <button
          type="button"
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-danger text-danger font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-danger/10 md:h-12 md:hover:bg-danger/10"
        >
          <Trash2 size={24} />
          Excluir ({selectedCount})
        </button>
        <button
          type="button"
          onClick={onMove}
          disabled={selectedCount === 0}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-action text-white font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-action-hover md:h-12 md:hover:bg-action-hover"
        >
          <MoveRight size={24} />
          Mover
        </button>
      </div>
    </div>
  );
}

// ─── RoomFullscreen Component ────────────────────────────────────────────────
// What mobile's "Ver mais" opens: the same edit session (mode/selectedPhotoIds), filtered
// to one room, full screen. `md:hidden` is a defensive floor — the state that opens this
// is only ever set from the mobile branch of `handleViewMore`, but this keeps a resize
// mid-session from leaving a desktop viewport stuck on it.
interface RoomFullscreenProps {
  section: GallerySection;
  mode: Mode;
  selectedPhotoIds: string[];
  onTogglePhoto: (imageId: string) => void;
  onClose: () => void;
  onEnterSelect: () => void;
  onExitSelect: () => void;
  onUpload: (roomId: string | null) => void;
  onRequestDeleteSelected: () => void;
  onRequestMoveSelected: () => void;
}

function RoomFullscreen({
  section,
  mode,
  selectedPhotoIds,
  onTogglePhoto,
  onClose,
  onEnterSelect,
  onExitSelect,
  onUpload,
  onRequestDeleteSelected,
  onRequestMoveSelected,
}: RoomFullscreenProps) {
  const selecting = mode === 'photo-select';
  const selectedInRoom = section.images.filter((img) => selectedPhotoIds.includes(img.id)).length;

  return (
    <div className="fixed inset-0 z-(--z-fixed) flex flex-col bg-background md:hidden">
      <PageContainer
        withSafeAreaTop
        maxWidth="wide"
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background py-4"
      >
        <button
          type="button"
          onClick={selecting ? onExitSelect : onClose}
          aria-label={selecting ? 'Cancelar seleção' : 'Voltar'}
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90"
        >
          {selecting ? <X size={24} /> : <ChevronLeft size={24} />}
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">
            {selecting ? 'Selecionar fotos' : section.name}
          </h1>
          <p className="truncate text-xs text-foreground-subtle">
            {selecting
              ? `${selectedInRoom} selecionada${selectedInRoom !== 1 ? 's' : ''}`
              : `${section.images.length} foto${section.images.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!selecting && section.images.length > 0 && (
          <button
            type="button"
            onClick={onEnterSelect}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <ImageIcon size={18} aria-hidden="true" />
            Selecionar
          </button>
        )}
      </PageContainer>

      <PageContainer maxWidth="wide" className="flex-1 overflow-y-auto pb-24 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {section.images.map((img, index) => (
            <GalleryImage
              key={img.id}
              image={img}
              mode={mode}
              isSelected={selectedPhotoIds.includes(img.id)}
              onToggle={onTogglePhoto}
              position={index + 1}
            />
          ))}
          {!selecting && (
            <button
              type="button"
              onClick={() => onUpload(section.roomId)}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface text-foreground-subtle transition-colors"
            >
              <Upload size={24} aria-hidden="true" />
              <span className="text-xs font-medium">Adicionar fotos</span>
            </button>
          )}
        </div>
      </PageContainer>

      {selecting && (
        <SelectionActionBar
          selectedCount={selectedInRoom}
          onDelete={onRequestDeleteSelected}
          onMove={onRequestMoveSelected}
        />
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
