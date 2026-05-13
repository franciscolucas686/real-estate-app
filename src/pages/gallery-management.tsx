import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2, Upload, Pencil, Check, X } from 'lucide-react';
import { useProperty } from '../hooks/use-property';
import { PageContainer } from '../components/ui/page-container';
import { PropertyDetailSkeleton } from '../components/ui/skeletons';
import {
  createRoom,
  deleteRoom,
  uploadPropertyImages,
  deletePropertyImage,
} from '../services/property-service';
import type { PropertyImageDto, PropertyRoomDto } from '../types/api';

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

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [addRoomName, setAddRoomName] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      <PageContainer className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">Gerenciar fotos</h1>
          <p className="text-xs text-foreground-subtle">
            Cód. {property.code} · {totalImages} foto{totalImages !== 1 ? 's' : ''}
          </p>
        </div>
      </PageContainer>

      {/* Sections */}
      <div className="flex flex-col gap-6 px-4">
        {sections.map((section) => {
          const uploadKey = section.roomId ?? 'unassigned';
          const isUploading = uploading === uploadKey;

          return (
            <div key={uploadKey} className="flex flex-col gap-3">
              {/* Section header */}
              <div className="flex items-center gap-2">
                {section.roomId && editingRoomId === section.roomId ? (
                  <>
                    <input
                      autoFocus
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameRoom(section.roomId!);
                        if (e.key === 'Escape') setEditingRoomId(null);
                      }}
                      className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground outline-none focus:border-action"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameRoom(section.roomId!)}
                      className="flex size-8 items-center justify-center rounded-full bg-action text-white"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoomId(null)}
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
                    {section.roomId && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoomId(section.roomId);
                            setNewRoomName(section.name);
                          }}
                          aria-label="Renomear ambiente"
                          className="flex size-8 items-center justify-center rounded-full text-foreground-subtle active:bg-border"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(section.roomId!)}
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
                  <div key={img.id} className="relative aspect-square">
                    <img
                      src={img.url}
                      alt={img.label ?? ''}
                      className="h-full w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      disabled={deleting === img.id}
                      aria-label="Excluir foto"
                      className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white active:scale-90 transition-transform disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[uploadKey]?.click()}
                  disabled={isUploading}
                  className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-foreground-subtle active:bg-surface-raised disabled:opacity-50"
                >
                  {isUploading ? <span className="text-xs">...</span> : <Upload size={20} />}
                </button>

                <input
                  ref={(el) => {
                    fileInputRefs.current[uploadKey] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(section.roomId, e.target.files)}
                />
              </div>
            </div>
          );
        })}

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

      {/* Done button */}
      <div className="fixed bottom-0 inset-x-0 bg-background/90 p-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate(`/properties/${id}`)}
          className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white active:bg-action-hover"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}
