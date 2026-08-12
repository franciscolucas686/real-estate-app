import {
  useState,
  useRef,
  useEffect,
  useId,
  type AnimationEvent,
  type Ref,
  type ReactNode,
} from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  ImagePlus,
  Settings2,
  MoveRight,
} from 'lucide-react';
import { useProperty } from '@/features/properties/hooks/use-property';
import { PropertyTypeLabel } from '@/shared/format';
import {
  useSwipeToSelect,
  type SwipeToSelectContainerProps,
} from '@/shared/hooks/use-swipe-to-select';
import { useDisablePullToRefresh } from '@/shared/hooks/use-disable-pull-to-refresh';
import { PageContainer, MAX_WIDTH_CENTER } from '@/layout/page-container';
import { CONSOLE_SIDEBAR_INSET } from '@/layout/console-shell';
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

  /**
   * Selection state. It only ever means anything while `fullscreenRoom` is open: the stacked
   * sections on the page are a read-only index now, and every write action (select, delete,
   * move) lives inside the room view. Both are cleared whenever that view closes.
   */
  const [selecting, setSelecting] = useState(false);
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
   * The room currently open in `RoomFullscreen` — an object rather than a bare `string | null`
   * so "closed" (`null`) and "open on the unassigned room" (`{ roomId: null }`) stay
   * distinguishable.
   *
   * `state: 'closed'` is the stretch where the panel is still mounted running its exit
   * animation — the same thing Radix's `Presence` does inside `ui/modal.tsx`. Without it the
   * element was destroyed in the same frame the user asked to close, so no exit animation could
   * ever run.
   */
  const [fullscreenRoom, setFullscreenRoom] = useState<{
    roomId: string | null;
    state: 'open' | 'closed';
  } | null>(null);

  /**
   * Which room the shared file picker is aimed at.
   *
   * A ref, not state: `null` is a real room ("Sem ambiente"), so it cannot double as "nothing
   * pending"; the value is only ever read from the input's own `change` handler; and as state it
   * was a batched write that the synchronous `.click()` on the next line raced in principle.
   */
  const pendingUploadRoomRef = useRef<string | null>(null);

  /** What to give focus back to when the room view closes — captured at the click that opens
   *  it, because by `change` time `document.activeElement` is the hidden file input. */
  const roomOpenerRef = useRef<HTMLElement | null>(null);
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
    enabled: selecting,
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

  // The room view pushes a history entry when it opens, so the hardware/gesture back button
  // closes *it* instead of leaving the whole gallery page — `closeRoomFullscreen` consumes that
  // entry via `history.back()`, and this listener is what actually clears the state once that
  // pop happens. The selection is cleared here too, inline rather than through
  // `exitSelectMode`, because this handler is registered once and must not close over a stale
  // render's setters.
  useEffect(() => {
    function handlePopState() {
      // Starts the exit rather than unmounting; `handleRoomExited` clears the state and the
      // selection once the animation is done. Dropping the selection here instead would make
      // the action bar vanish mid-slide.
      setFullscreenRoom((prev) => (prev ? { ...prev, state: 'closed' } : null));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Focus return, in an effect rather than inside `closeRoomFullscreen`: `history.back()` is
  // async, so at call time the overlay is still mounted and would take the focus straight back.
  useEffect(() => {
    if (fullscreenRoom === null && roomOpenerRef.current) {
      roomOpenerRef.current.focus({ preventScroll: true });
      roomOpenerRef.current = null;
    }
  }, [fullscreenRoom]);

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

  const fullscreenSection = fullscreenRoom
    ? (sections.find((s) => s.roomId === fullscreenRoom.roomId) ?? null)
    : null;

  /**
   * The one list that both the "Excluir (N)" count and the delete/move actions read, so the
   * number on the button can never disagree with what the button does. The count used to be
   * computed inside `RoomFullscreen` while the handlers acted on the whole `selectedPhotoIds` —
   * two numbers that only agreed by convention. Intersecting with the open room also makes
   * "move these elsewhere" self-clearing: the moved photos leave the section, so the next
   * render derives an empty selection.
   */
  const selectedInRoom = fullscreenSection
    ? selectedPhotoIds.filter((pid) => fullscreenSection.images.some((img) => img.id === pid))
    : [];

  // Selection handlers
  function togglePhotoSelection(imageId: string) {
    setSelectedPhotoIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId],
    );
  }

  function exitSelectMode() {
    setSelecting(false);
    setSelectedPhotoIds([]);
  }

  function handleDeleteSelected() {
    if (selectedInRoom.length === 0) return;
    const idsToRemove = new Set(selectedInRoom);
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
    if (selectedInRoom.length === 0) return;
    const idsToMove = new Set(selectedInRoom);
    setDraftImages((prev) =>
      prev.map((img) => (idsToMove.has(img.id) ? { ...img, roomId: targetRoomId } : img)),
    );
    setShowMoveDialog(false);
    exitSelectMode();
  }

  /** Returns whether anything was actually added, so the caller only opens the room view on a
   *  real pick — `accept="image/*"` is advisory and `isImageFile` can filter everything out. */
  function handleUpload(roomId: string | null, files: FileList | null): boolean {
    if (!files || files.length === 0) return false;
    // accept="image/*" already scopes the native picker; this only guards
    // against drag-and-drop or a picker that lets non-images through.
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return false;
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
    return true;
  }

  function captureOpener() {
    roomOpenerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function requestUpload(roomId: string | null) {
    // Today only `RoomFullscreen` calls this, and there the opener was already captured by
    // `handleManagePhotos` — overwriting it with a tile that is about to unmount would leave
    // focus nowhere when the room view closes. The guard is what would keep a page-level
    // upload tile, if one ever comes back, restoring focus correctly.
    if (fullscreenRoom === null) captureOpener();
    pendingUploadRoomRef.current = roomId;
    // Synchronous, deliberately: the picker needs the click's transient user activation, so
    // nothing may be awaited between the handler and this call.
    uploadInputRef.current?.click();
  }

  function handleManagePhotos(roomId: string | null) {
    captureOpener();
    openRoomFullscreen(roomId);
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

  function openRoomFullscreen(roomId: string | null) {
    // One entry per *open*, not per call: "Adicionar fotos" pressed from inside the room view
    // comes back through here, and a second entry would need two back presses to leave.
    //
    // The guard is `!== 'open'`, not `=== null`: reopening while the panel is still animating
    // out finds `fullscreenRoom` non-null but its history entry already consumed by
    // `history.back()`, so it does need a fresh push or the next back press would leave the
    // gallery entirely. Gated on React state rather than `window.history.state?.gallerySection`
    // because jsdom keeps a single history across a spec file — that flag survives into the
    // next test.
    if (fullscreenRoom?.state !== 'open') {
      window.history.pushState({ gallerySection: true }, '');
      // A room always opens in view mode — including when it reopens on top of an exit that
      // hasn't finished clearing the previous session yet.
      exitSelectMode();
    }
    setFullscreenRoom({ roomId, state: 'open' });
  }

  function closeRoomFullscreen() {
    setFullscreenRoom((prev) => (prev ? { ...prev, state: 'closed' } : null));
    if (window.history.state?.gallerySection) {
      // Consumes the entry pushed by `openRoomFullscreen` — one back-press to leave the room,
      // not two. The `popstate` it triggers sets the same 'closed' state, harmlessly.
      window.history.back();
    }
  }

  /**
   * Called by the panel once its exit animation finishes — this is what actually unmounts it.
   * Guarded so reopening mid-exit isn't undone by the animation that was already running.
   *
   * The selection is dropped *here* rather than when the close starts. Clearing it up front
   * unmounted `SelectionActionBar` and swapped the scroller's bottom padding while the panel was
   * still sliding away, so the content jumped mid-animation. It still never outlives the room
   * view, which is what matters: an id carried into the next room would let "Excluir (N)" act on
   * photos the user can no longer see.
   */
  function handleRoomExited() {
    if (fullscreenRoom?.state !== 'closed') return;
    setFullscreenRoom(null);
    exitSelectMode();
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

  return (
    <>
      <div
        data-slot="page-gallery-management"
        /* The room view is a modal surface at every width now. Without this the page behind
           keeps its whole tab order and accessibility tree under an opaque overlay, so tabbing
           past the room view's last control lands on invisible buttons. `inert` covers both
           halves; `aria-hidden` would only cover one. */
        inert={fullscreenRoom !== null}
        className="flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom,0px)+96px)] md:min-h-full md:pb-8"
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
              if (fromContext === 'post-create') {
                navigate(`/properties/${id}/edit`, { state: { context: 'post-create' } });
              } else {
                navigate(`/dashboard${dashboardSearch}`);
              }
            }}
            aria-label="Voltar"
            className="flex size-14 items-center justify-center rounded-full text-foreground transition-transform  bg-border active:scale-90 md:hover:bg-action md:hover:text-primary-foreground"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            {/* Matches the property wizard's console header, which steps up to `2xl` from
                `md`. Left at a flat `lg` this was the only console page whose title stayed
                phone-sized on a desktop. */}
            <h1 className="truncate text-lg font-bold text-foreground md:text-2xl">
              Editar galeria
            </h1>
            <p className="truncate text-xs text-foreground-subtle">
              {` Cód. ${property.code} · ${PropertyTypeLabel[property.type]} · ${totalImages} foto${totalImages !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* No "Selecionar" and no "Adicionar fotos" here any more: this page is an index,
                and every action on a photo — selecting, deleting, moving, uploading — lives
                inside a room's own screen. Each section's "Gerenciar fotos" is the way in. */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="hidden items-center gap-2 rounded-full bg-action px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-60 md:flex md:hover:bg-action-hover"
            >
              {confirming ? (
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              ) : (
                <Check size={22} aria-hidden="true" />
              )}
              Concluir alterações
            </button>
          </div>
        </PageContainer>

        {/* Desktop only: below `md` the same message renders inside the action bar, next to the
            button that produced it. Two copies used to render at once on a phone, which is two
            `role="alert"`s announcing the same string. */}
        {confirmError && (
          <PageContainer maxWidth="wide" className="hidden pb-4 md:block">
            <p
              role="alert"
              className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
            >
              {confirmError}
            </p>
          </PageContainer>
        )}

        {/* Sections — one composition at every width. Each room shows a fixed slice of its
            photos — two rows, closed by "Gerenciar fotos" — and the rest is reached through it. */}
        <PageContainer maxWidth="wide" className="flex flex-1 flex-col gap-8">
          {sections.map((section) => (
            <RoomSection
              key={sectionKey(section.roomId)}
              section={section}
              onManagePhotos={handleManagePhotos}
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

        {/* Mobile action bar — the "Concluir" at the end of the page. `md:hidden` because the
            desktop header already carries it. `z-(--z-nav)` (40) keeps it under the room view
            (50); the route sets `hideMobileNav` so the console's own bar, which is also
            `fixed bottom-0` and rendered after the page, no longer paints over this one. */}
        {!fullscreenRoom && (
          <div className="fixed inset-x-0 bottom-0 z-(--z-nav) bg-background/90 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur-sm md:hidden">
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
                  'Salvar alterações'
                ) : (
                  'Adicionar fotos e concluir'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outside the inert page root on purpose: `requestUpload` calls `.click()` on this input
          from a click that originates *inside* the room view, and a browser suppresses the
          activation behaviour of an inert element — the picker would simply never open. jsdom
          implements no `inert` at all, so no test would catch that. */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const roomId = pendingUploadRoomRef.current;
          const added = handleUpload(roomId, e.target.files);
          // Without this, picking the same file twice in a row fires no `change` (the value is
          // identical), so the second "Adicionar fotos" would silently add nothing *and* never
          // open the room view. The `File` refs are already captured above.
          e.target.value = '';
          // Choosing photos is the start of working on a room, not the end of it.
          if (added) openRoomFullscreen(roomId);
        }}
      />

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

      {/* The room manager. "Gerenciar fotos" leads here and a finished upload opens it by
          itself, so the flow is the same whichever way you arrived. It reuses this page's own
          selection state and modals — a filtered view onto the same edit, not a parallel one. */}
      {fullscreenRoom && fullscreenSection && (
        <RoomFullscreen
          section={fullscreenSection}
          state={fullscreenRoom.state}
          onExited={handleRoomExited}
          selecting={selecting}
          selectedIds={selectedInRoom}
          modalOpen={showMoveDialog || confirmDeletePhotosOpen}
          onTogglePhoto={togglePhotoSelection}
          onClose={closeRoomFullscreen}
          onEnterSelect={() => setSelecting(true)}
          onExitSelect={exitSelectMode}
          onUpload={requestUpload}
          onRequestDeleteSelected={() => setConfirmDeletePhotosOpen(true)}
          onRequestMoveSelected={() => setShowMoveDialog(true)}
          swipeProps={swipeSelectProps}
        />
      )}
    </>
  );
}

// ─── GalleryImage Component ──────────────────────────────────────────────────
interface GalleryImageProps {
  image: PropertyImageDto;
  /** 1-based position, for the accessible name. */
  position: number;
  /**
   * Render as a `role="checkbox"` instead of a plain tile.
   *
   * A boolean rather than the page-wide `mode` this used to take: `mode` was threaded into
   * `RoomSection` as well, so entering selection inside the room view would have turned the
   * page's stacked tiles into checkboxes too, putting two elements named "Foto 1 — Frente" in
   * the DOM at once. `RoomSection` has no way to pass this, so that cannot come back by
   * accident — which is what keeps the spec's singular `getByRole` queries meaningful.
   */
  selecting?: boolean;
  isSelected?: boolean;
  onToggle?: (imageId: string) => void;
  /** Responsive visibility classes from the parent grid (`photoTileVisibility`). */
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
  position,
  selecting = false,
  isSelected = false,
  onToggle,
  className,
}: GalleryImageProps) {
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
      onClick={() => onToggle?.(image.id)}
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

// ─── ActionTile Component ────────────────────────────────────────────────────
interface ActionTileProps {
  icon: ReactNode;
  label: string;
  /** Full accessible name, when the visible label alone would be ambiguous. Must contain
   *  `label` verbatim — WCAG 2.5.3, Label in Name. */
  ariaLabel?: string;
  onClick: () => void;
}

/**
 * A card that sits *in* a photo grid, exactly the size of a photo: "Gerenciar fotos" at the end
 * of a section, "Adicionar fotos" at the end of the room manager's grid. One component with one
 * set of classes so the two read as the same kind of thing wherever they appear — they used to
 * be a dashed upload tile inside the grid and a "Ver mais" text link below it, which read as two
 * unrelated things and left a room with no photos showing only one of them.
 */
function ActionTile({ icon, label, ariaLabel, onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-2 text-center text-foreground-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hover:border-foreground-subtle/40 md:hover:bg-surface-raised"
    >
      {icon}
      <span className="text-xs font-medium leading-tight">{label}</span>
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

function RoomSection({
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

// ─── SelectionActionBar Component ────────────────────────────────────────────
// Excluir/Mover, at the bottom of the room manager. A plain flex child rather than a `fixed`
// bar: `RoomFullscreen` is already a flex column, and a `fixed` element positions against the
// viewport, so on a desktop it would have spilled across the console sidebar the overlay
// deliberately leaves visible.
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
    <PageContainer
      maxWidth="wide"
      className="shrink-0 border-t border-border bg-background/95 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur-md"
    >
      <div className="flex gap-3">
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
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-action text-white font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-action-hover md:hover:bg-action-hover"
        >
          <MoveRight size={24} />
          Mover
        </button>
      </div>
    </PageContainer>
  );
}

// ─── RoomFullscreen Component ────────────────────────────────────────────────
interface RoomFullscreenProps {
  section: GallerySection;
  /** `closed` runs the exit animation; the page keeps this mounted until `onExited`. */
  state: 'open' | 'closed';
  onExited: () => void;
  selecting: boolean;
  /** Already intersected with this room by the page — the count on "Excluir (N)" and the
   *  action behind it read the same array. */
  selectedIds: string[];
  /** A Radix modal is open on top. Escape belongs to it then, not to this surface. */
  modalOpen: boolean;
  onTogglePhoto: (imageId: string) => void;
  onClose: () => void;
  onEnterSelect: () => void;
  onExitSelect: () => void;
  onUpload: (roomId: string | null) => void;
  onRequestDeleteSelected: () => void;
  onRequestMoveSelected: () => void;
  swipeProps: SwipeToSelectContainerProps;
}

/**
 * One ambiente, full screen, at every width — the only place photos can be selected, deleted or
 * moved. Both of a section's action tiles lead here and a finished upload opens it on its own,
 * so the flow is identical whichever way you arrived.
 *
 * **It isn't a route.** The unsaved draft lives in `GalleryManagement`'s own state and a real
 * route would unmount it, so this is an overlay and `openRoomFullscreen`/`closeRoomFullscreen`
 * push and consume a `history` entry by hand — that is what makes the hardware/gesture back
 * button close the room instead of the whole gallery.
 *
 * It used to be `md:hidden`, opened only by the mobile branch of a "Ver mais" that read
 * `matchMedia` at click time. That branch is gone, and with it the last viewport check in JS
 * anywhere in `src/`.
 *
 * **It moves like the filters modal**, on purpose: the same `--animate-sheet-*` /
 * `--animate-panel-*` tokens `ui/modal.tsx` uses, driven by the same `data-state` attribute, so
 * a room slides up on a phone and fades in on a desktop exactly as `/imoveis`' filters do.
 * Mounting straight into place read as a hard cut — nothing said a new layer had arrived.
 */
function RoomFullscreen({
  section,
  state,
  onExited,
  selecting,
  selectedIds,
  modalOpen,
  onTogglePhoto,
  onClose,
  onEnterSelect,
  onExitSelect,
  onUpload,
  onRequestDeleteSelected,
  onRequestMoveSelected,
  swipeProps,
}: RoomFullscreenProps) {
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // `aria-modal` is a claim about focus, so it has to be true: the surface takes focus on open,
  // the page behind is `inert`, and Escape gets out. The page restores focus to the tile that
  // opened this once it unmounts.
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // A confirmation or the move sheet is on top; Radix will close it, and acting here too
      // would dismiss both with one press. Already on the way out, there is nothing to close.
      if (modalOpen || state === 'closed') return;
      if (selecting) onExitSelect();
      else onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, state, selecting, onClose, onExitSelect]);

  /**
   * With no animation to wait on there is no `animationend` either, and the panel would stay
   * mounted forever. That is the case in jsdom (no animations, and Tailwind isn't even loaded)
   * and anywhere the classes resolve to `animation: none`; unmounting at once is right in both.
   *
   * `prefers-reduced-motion` is *not* one of those cases — `index.css` collapses durations to
   * `0.01ms` rather than `0` precisely so `animationend` still fires for state machines like
   * this one.
   */
  useEffect(() => {
    if (state !== 'closed') return;
    const name = containerRef.current && getComputedStyle(containerRef.current).animationName;
    if (!name || name === 'none') onExited();
  }, [state, onExited]);

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    // The panel's own animation only: the *enter* one lands here too, and animations on
    // descendants bubble.
    if (e.target !== e.currentTarget || state !== 'closed') return;
    onExited();
  }

  return (
    <>
      {/*
        Both the backdrop the filters modal has and a guard the room view was missing: `inert`
        sits on the page root, but `ConsoleShell`'s sidebar is outside it, so until now a click
        on "Configurações" navigated away and took the unsaved draft with it.
      */}
      <div
        aria-hidden="true"
        data-slot="room-scrim"
        data-state={state}
        onClick={onClose}
        className="fixed inset-0 z-(--z-fixed) bg-black/50 data-[state=closed]:pointer-events-none data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in"
      />
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-slot="room-fullscreen"
        data-state={state}
        onAnimationEnd={handleAnimationEnd}
        className={cn(
          // After the scrim in DOM order and at the same layer, so it paints on top of it while
          // the Radix modals opened from in here (60/70) still paint on top of both.
          'fixed inset-0 z-(--z-fixed) flex flex-col bg-background outline-none',
          // The filters modal's own two presentations, verbatim: a sheet on a phone, a fading
          // panel on a desktop. On the way out the surface stops taking clicks — a control
          // pressed during the slide would act on a room that is already gone.
          'data-[state=closed]:pointer-events-none',
          'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
          'md:data-[state=open]:animate-panel-in md:data-[state=closed]:animate-panel-out',
          // Stops short of the console's sidebar instead of covering it. A `fixed` element with a
          // z-index paints over the `sticky`, `z-auto` aside regardless of DOM order, so this is
          // what preserves the persistent navigation the console shell exists for.
          CONSOLE_SIDEBAR_INSET,
        )}
      >
        <PageContainer
          withSafeAreaTop
          maxWidth="wide"
          className="flex shrink-0 items-center gap-3 border-b border-border bg-background py-4"
        >
          <button
            type="button"
            onClick={selecting ? onExitSelect : onClose}
            aria-label={selecting ? 'Cancelar seleção' : 'Voltar'}
            className="flex size-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 md:hover:bg-border/60"
          >
            {selecting ? <X size={24} /> : <ChevronLeft size={24} />}
          </button>
          <div className="min-w-0 flex-1">
            <h1 id={headingId} className="truncate text-lg font-bold text-foreground md:text-2xl">
              {selecting ? 'Selecionar fotos' : section.name}
            </h1>
            <p className="truncate text-xs text-foreground-subtle">
              {selecting
                ? `${selectedIds.length} selecionada${selectedIds.length !== 1 ? 's' : ''}`
                : `${section.images.length} foto${section.images.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {!selecting && section.images.length > 0 && (
            <button
              type="button"
              onClick={onEnterSelect}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors md:hover:border-foreground-subtle/40 md:hover:bg-surface"
            >
              <ImageIcon size={18} aria-hidden="true" />
              Selecionar fotos
            </button>
          )}
        </PageContainer>

        <PageContainer
          maxWidth="wide"
          // `overscroll-contain` stops a wheel past the end of this list from chaining to the
          // document and scrolling the page underneath. A `useScrollLock` here would fight
          // `useSwipeToSelect`'s own — the hook is not ref-counted, so the drag's cleanup would
          // unlock the body while this is still open.
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain pt-4',
            selecting ? 'pb-6' : 'pb-[calc(env(safe-area-inset-bottom,0px)+24px)]',
          )}
          {...swipeProps}
        >
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3 xl:grid-cols-6">
            {section.images.map((img, index) => (
              <GalleryImage
                key={img.id}
                image={img}
                position={index + 1}
                selecting={selecting}
                isSelected={selectedIds.includes(img.id)}
                onToggle={onTogglePhoto}
              />
            ))}
            {/* No room suffix on the name here: there is exactly one ambiente in scope, and it
              must not collide with the page's per-room tiles. */}
            {!selecting && (
              <ActionTile
                icon={<ImagePlus size={24} aria-hidden="true" />}
                label="Adicionar fotos"
                onClick={() => onUpload(section.roomId)}
              />
            )}
          </div>
        </PageContainer>

        {selecting && (
          <SelectionActionBar
            selectedCount={selectedIds.length}
            onDelete={onRequestDeleteSelected}
            onMove={onRequestMoveSelected}
          />
        )}
      </div>
    </>
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
