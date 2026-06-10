import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HelpCircle, Settings } from 'lucide-react';
import { useProperties } from '../hooks/use-properties';
import { usePropertyStatusCounts } from '../hooks/use-property-status-counts';
import { PropertyAdminCard } from '../components/features/property-admin-card';
import { PropertyAdminCardSkeleton } from '../components/ui/skeletons';
import { PageContainer } from '../components/ui/page-container';
import { BottomSheet } from '../components/ui/bottom-sheet';
import { softDeleteProperty, updatePropertyStatus } from '../services/property-service';
import { PropertyStatus } from '../types/api';
import { twMerge } from 'tailwind-merge';
import { useQueryClient } from '@tanstack/react-query';

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | null>(null);
  const [codeSearch, setCodeSearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counts = usePropertyStatusCounts(true);

  const { data, isLoading } = useProperties({
    take: 100,
    ...(statusFilter ? { status: statusFilter } : {}),
  });
  const allProperties = data?.data ?? [];

  // Exclude recently soft-deleted from display
  const visibleProperties = allProperties.filter((p) => !deletedIds.has(p.id));

  const displayProperties = codeSearch.trim()
    ? visibleProperties.filter((p) => p.code.includes(codeSearch.trim()))
    : visibleProperties;

  const handleDelete = useCallback(
    (id: string) => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }

      setDeletedIds((prev) => new Set([...prev, id]));
      setPendingDeleteId(id);

      deleteTimerRef.current = setTimeout(async () => {
        try {
          await softDeleteProperty(id);
          await queryClient.refetchQueries({ queryKey: ['properties'] });
        } catch {
          setDeletedIds((prev) => {
            const s = new Set(prev);
            s.delete(id);
            return s;
          });
        } finally {
          setPendingDeleteId(null);
          deleteTimerRef.current = null;
        }
      }, 6000);
    },
    [queryClient],
  );

  const handleDeactivate = useCallback(
    async (id: string) => {
      try {
        await updatePropertyStatus(id, PropertyStatus.INACTIVE);
        await queryClient.refetchQueries({ queryKey: ['properties'] });
      } catch {
        /* silent */
      }
    },
    [queryClient],
  );

  const handleUndo = useCallback(() => {
    if (!pendingDeleteId || !deleteTimerRef.current) return;
    clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = null;
    setDeletedIds((prev) => {
      const s = new Set(prev);
      s.delete(pendingDeleteId);
      return s;
    });
    setPendingDeleteId(null);
  }, [pendingDeleteId]);

  return (
    <div data-slot="page-dashboard" className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <PageContainer withSafeAreaTop className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex size-10 items-center justify-center rounded-full border border-border text-foreground-subtle active:bg-border"
          >
            <HelpCircle size={20} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex size-10 items-center justify-center rounded-full border border-border text-foreground-subtle active:bg-border"
          >
            <Settings size={20} />
          </button>
        </div>
      </PageContainer>

      {/* Help bottom sheet */}
      <BottomSheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Status dos imóveis">
        <div className="flex flex-col gap-4 px-6 pb-4">
          {[
            { emoji: '🟢', label: 'Ativo', desc: 'Publicado e visível para todos' },
            { emoji: '🩶', label: 'Rascunho', desc: 'Não publicado, sem imagens' },
            { emoji: '🟨', label: 'Pendente', desc: 'Aguardando revisão' },
            { emoji: '⬛', label: 'Inativo', desc: 'Desativado manualmente' },
          ].map(({ emoji, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xl">{emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-foreground-subtle">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Status cards */}
      <PageContainer className="pb-4">
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { key: 'ACTIVE', label: 'Ativos', color: 'text-emerald-500' },
              { key: 'DRAFT', label: 'Rascunhos', color: 'text-muted-foreground' },
              { key: 'PENDING', label: 'Pendentes', color: 'text-amber-500' },
              { key: 'INACTIVE', label: 'Inativos', color: 'text-foreground-subtle' },
            ] as const
          ).map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={twMerge(
                'flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors',
                statusFilter === key
                  ? 'border-action bg-action/10'
                  : 'border-border bg-surface-raised',
              )}
            >
              <span className={twMerge('text-xl font-bold', color)}>{counts[key]}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </PageContainer>

      {/* Total stats */}
      <PageContainer className="pb-3">
        <div className="rounded-2xl border border-border bg-surface-raised px-4 py-3">
          <p className="text-xs text-muted-foreground">Total de imóveis</p>
          <p className="text-2xl font-bold text-foreground">
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </p>
        </div>
      </PageContainer>

      {/* Code search */}
      <PageContainer className="pb-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Buscar por código (ex: 575301)"
          value={codeSearch}
          onChange={(e) => setCodeSearch(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
        />
      </PageContainer>

      {/* Property grid */}
      <PageContainer>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <PropertyAdminCardSkeleton key={i} />
            ))}
          </div>
        ) : displayProperties.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-base font-medium text-foreground">
              {codeSearch.trim()
                ? 'Nenhum imóvel encontrado com esse código'
                : 'Nenhum imóvel cadastrado'}
            </p>
            {!codeSearch.trim() && (
              <button
                type="button"
                onClick={() => navigate('/properties/new')}
                className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white"
              >
                Cadastrar meu primeiro imóvel
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayProperties.map((property) => (
              <PropertyAdminCard
                key={property.id}
                property={property}
                onDelete={handleDelete}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* FAB */}
      <button
        type="button"
        onClick={() => navigate('/properties/new')}
        aria-label="Criar imóvel"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+100px)] right-8 z-30 flex size-18 items-center justify-center rounded-full bg-action text-white shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={32} />
      </button>

      {/* Undo toast */}
      {pendingDeleteId && (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] z-40 flex items-center justify-between gap-3 rounded-full bg-foreground px-2 mb-4 shadow-lg">
          <span className="text-2xl ml-4 text-white">Imóvel excluído</span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-xl p-4 font-semibold text-action"
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}
