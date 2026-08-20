import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react';
import { useTrash } from '@/features/properties/hooks/use-trash';
import { useRestoreProperty } from '@/features/properties/hooks/use-property-mutations';
import { PropertyAdminCardSkeleton } from '@/features/properties/components/property-skeletons';
import { PageContainer } from '@/layout/page-container';
import { Button } from '@/ui/button';
import { Pagination } from '@/ui/pagination';
import { formatPrice } from '@/shared/format';
import { imageUrl } from '@/shared/image-url';
import type { PropertyCardDto } from '@/shared/api/types';

/** Espelha os 30 dias do `PropertyCleanupService` do backend. */
const RETENTION_DAYS = 30;
const PAGE_SIZE = 20;

/**
 * Quantos dias restam até o job noturno apagar o imóvel em definitivo, junto com as
 * fotos no R2. Zero significa "sai na próxima execução", não "já saiu".
 */
function daysLeft(deletedAt: string): number {
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed));
}

function retentionLabel(deletedAt: string | null): string {
  if (!deletedAt) return '';
  const dias = daysLeft(deletedAt);
  if (dias === 0) return 'Some hoje';
  if (dias === 1) return 'Some em 1 dia';
  return `Some em ${dias} dias`;
}

function TrashRow({
  property,
  onRestore,
  isPending,
}: {
  property: PropertyCardDto;
  onRestore: (id: string) => void;
  isPending: boolean;
}) {
  const preview = property.previewImages[0];
  const dias = property.deletedAt ? daysLeft(property.deletedAt) : RETENTION_DAYS;
  // Uma semana é quando o aviso deixa de ser informação e passa a ser urgência.
  const urgente = dias <= 7;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border p-3">
      {preview ? (
        <img
          src={imageUrl(preview.url, 'thumb')}
          alt=""
          className="size-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
          <Trash2 size={20} className="text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {property.neighborhood}, {property.city}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Cód. {property.code} · {formatPrice(property.price ?? property.rentPrice)}
        </p>
        <p
          className={
            urgente
              ? 'mt-0.5 text-xs font-medium text-danger'
              : 'mt-0.5 text-xs text-muted-foreground'
          }
        >
          {retentionLabel(property.deletedAt)}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        shape="pill"
        onClick={() => onRestore(property.id)}
        disabled={isPending}
        className="shrink-0"
      >
        <RotateCcw size={16} aria-hidden="true" />
        {isPending ? 'Restaurando...' : 'Restaurar'}
      </Button>
    </li>
  );
}

export function Trash() {
  /**
   * A página vive na URL, como no dashboard. Além de deixar o endereço compartilhável
   * e o botão Voltar coerente, é o que torna a correção de página fora de faixa abaixo
   * uma escrita no roteador em vez de um `setState` dentro de efeito — que é
   * exatamente o que o `react-hooks/set-state-in-effect` proíbe, com razão.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const goToPage = useCallback(
    (next: number, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next <= 1) params.delete('page');
          else params.set('page', String(next));
          return params;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  const { data, isLoading, isError, refetch } = useTrash((page - 1) * PAGE_SIZE, PAGE_SIZE);
  const restore = useRestoreProperty();

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /**
   * Restaurar o último item de uma página a esvazia, e aí a paginação apontaria para
   * uma página que não existe mais — tela vazia, sem controle para voltar, porque
   * `Pagination` não renderiza nada com `totalPages <= 1`.
   *
   * Mesma correção que o dashboard faz, e pelo mesmo motivo o gate é `data` e não
   * `total`: `total` cai para 0 enquanto a query está em voo, e ler cedo demais
   * "corrigiria" uma página válida no meio do carregamento. `replace` porque um
   * offset quebrado não é um lugar para onde voltar.
   */
  useEffect(() => {
    if (!data || page <= totalPages) return;
    goToPage(totalPages, { replace: true });
  }, [data, page, totalPages, goToPage]);

  return (
    <div>
      <PageContainer withSafeAreaTop maxWidth="wide" className="py-4">
        <div className="mb-1 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" shape="pill">
            <Link to="/dashboard" aria-label="Voltar para o painel">
              <ChevronLeft size={24} aria-hidden="true" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Lixeira</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Imóveis excluídos ficam aqui por {RETENTION_DAYS} dias e depois são apagados em
          definitivo, junto com as fotos.
        </p>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <PropertyAdminCardSkeleton />
            <PropertyAdminCardSkeleton />
          </div>
        ) : isError ? (
          /* Sem este ramo uma falha de rede era indistinguível de lixeira vazia: o
             `total` cai para 0 e a tela dizia "A lixeira está vazia" — a mensagem mais
             tranquilizadora possível na hora em que o operador procura o que apagou
             por engano. Mesmo tratamento que o dashboard já dá à sua listagem. */
          <div role="alert" className="flex flex-col items-center gap-4 py-16">
            <p className="text-center text-base font-medium text-foreground">
              Não foi possível carregar a lixeira
            </p>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              A conexão com o servidor falhou. Nenhum imóvel foi apagado.
            </p>
            <Button shape="pill" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Trash2 size={40} className="text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">A lixeira está vazia.</p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {data?.data.map((property) => (
                <TrashRow
                  key={property.id}
                  property={property}
                  onRestore={(id) => restore.mutate(id)}
                  isPending={restore.isPending && restore.variables === property.id}
                />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
              </div>
            )}
          </>
        )}
      </PageContainer>
    </div>
  );
}
