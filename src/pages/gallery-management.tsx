import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Plus, Check, Loader2, CheckCircle } from 'lucide-react';
import { useProperty } from '@/features/properties/hooks/use-property';
import { PropertyTypeLabel } from '@/shared/format';
import { useSwipeToSelect } from '@/shared/hooks/use-swipe-to-select';
import { useDisablePullToRefresh } from '@/shared/hooks/use-disable-pull-to-refresh';
import { PageContainer, MAX_WIDTH_CENTER } from '@/layout/page-container';
import { PropertyDetailSkeleton } from '@/features/properties/components/property-skeletons';
import { ConfirmModal } from '@/ui/confirm-modal';
import { SuccessSplash } from '@/ui/success-splash';
import { SplashIdentity } from '@/features/properties/components/splash-identity';
import { useCommitGalleryPatch } from '@/features/gallery/use-commit-gallery-patch';
import {
  buildGalleryPatch,
  type DraftRoom,
  type DraftImage,
} from '@/features/gallery/gallery-draft';
import type { PropertyImageDto } from '@/shared/api/types';
import { galleryRoomSchema, isImageFile } from '@/features/gallery/gallery-room.schema';
import { getErrorMessage } from '@/shared/api/api-error';
import type { GallerySection } from '@/features/gallery/gallery-section';
import { AddRoomInline } from '@/features/gallery/components/add-room-inline';
import { MoveDialog } from '@/features/gallery/components/move-dialog';
import { PhotoActionsSheet } from '@/features/gallery/components/photo-actions-sheet';
import { RoomFullscreen } from '@/features/gallery/components/room-fullscreen';
import { RoomSection } from '@/features/gallery/components/room-section';

/** Key for room-keyed state maps — `roomId` is `null` for "Sem ambiente". */
function sectionKey(roomId: string | null): string {
  return roomId ?? 'unassigned';
}

function toImageDto(img: DraftImage): PropertyImageDto {
  return { id: img.id, url: img.url, label: img.label, order: 0, isMain: img.isMain };
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
  /** A foto cuja folha de ações está aberta — `null` quando não há nenhuma. */
  const [photoActionsId, setPhotoActionsId] = useState<string | null>(null);
  // Success splash for a plain gallery edit (not the post-create wizard, which already
  // chains into its own splash on `property-details.tsx` and must not get a second one).
  const [gallerySplashVisible, setGallerySplashVisible] = useState(false);

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
        isMain: img.isMain,
        originalIsMain: img.isMain,
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
          isMain: img.isMain,
          originalIsMain: img.isMain,
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

  useEffect(() => {
    if (!gallerySplashVisible) return;
    const t = setTimeout(() => {
      setGallerySplashVisible(false);
      if (fromDashboard) {
        navigate(`/dashboard${dashboardSearch}`);
      } else {
        navigate(`/properties/${id}`);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [gallerySplashVisible, fromDashboard, dashboardSearch, id, navigate]);

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

  /**
   * Alterna a foto principal no rascunho: marcar uma desmarca as demais, e marcar a que já
   * era principal devolve o imóvel ao estado sem principal — o mesmo dos imóveis anteriores
   * a esta feature, que todas as telas já sabem tratar.
   *
   * Nada vai para a API aqui. Como todo o resto desta tela, a escolha vive no rascunho até
   * o "Salvar alterações", e é isso que a faz funcionar igual na criação de um imóvel, onde
   * a foto escolhida pode nem existir no servidor ainda.
   */
  function handleToggleMain(imageId: string) {
    setDraftImages((prev) =>
      prev.map((img) => ({ ...img, isMain: img.id === imageId && !img.isMain })),
    );
    setPhotoActionsId(null);
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

  /** Takes `File[]`, never the input's `FileList`: `input.value = ''` empties that very object
   *  in place, so a caller that resets before this runs would hand over an empty list — which is
   *  exactly how uploading broke once. Returns whether anything was actually added, so the caller
   *  only opens the room view on a real pick — `accept="image/*"` is advisory and `isImageFile`
   *  can filter everything out. */
  function handleUpload(roomId: string | null, files: File[]): boolean {
    // accept="image/*" already scopes the native picker; this only guards
    // against drag-and-drop or a picker that lets non-images through.
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) return false;

    const newImages: DraftImage[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      label: null,
      roomId,
      originalRoomId: roomId,
      // Foto nova nunca nasce principal: quem escolhe é o operador. A escolha pode recair
      // sobre ela ainda neste rascunho — `executeGalleryPatch` resolve o id real depois.
      isMain: false,
      originalIsMain: false,
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
      if (fromContext === 'post-create') {
        // This leg has its own splash sequence, chained on `property-details.tsx` —
        // showing `gallerySplashVisible` here too would stack a second one.
        navigate(`/properties/${id}`, { state: { context: 'post-create', showSplash } });
      } else {
        setGallerySplashVisible(true);
      }
    } catch (e) {
      setConfirmError(getErrorMessage(e));
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
          // `Array.from` copies the `File` refs out *now*. `e.target.files` is the input's own
          // `FileList`, and the reset below empties that same object — holding the reference
          // across the reset hands `handleUpload` an empty list and nothing is ever added.
          const picked = Array.from(e.target.files ?? []);
          // Without this, picking the same file twice in a row fires no `change` (the value is
          // identical), so the second "Adicionar fotos" would silently add nothing *and* never
          // open the room view.
          e.target.value = '';
          const added = handleUpload(roomId, picked);
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
          modalOpen={showMoveDialog || confirmDeletePhotosOpen || photoActionsId !== null}
          onTogglePhoto={togglePhotoSelection}
          onToggleMain={handleToggleMain}
          onRequestPhotoActions={setPhotoActionsId}
          onClose={closeRoomFullscreen}
          onEnterSelect={() => setSelecting(true)}
          onExitSelect={exitSelectMode}
          onUpload={requestUpload}
          onRequestDeleteSelected={() => setConfirmDeletePhotosOpen(true)}
          onRequestMoveSelected={() => setShowMoveDialog(true)}
          swipeProps={swipeSelectProps}
        />
      )}

      {/* Fora do `fullscreenRoom &&` acima: o Radix precisa da folha montada para animar a saída
          dela, e desmontar junto com o overlay cortaria a animação pela metade. */}
      <PhotoActionsSheet
        open={photoActionsId !== null}
        isMain={draftImages.some((img) => img.id === photoActionsId && img.isMain)}
        onToggleMain={() => photoActionsId && handleToggleMain(photoActionsId)}
        onClose={() => setPhotoActionsId(null)}
      />

      <SuccessSplash visible={gallerySplashVisible}>
        <CheckCircle size={64} className="text-action" />
        <p className="text-xl font-bold text-foreground">Galeria atualizada!</p>
        <SplashIdentity property={property} />
      </SuccessSplash>
    </>
  );
}
