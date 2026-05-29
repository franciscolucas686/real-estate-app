import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Home as HomeIcon, AlertCircle, Calendar } from 'lucide-react';
import { useMe, useLogout } from '../hooks/use-auth';
import { useProperties } from '../hooks/use-properties';
import { PropertyAdminCard } from '../components/features/property-admin-card';
import { PropertyAdminCardSkeleton, DashboardStatsSkeleton } from '../components/ui/skeletons';
import { PageContainer } from '../components/ui/page-container';
import { softDeleteProperty, restoreProperty } from '../services/property-service';
import { isPending } from '../utils/format';
import { BusinessType } from '../types/api';
import { BusinessTypeLabel } from '../utils/format';
import { twMerge } from 'tailwind-merge';
import { useQueryClient } from '@tanstack/react-query';

type FilterTab = 'all' | 'SALE' | 'RENT';

interface UndoState {
  propertyId: string;
  timer: ReturnType<typeof setTimeout>;
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useMe();
  const logout = useLogout();
  const [tab, setTab] = useState<FilterTab>('all');
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useProperties({ take: 100 });
  const allProperties = data?.data ?? [];

  // Exclude recently soft-deleted from display
  const visibleProperties = allProperties.filter((p) => !deletedIds.has(p.id));

  const filtered =
    tab === 'all' ? visibleProperties : visibleProperties.filter((p) => p.businessType === tab);

  const totalActive = visibleProperties.filter((p) => !isPending(p)).length;
  const totalPending = visibleProperties.filter(isPending).length;

  const handleDelete = useCallback(
    (id: string) => {
      // Optimistically remove from display
      setDeletedIds((prev) => new Set([...prev, id]));

      // Immediately soft-delete on server
      softDeleteProperty(id).catch(() => {
        // Restore display if server call failed
        setDeletedIds((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      });

      // Set undo timer
      if (undoState) clearTimeout(undoState.timer);
      const timer = setTimeout(() => {
        setUndoState(null);
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      }, 6000);

      setUndoState({ propertyId: id, timer });
    },
    [undoState, queryClient],
  );

  const handleUndo = useCallback(async () => {
    if (!undoState) return;
    clearTimeout(undoState.timer);
    const id = undoState.propertyId;
    setUndoState(null);
    setDeletedIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    try {
      await restoreProperty(id);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch {
      // If restore fails, remove from display permanently
      setDeletedIds((prev) => new Set([...prev, id]));
    }
  }, [undoState, queryClient]);

  async function handleLogout() {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  }

  return (
    <div data-slot="page-dashboard" className="flex min-h-dvh flex-col pb-24">
      {/* Header */}
      <PageContainer withSafeAreaTop className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm text-foreground-subtle">Painel</p>
          <h1 className="text-xl font-bold text-foreground">
            Olá, {user?.name?.split(' ')[0] ?? '—'}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={logout.isPending}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground-subtle active:bg-border"
        >
          <LogOut size={16} />
          Sair
        </button>
      </PageContainer>

      {/* Stats */}
      <PageContainer className="pb-4">
        {isLoading ? (
          <DashboardStatsSkeleton />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<HomeIcon size={20} className="text-action" />}
              value={String(totalActive)}
              label="Ativos"
            />
            <StatCard
              icon={<AlertCircle size={20} className="text-muted-foreground" />}
              value={String(totalPending)}
              label="Pendentes"
            />
            <StatCard
              icon={<Calendar size={20} className="text-accent" />}
              value={String(allProperties.length)}
              label="Total"
            />
          </div>
        )}
      </PageContainer>

      {/* Filter tabs */}
      <PageContainer className="pb-3">
        <div className="inline-flex rounded-full bg-surface p-1">
          {(['all', 'SALE', 'RENT'] as FilterTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={twMerge(
                'rounded-full px-5 py-2 text-sm font-medium transition-all',
                tab === t
                  ? 'bg-surface-raised text-foreground shadow-sm'
                  : 'text-foreground-subtle',
              )}
            >
              {t === 'all' ? 'Todos' : BusinessTypeLabel[t as BusinessType]}
            </button>
          ))}
        </div>
      </PageContainer>

      {/* Property grid */}
      <PageContainer>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <PropertyAdminCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-base font-medium text-foreground">
              Nenhum imóvel cadastrado
            </p>
            <button
              type="button"
              onClick={() => navigate('/properties/new')}
              className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white"
            >
              Cadastrar meu primeiro imóvel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((property) => (
              <PropertyAdminCard key={property.id} property={property} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </PageContainer>

      {/* FAB */}
      <button
        type="button"
        onClick={() => navigate('/properties/new')}
        aria-label="Criar imóvel"
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-action text-white shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </button>

      {/* Undo toast */}
      {undoState && (
        <div className="fixed inset-x-4 bottom-20 z-40 flex items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-lg">
          <span className="text-sm text-white">Imóvel excluído</span>
          <button type="button" onClick={handleUndo} className="text-sm font-semibold text-action">
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  small,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-raised p-4 shadow-sm">
      {icon}
      <span className={twMerge('font-bold text-foreground', small ? 'text-base' : 'text-xl')}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
