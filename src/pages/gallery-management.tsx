import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { PageContainer } from '../components/ui/page-container';
import { PropertyDetailSkeleton } from '../components/ui/skeletons';
import { twMerge } from 'tailwind-merge';
import {
  createRoom,
  deleteRoom,
  uploadPropertyImages,
  deletePropertyImage,
  reorderPropertyImages,
} from '../services/property-service';
import type { PropertyImageDto, PropertyRoomDto } from '../types/api';

type Mode = 'view' | 'photo-select';

interface GallerySection {
  roomId: string | null;
  name: string;
  images: PropertyImageDto[];
}

export function GalleryManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: property, isLoading } = useProperty(id!);

  // State machine
  const [mode, setMode] = useState<Mode>('view');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [addRoomName, setAddRoomName] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  if (isLoading) return <PropertyDetailSkeleton />;

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
      images: property.gallery.unassigned ?? [],
    },
    ...property.gallery.rooms.map((r: PropertyRoomDto) => ({
      roomId: r.id,
      name: r.name,
      images: r.images,
    })),
  ];

  const totalImages = sections.reduce((sum, s) => sum + s.images.length, 0);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['property', id] });
  }

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

  async function handleDeleteSelected() {
    if (selectedPhotoIds.length === 0) return;
    try {
      await Promise.all(selectedPhotoIds.map((imgId) => deletePropertyImage(id!, imgId)));
      exitSelectMode();
      invalidate();
    } catch (e) {
      console.error('Failed to delete images', e);
    }
  }

  async function handleMoveToRoom(targetRoomId: string | null) {
    if (selectedPhotoIds.length === 0) return;
    try {
      const items = selectedPhotoIds.map((imageId, idx) => ({
        imageId,
        order: idx,
        roomId: targetRoomId,
      }));
      await reorderPropertyImages(id!, { items });
      setShowMoveDialog(false);
      exitSelectMode();
      invalidate();
    } catch (e) {
      console.error('Failed to move images', e);
    }
  }

  async function handleUpload(roomId: string | null, files: FileList | null) {
    if (!files || files.length === 0) return;
    const key = roomId ?? 'unassigned';
    setUploading(key);
    try {
      await uploadPropertyImages(id!, Array.from(files), roomId ?? undefined);
      invalidate();
    } finally {
      setUploading(null);
    }
  }

  async function handleDeleteImage(imageId: string) {
    setDeleting(imageId);
    try {
      await deletePropertyImage(id!, imageId);
      invalidate();
    } finally {
      setDeleting(null);
    }
  }

  async function handleAddRoom() {
    const name = addRoomName.trim();
    if (!name) return;
    await createRoom(id!, { name });
    setAddingRoom(false);
    setAddRoomName('');
    invalidate();
  }

  async function handleRenameRoom(roomId: string) {
    const name = newRoomName.trim();
    if (!name) {
      setEditingRoomId(null);
      return;
    }
    const { updateRoom } = await import('../services/property-service');
    await updateRoom(id!, roomId, { name });
    setEditingRoomId(null);
    setNewRoomName('');
    invalidate();
  }

  async function handleDeleteRoom(roomId: string) {
    await deleteRoom(id!, roomId);
    invalidate();
  }

  return (
    <div data-slot="page-gallery-management" className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <PageContainer withSafeAreaTop className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => (mode === 'photo-select' ? exitSelectMode() : navigate(-1))}
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform"
        >
          {mode === 'photo-select' ? <X size={24} /> : <ChevronLeft size={24} />}
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {mode === 'photo-select' ? 'Selecionar fotos' : 'Gerenciar fotos'}
          </h1>
          <p className="text-xs text-foreground-subtle">
            {mode === 'photo-select' && selectedPhotoIds.length > 0
              ? `${selectedPhotoIds.length} selecionada${selectedPhotoIds.length !== 1 ? 's' : ''}`
              : `Cód. ${property.code} · ${totalImages} foto${totalImages !== 1 ? 's' : ''}`}
          </p>
        </div>
        {mode === 'view' && totalImages > 0 && (
          <button
            type="button"
            onClick={() => setMode('photo-select')}
            className="flex items-center gap-1.5 rounded-full bg-action px-3 py-1.5 text-xs font-medium text-white active:bg-action-hover"
          >
            <ImageIcon size={14} />
            Selecionar
          </button>
        )}
      </PageContainer>

      {/* Sections */}
      <div className="flex flex-col gap-6 px-4">
        {sections.map((section) => (
          <RoomSection
            key={section.roomId ?? 'unassigned'}
            section={section}
            propertyId={id!}
            mode={mode}
            selectedPhotoIds={selectedPhotoIds}
            uploading={uploading}
            deleting={deleting}
            editingRoomId={editingRoomId}
            newRoomName={newRoomName}
            onToggleSelection={togglePhotoSelection}
            onUpload={handleUpload}
            onDeleteImage={handleDeleteImage}
            onStartEdit={(roomId, name) => {
              setEditingRoomId(roomId);
              setNewRoomName(name);
            }}
            onCancelEdit={() => setEditingRoomId(null)}
            onRenameRoom={handleRenameRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        ))}

        {/* Add room */}
        {addingRoom ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={addRoomName}
              onChange={(e) => setAddRoomName(e.target.value)}
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
              <Check size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingRoom(false);
                setAddRoomName('');
              }}
              className="flex size-10 items-center justify-center rounded-full bg-border text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingRoom(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-border text-sm font-medium text-foreground-subtle active:bg-surface"
          >
            <Plus size={18} />
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
              onClick={handleDeleteSelected}
              disabled={selectedPhotoIds.length === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-danger text-danger font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:bg-danger/10"
            >
              <Trash2 size={18} />
              Excluir ({selectedPhotoIds.length})
            </button>
            <button
              type="button"
              onClick={() => setShowMoveDialog(true)}
              disabled={selectedPhotoIds.length === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-action text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:bg-action-hover"
            >
              <MoveRight size={18} />
              Mover
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 inset-x-0 bg-background/90 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate(`/properties/${id}`)}
            className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white active:bg-action-hover"
          >
            Concluir
          </button>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && (
        <MoveDialog
          sections={sections}
          onMove={handleMoveToRoom}
          onClose={() => setShowMoveDialog(false)}
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
  isDeleting: boolean;
  onToggleSelection: (id: string) => void;
  onDelete: (id: string) => void;
}

function GalleryImage({ image, mode, isSelected, onToggleSelection }: GalleryImageProps) {
  return (
    <div
      className="relative aspect-square"
      onClick={() => mode === 'photo-select' && onToggleSelection(image.id)}
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
              <Check size={14} className="text-white" />
            </div>
          )}
        </div>
      )}

      {/* Delete button for view mode */}
    </div>
  );
}

// ─── RoomSection Component ───────────────────────────────────────────────────
interface RoomSectionProps {
  section: GallerySection;
  propertyId: string;
  mode: Mode;
  selectedPhotoIds: string[];
  uploading: string | null;
  deleting: string | null;
  editingRoomId: string | null;
  newRoomName: string;
  onToggleSelection: (id: string) => void;
  onUpload: (roomId: string | null, files: FileList | null) => void;
  onDeleteImage: (id: string) => void;
  onStartEdit: (roomId: string, name: string) => void;
  onCancelEdit: () => void;
  onRenameRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
}

function RoomSection({
  section,
  mode,
  selectedPhotoIds,
  uploading,
  deleting,
  editingRoomId,
  newRoomName,
  onToggleSelection,
  onUpload,
  onDeleteImage,
  onStartEdit,
  onCancelEdit,
  onRenameRoom,
  onDeleteRoom,
}: RoomSectionProps) {
  const uploadKey = section.roomId ?? 'unassigned';
  const isUploading = uploading === uploadKey;
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
              className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground outline-none focus:border-action"
            />
            <button
              type="button"
              onClick={() => onRenameRoom(section.roomId!)}
              className="flex size-8 items-center justify-center rounded-full bg-action text-white"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex size-8 items-center justify-center rounded-full bg-border text-foreground"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold text-foreground">
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
                  className="flex size-8 items-center justify-center rounded-full text-foreground-subtle active:bg-border"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRoom(section.roomId!)}
                  aria-label="Excluir ambiente"
                  className="flex size-8 items-center justify-center rounded-full text-danger active:bg-danger/10"
                >
                  <Trash2 size={15} />
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
            isDeleting={deleting === img.id}
            onToggleSelection={onToggleSelection}
            onDelete={onDeleteImage}
          />
        ))}

        {/* Upload button - only in view mode */}
        {mode === 'view' && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-foreground-subtle active:bg-surface-raised disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
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
          {sections.map((section) => (
            <button
              key={section.roomId ?? 'unassigned'}
              onClick={() => onMove(section.roomId)}
              className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground active:bg-border"
            >
              <span>{section.name}</span>
              <span className="text-xs text-foreground-subtle">({section.images.length})</span>
            </button>
          ))}
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
