import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HelpCircle, Plus, Search as SearchIcon, Settings } from 'lucide-react';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { usePropertyStatusCounts } from '@/features/properties/hooks/use-property-status-counts';
import {
  useSoftDeleteProperty,
  useUpdatePropertyStatus,
} from '@/features/properties/hooks/use-property-mutations';
import { useMe } from '@/features/auth/use-auth';
import { PropertyAdminCard } from '@/features/properties/components/property-admin-card';
import {
  DashboardStatsSkeleton,
  PropertyAdminCardSkeleton,
} from '@/features/properties/components/property-skeletons';
import { PageContainer } from '@/layout/page-container';
import { Modal } from '@/ui/modal';
import { Button } from '@/ui/button';
import { NumericInput } from '@/ui/numeric-input';
import { Pagination } from '@/ui/pagination';
import { PropertyStatus } from '@/shared/api/types';
import { cn } from '@/shared/cn';

/**
 * One page size for every viewport.
 *
 * This used to be `isDesktop ? 12 : 100`, which was three defects wearing one line:
 * the query key changed with the viewport (so resizing refetched and duplicated cache
 * entries), mobile downloaded a hundred records to filter one in the browser, and the
 * pagination control was `hidden md:flex` — a mobile user literally could not reach
 * page 2.
 */
const PAGE_SIZE = 12;

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Space reserved at the bottom of the page for the things floating over it on mobile.
 *
 * Derived, not eyeballed. The console's bottom nav (`layout/console-shell.tsx`) measures
 * 78px — `pt-2` + a 54px item + its own `pb-4` — *plus* `env(safe-area-inset-bottom)`, and
 * this page's FAB sits 88px above that same inset at `size-16`, putting its top edge at
 * 152px. Both are `position: fixed`, so neither takes part in layout and the page has to
 * account for them itself.
 *
 * It was a flat `pb-28` (112px), which cleared the nav on a device with no inset and
 * nothing else: on a notched phone the 34px inset pushed the nav to 112px exactly, hiding
 * the last row of cards and all of `Pagination` behind it. From `md` up both the nav and
 * the FAB are gone, so the reserve collapses to ordinary breathing room.
 */
const BOTTOM_RESERVE =
  'flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom,0px)+152px)] md:min-h-full md:pb-10';

const STATS = [
  {
    key: null,
    label: 'Total',
    desc: 'Todos os imóveis',
    card: 'border-border bg-surface-raised',
    labelColor: 'text-foreground-subtle',
    valueColor: 'text-foreground',
  },
  {
    key: PropertyStatus.ACTIVE,
    label: 'Ativos',
    desc: 'Publicados e visíveis',
    card: 'border-success/25 bg-success-subtle',
    labelColor: 'text-success',
    valueColor: 'text-success',
  },
  {
    key: PropertyStatus.PENDING,
    label: 'Pendentes',
    // Says what to *do*, not just what the label means: PENDING is derived from photo
    // count, so it's an actionable task rather than a passive state.
    desc: 'Sem fotos — envie a 1ª para publicar',
    card: 'border-warning/25 bg-warning-subtle',
    labelColor: 'text-warning',
    valueColor: 'text-warning',
  },
  {
    key: PropertyStatus.INACTIVE,
    label: 'Inativos',
    desc: 'Desativados manualmente',
    card: 'border-neutral/25 bg-neutral-subtle',
    labelColor: 'text-neutral',
    valueColor: 'text-neutral',
  },
] as const;

const STATUS_LEGEND = [
  { tone: 'bg-success', label: 'Ativo', desc: 'Publicado e visível para todos' },
  {
    tone: 'bg-warning',
    label: 'Pendente',
    desc: 'Sem fotos. Ativado automaticamente ao adicionar a primeira foto',
  },
  {
    tone: 'bg-neutral',
    label: 'Inativo',
    desc: 'Desativado manualmente. Restaure para voltar ao fluxo automático',
  },
];

function StatusLegend() {
  return (
    <dl className="flex flex-col gap-4 px-6 pb-4 md:px-0">
      {STATUS_LEGEND.map(({ tone, label, desc }) => (
        <div key={label} className="flex items-start gap-4">
          <span className={cn('mt-1.5 size-3 shrink-0 rounded-full', tone)} aria-hidden="true" />
          <div>
            <dt className="text-sm font-semibold text-foreground">{label}</dt>
            <dd className="text-xs text-foreground-subtle">{desc}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function Dashboard() {
  const [helpOpen, setHelpOpen] = useState(false);

  /**
   * Status filter, search and page live in the URL.
   *
   * That makes the operator's working view survive a reload and a back button — they
   * come back to "pending properties, page 2", not to a reset list. It also removes the
   * "adjusting state during render" block that reset the page whenever a filter changed:
   * writing the filter simply drops `page` from the query.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseStatus(searchParams.get('status'));
  const codeSearch = parseCode(searchParams.get('code'));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const setParam = useCallback(
    (
      updates: Record<string, string | null>,
      options?: { resetPage?: boolean; replace?: boolean },
    ) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          });
          if (options?.resetPage) next.delete('page');
          return next;
        },
        // Changing a filter replaces; paging pushes, so Back returns to the previous page.
        // `replace` is separate so the out-of-range correction below can replace without
        // also being a page reset.
        { replace: options?.replace ?? options?.resetPage ?? false },
      );
    },
    [setSearchParams],
  );

  // Local mirror of the search box so typing stays responsive, committed to the URL after
  // a pause. Without the debounce every character is a history write and a new query key.
  const [codeDraft, setCodeDraft] = useState(codeSearch);
  const [lastAdoptedCode, setLastAdoptedCode] = useState(codeSearch);
  if (codeSearch !== lastAdoptedCode) {
    setLastAdoptedCode(codeSearch);
    setCodeDraft(codeSearch);
  }
  useEffect(() => {
    if (codeDraft === codeSearch) return;
    const timer = setTimeout(
      () => setParam({ code: codeDraft }, { resetPage: true }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [codeDraft, codeSearch, setParam]);

  const { data: user } = useMe();
  const firstName = user?.name.split(' ')[0] ?? '';

  const { counts, isLoading: countsLoading } = usePropertyStatusCounts(true);

  const { data, isLoading, isError, refetch } = useProperties({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    ...(statusFilter ? { status: statusFilter } : {}),
    // Always server-side. It used to be server-side on desktop and a client-side
    // `includes()` over the batch of 100 on mobile — the same control behaving
    // differently depending on the device.
    ...(codeSearch ? { code: codeSearch } : {}),
  });

  const properties = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /**
   * `page` lives in the URL, so a bookmark can arrive already out of range — "pending
   * properties, page 9", opened after the queue was worked down. No filter changed, so
   * `resetPage` never fires, and nothing on screen recovers: the grid is empty while the
   * heading still counts the real total, and `Pagination` renders nothing at
   * `totalPages <= 1`, leaving no control to click.
   *
   * Gated on `data` rather than on `total`, because `total` falls back to `0` while a query
   * is in flight — reading it too early would compute `totalPages === 1` and "correct" a
   * perfectly valid page mid-load. `replace` because a broken offset is not a place the back
   * button should return to.
   */
  useEffect(() => {
    if (!data || page <= totalPages) return;
    setParam({ page: totalPages === 1 ? null : String(totalPages) }, { replace: true });
  }, [data, page, totalPages, setParam]);

  const deleteProperty = useSoftDeleteProperty();
  const changeStatus = useUpdatePropertyStatus();

  const handleDelete = useCallback((id: string) => deleteProperty.mutate(id), [deleteProperty]);
  const handleActivate = useCallback(
    (id: string) => changeStatus.mutate({ id, status: PropertyStatus.ACTIVE }),
    [changeStatus],
  );
  const handleDeactivate = useCallback(
    (id: string) => changeStatus.mutate({ id, status: PropertyStatus.INACTIVE }),
    [changeStatus],
  );

  /** Which card, if any, has a write in flight. v5 exposes `variables` while pending. */
  const pendingId =
    (deleteProperty.isPending ? deleteProperty.variables : undefined) ??
    (changeStatus.isPending ? changeStatus.variables?.id : undefined);

  const hasFilter = Boolean(statusFilter) || Boolean(codeSearch.trim());

  return (
    <div data-slot="page-dashboard" className={BOTTOM_RESERVE}>
      <PageContainer
        withSafeAreaTop
        maxWidth="wide"
        className="flex flex-wrap items-center justify-between gap-3 py-4"
      >
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-foreground">Olá, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o desempenho dos seus imóveis</p>
        </div>

        <div className="flex items-center gap-2">
          {/* asChild keeps link semantics: this navigates, so it must be an <a href>. */}
          <Button
            asChild
            variant="primary"
            size="sm"
            shape="pill"
            className="hidden md:inline-flex"
          >
            <Link to="/properties/new">
              <Plus size={18} aria-hidden="true" />
              Novo imóvel
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            shape="pill"
            onClick={() => setHelpOpen(true)}
            aria-label="O que significam os status"
          >
            <HelpCircle size={24} aria-hidden="true" />
          </Button>
          <Button asChild variant="outline" size="icon" shape="pill">
            <Link to="/settings" aria-label="Configurações">
              <Settings size={24} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </PageContainer>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Status dos imóveis">
        <StatusLegend />
      </Modal>

      {/* Status tallies double as the status filter — the number and the way to act on it
          are the same control, so there is no separate filter UI to keep in sync. */}
      <PageContainer maxWidth="wide" className="pb-4">
        {countsLoading || !counts ? (
          <DashboardStatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-4">
            {STATS.map(({ key, label, desc, card, labelColor, valueColor }) => {
              // `counts` é parcial no tipo porque a rota é auth-aware (anônimo só
              // recebe ACTIVE). Aqui sempre há sessão, então os três vêm — o `?? 0`
              // é só o que o tipo exige, não um caso real deste painel.
              const value =
                key === null
                  ? Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)
                  : (counts[key] ?? 0);
              const selected = statusFilter === key;

              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setParam({ status: selected ? null : key }, { resetPage: true })}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors md:gap-2 md:p-5',
                    card,
                    selected && 'ring-2 ring-action',
                  )}
                >
                  <span className={cn('text-2xl font-bold md:text-3xl', valueColor)}>{value}</span>
                  <span
                    className={cn('text-xs font-semibold leading-tight md:text-sm', labelColor)}
                  >
                    {label}
                  </span>
                  <span className="text-2xs leading-tight text-muted-foreground md:text-xs">
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PageContainer>

      <PageContainer
        maxWidth="wide"
        className="flex flex-wrap items-center justify-between gap-3 pb-3"
      >
        <h2 className="text-xl font-bold text-foreground">
          Meus imóveis{' '}
          {!isLoading && !isError && (
            <span className="text-sm font-medium text-muted-foreground">
              ({total} {total === 1 ? 'imóvel' : 'imóveis'})
            </span>
          )}
        </h2>

        <div className="relative w-full md:w-auto">
          <SearchIcon
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <NumericInput
            type="search"
            aria-label="Buscar por código"
            placeholder="Buscar por código (ex: 575301)"
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
            className="w-full pl-11 md:w-80"
          />
        </div>
      </PageContainer>

      <PageContainer maxWidth="wide">
        {isLoading ? (
          // As many skeletons as the page will hold, so the grid doesn't jump when the
          // real cards arrive.
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <PropertyAdminCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-base font-medium text-foreground">
              Não foi possível carregar seus imóveis
            </p>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              A conexão com o servidor falhou. Seus filtros foram mantidos.
            </p>
            <Button shape="pill" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-base font-medium text-foreground">{emptyMessage()}</p>
            {hasFilter ? (
              <Button
                variant="secondary"
                shape="pill"
                onClick={() => setParam({ status: null, code: null }, { resetPage: true })}
              >
                Limpar filtro
              </Button>
            ) : (
              <Button asChild shape="pill">
                <Link to="/properties/new">Cadastrar meu primeiro imóvel</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {properties.map((property) => (
              <PropertyAdminCard
                key={property.id}
                property={property}
                onDelete={handleDelete}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                isPending={pendingId === property.id}
              />
            ))}
          </div>
        )}

        {/* Visible at every width. It was `hidden md:flex`, which combined with
            `take: 100` on mobile meant the phone silently capped at 100 properties. */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(next) => setParam({ page: next === 1 ? null : String(next) })}
          className="pt-6"
        />
      </PageContainer>

      {/* Mobile equivalent of the header's "Novo imóvel". */}
      <Button
        asChild
        size="icon-lg"
        shape="pill"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-6 z-(--z-nav) shadow-lg md:hidden"
      >
        <Link to="/properties/new" aria-label="Criar imóvel">
          <Plus size={28} aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );

  function emptyMessage() {
    if (codeSearch) return 'Nenhum imóvel com esse código';
    if (statusFilter === PropertyStatus.ACTIVE) return 'Nenhum imóvel ativo';
    if (statusFilter === PropertyStatus.PENDING) return 'Nenhum imóvel pendente';
    if (statusFilter === PropertyStatus.INACTIVE) return 'Nenhum imóvel inativo';
    return 'Nenhum imóvel cadastrado';
  }
}

/**
 * Só dígitos chegam à busca: `NumericInput` não deixa digitar outra coisa, e um `?code=`
 * editado à mão não pode afirmar o contrário — o valor é adotado no campo durante o
 * render, então ele exibiria algo que o próprio campo não consegue produzir. Um valor
 * inválido é ignorado, não limpo para os dígitos: buscar por `575` porque alguém mandou
 * `57a5` fabrica uma consulta que ninguém pediu. Mesma regra do `code` em
 * `features/filters/filter-params.ts`.
 */
function parseCode(value: string | null): string {
  const trimmed = value?.trim() ?? '';
  return /^\d*$/.test(trimmed) ? trimmed : '';
}

/** Narrows an arbitrary query-string value to a status, or null. */
function parseStatus(value: string | null): PropertyStatus | null {
  const statuses = Object.values(PropertyStatus) as string[];
  return value && statuses.includes(value) ? (value as PropertyStatus) : null;
}
