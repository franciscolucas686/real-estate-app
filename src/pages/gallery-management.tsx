import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePropertyMutationRefresh } from '../hooks/use-property-mutation-refresh';
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
} from 'lucide-react';
import { useProperty } from '../hooks/use-property';
import { PropertyTypeLabel } from '../utils/format';
import { useSwipeToSelect } from '../hooks/use-swipe-to-select';
import { useScrollIntoView } from '../hooks/use-scroll-into-view';
import { useDisablePullToRefresh } from '../hooks/use-disable-pull-to-refresh';
import { PageContainer } from '../components/ui/page-container';
import { PropertyDetailSkeleton } from '../components/ui/skeletons';
import { ConfirmBottomSheet } from '../components/ui/confirm-bottom-sheet';
import { twMerge } from 'tailwind-merge';
import { executeGalleryPatch } from '../services/gallery-patch-service';
import { buildGalleryPatch, type DraftRoom, type DraftImage } from '../utils/gallery-draft';
import type { PropertyImageDto } from '../types/api';

type Mode = 'view' | 'photo-select';

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
  const refreshPropertyQueries = usePropertyMutationRefresh();
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
  const [addingRoom, setAddingRoom] = useState(false);
  const [addRoomName, setAddRoomName] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [addRoomInputFocused, setAddRoomInputFocused] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeletePhotosOpen, setConfirmDeletePhotosOpen] = useState(false);

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

  const addRoomInputRef = useScrollIntoView<HTMLDivElement>(addingRoom);

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
      <div className="flex min-h-dvh items-center justify-center p-4">
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
    const newImages: DraftImage[] = Array.from(files).map((file) => ({
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

  function handleDeleteImage(imageId: string) {
    setDraftImages((prev) =>
      prev
        .filter((img) => {
          if (img.id === imageId && img.isNew) {
            URL.revokeObjectURL(img.url);
            return false;
          }
          return true;
        })
        .map((img) => (img.id === imageId && !img.isNew ? { ...img, deleted: true } : img)),
    );
  }

  function handleAddRoom() {
    const name = addRoomName.trim();
    if (!name) return;
    setDraftRooms((prev) => [
      ...prev,
      { id: `temp-${crypto.randomUUID()}`, name, originalName: null, isNew: true, deleted: false },
    ]);
    setAddingRoom(false);
    setAddRoomName('');
  }

  function handleRenameRoom(roomId: string) {
    const name = newRoomName.trim();
    if (!name) {
      setEditingRoomId(null);
      return;
    }
    setDraftRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name } : r)));
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

  async function handleConfirm() {
    setConfirming(true);
    try {
      const patch = buildGalleryPatch(draftRooms, draftImages);
      await executeGalleryPatch(id!, patch);
      refreshPropertyQueries(id);
      navigateAfterFinish();
    } catch (e) {
      console.error('Failed to save gallery', e);
      setConfirming(false);
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
    <div data-slot="page-gallery-management" className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <PageContainer
        withSafeAreaTop
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
          className="flex size-10 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform"
        >
          {mode === 'photo-select' ? <X size={24} /> : <ChevronLeft size={24} />}
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {mode === 'photo-select' ? 'Selecionar fotos' : 'Gerenciar fotos'}
          </h1>
          <p className="truncate text-xs text-foreground-subtle">
            {mode === 'photo-select' && selectedPhotoIds.length > 0
              ? `${selectedPhotoIds.length} selecionada${selectedPhotoIds.length !== 1 ? 's' : ''}`
              : ` Cód. ${property.code} · ${PropertyTypeLabel[property.type]} · ${totalImages} foto${totalImages !== 1 ? 's' : ''}`}
          </p>
        </div>
        {mode === 'view' && totalImages > 0 && (
          <button
            type="button"
            onClick={() => setMode('photo-select')}
            className="flex items-center gap-1.5 rounded-full bg-action px-4 py-2 text-xs font-medium text-white active:bg-action-hover"
          >
            <ImageIcon size={24} />
            Selecionar
          </button>
        )}
      </PageContainer>

      {/* Sections */}
      <div className="flex flex-col gap-6 px-4" {...swipeSelectProps}>
        {sections.map((section) => (
          <RoomSection
            key={section.roomId ?? 'unassigned'}
            section={section}
            mode={mode}
            selectedPhotoIds={selectedPhotoIds}
            editingRoomId={editingRoomId}
            newRoomName={newRoomName}
            onUpload={handleUpload}
            onDeleteImage={handleDeleteImage}
            onStartEdit={(roomId, name) => {
              setEditingRoomId(roomId);
              setNewRoomName(name);
            }}
            onCancelEdit={() => setEditingRoomId(null)}
            onRenameRoom={handleRenameRoom}
            onDeleteRoom={(roomId, name) => setRoomToDelete({ id: roomId, name })}
          />
        ))}

        {/* Add room */}
        {addingRoom ? (
          <div ref={addRoomInputRef} className="flex items-center gap-2 scroll-mb-28">
            <input
              autoFocus
              value={addRoomName}
              onChange={(e) => setAddRoomName(e.target.value)}
              onFocus={() => setAddRoomInputFocused(true)}
              onBlur={() => setAddRoomInputFocused(false)}
              placeholder="Nome do ambiente"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddRoom();
                if (e.key === 'Escape') {
                  setAddingRoom(false);
                  setAddRoomName('');
                }
              }}
              className="flex-1 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-foreground outline-none focus:border-action placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleAddRoom}
              className="flex size-10 items-center justify-center rounded-full bg-action text-white"
            >
              <Check size={24} />
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingRoom(false);
                setAddRoomName('');
              }}
              className="flex size-10 items-center justify-center rounded-full bg-border text-foreground"
            >
              <X size={24} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingRoom(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-border text-md font-medium text-foreground-subtle active:bg-surface"
          >
            <Plus size={24} />
            Adicionar ambiente
          </button>
        )}
      </div>

      {/* Contextual Bottom Bar */}
      {mode === 'photo-select' ? (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 p-4 backdrop-blur-md border-t border-border">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmDeletePhotosOpen(true)}
              disabled={selectedPhotoIds.length === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-danger text-danger font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:bg-danger/10"
            >
              <Trash2 size={24} />
              Excluir ({selectedPhotoIds.length})
            </button>
            <button
              type="button"
              onClick={() => setShowMoveDialog(true)}
              disabled={selectedPhotoIds.length === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-action text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:bg-action-hover"
            >
              <MoveRight size={24} />
              Mover
            </button>
          </div>
        </div>
      ) : !addRoomInputFocused ? (
        <div className="fixed bottom-0 inset-x-0 bg-background/90 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white active:bg-action-hover disabled:opacity-60"
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
      ) : null}

      {/* Move Dialog */}
      {showMoveDialog && (
        <MoveDialog
          sections={sections}
          onMove={handleMoveToRoom}
          onClose={() => setShowMoveDialog(false)}
        />
      )}

      {/* Delete room confirmation */}
      <ConfirmBottomSheet
        open={roomToDelete !== null}
        message={`Você tem certeza que deseja excluir o ambiente "${roomToDelete?.name}"?`}
        onConfirm={() => {
          if (roomToDelete) handleDeleteRoom(roomToDelete.id);
          setRoomToDelete(null);
        }}
        onClose={() => setRoomToDelete(null)}
      />

      {/* Delete selected photos confirmation */}
      <ConfirmBottomSheet
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
}

function GalleryImage({ image, mode, isSelected }: GalleryImageProps) {
  return (
    <div
      className="relative aspect-square"
      data-swipe-select-id={mode === 'photo-select' ? image.id : undefined}
      style={mode === 'photo-select' ? { touchAction: 'pan-y' } : undefined}
    >
      <img
        src={image.url}
        alt={image.label ?? ''}
        className={twMerge(
          'h-full w-full rounded-xl object-cover transition-all',
          mode === 'photo-select' && 'cursor-pointer',
          isSelected && 'ring-4 ring-action ring-offset-2',
        )}
      />

      {/* Checkbox for photo-select mode */}
      {mode === 'photo-select' && (
        <div className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-white shadow-md">
          {isSelected && (
            <div className="flex size-5 items-center justify-center rounded-full bg-action">
              <Check size={24} className="text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RoomSection Component ───────────────────────────────────────────────────
interface RoomSectionProps {
  section: GallerySection;
  mode: Mode;
  selectedPhotoIds: string[];
  editingRoomId: string | null;
  newRoomName: string;
  onUpload: (roomId: string | null, files: FileList | null) => void;
  onDeleteImage: (id: string) => void;
  onStartEdit: (roomId: string, name: string) => void;
  onCancelEdit: () => void;
  onRenameRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string, name: string) => void;
}

function RoomSection({
  section,
  mode,
  selectedPhotoIds,
  editingRoomId,
  newRoomName,
  onUpload,
  onStartEdit,
  onCancelEdit,
  onRenameRoom,
  onDeleteRoom,
}: RoomSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        {section.roomId && editingRoomId === section.roomId ? (
          <>
            <input
              autoFocus
              value={newRoomName}
              onChange={(e) => onStartEdit(section.roomId!, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameRoom(section.roomId!);
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-lg text-foreground outline-none focus:border-action"
            />
            <button
              type="button"
              onClick={() => onRenameRoom(section.roomId!)}
              className="flex size-10 items-center justify-center rounded-full bg-action text-white"
            >
              <Check size={24} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex size-10 items-center justify-center rounded-full bg-border text-foreground"
            >
              <X size={24} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-lg font-semibold text-foreground">
              {section.name}
              <span className="ml-1.5 text-xs font-normal text-foreground-subtle">
                ({section.images.length})
              </span>
            </span>
            {section.roomId && mode === 'view' && (
              <>
                <button
                  type="button"
                  onClick={() => onStartEdit(section.roomId!, section.name)}
                  aria-label="Renomear ambiente"
                  className="flex size-10 items-center justify-center rounded-full text-foreground-subtle active:bg-border"
                >
                  <Pencil size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRoom(section.roomId!, section.name)}
                  aria-label="Excluir ambiente"
                  className="flex size-10 items-center justify-center rounded-full text-foreground-subtle active:bg-border"
                >
                  <Trash2 size={24} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Images grid */}
      <div className="grid grid-cols-3 gap-2">
        {section.images.map((img) => (
          <GalleryImage
            key={img.id}
            image={img}
            mode={mode}
            isSelected={selectedPhotoIds.includes(img.id)}
          />
        ))}

        {/* Upload button - only in view mode */}
        {mode === 'view' && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-foreground-subtle active:bg-surface-raised"
            >
              <Upload size={24} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onUpload(section.roomId, e.target.files)}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── MoveDialog Component ────────────────────────────────────────────────────
interface MoveDialogProps {
  sections: GallerySection[];
  onMove: (roomId: string | null) => void;
  onClose: () => void;
}

function MoveDialog({ sections, onMove, onClose }: MoveDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface-raised p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">Mover para</h3>
        <div className="flex flex-col gap-2">
          {sections.map((section) => {
            const key = section.roomId ?? 'unassigned';
            return (
              <button
                key={key}
                onClick={() => onMove(section.roomId)}
                className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground active:bg-border"
              >
                <span>{section.name}</span>
                <span className="text-xs text-foreground-subtle">({section.images.length})</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-border text-sm font-semibold text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
