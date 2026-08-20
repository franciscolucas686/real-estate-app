import { useQuery } from '@tanstack/react-query';
import { fetchTrash } from '@/features/properties/api/property-service';
import { propertyKeys } from '@/features/properties/query-keys';

/**
 * Imóveis na lixeira. `staleTime` curto porque a tela existe para desfazer um engano
 * recente — ver uma lista velha aqui é pior do que uma requisição a mais.
 *
 * `take` é parâmetro, não default herdado: a página calcula `skip` a partir do próprio
 * tamanho de página, e deixar o tamanho implícito nos dois lados fazia a paginação
 * depender de dois números concordarem sem que nada os ligasse. Entra também na chave
 * da query, ou trocar o tamanho serviria a página anterior do cache.
 */
export function useTrash(skip = 0, take = 20) {
  return useQuery({
    queryKey: propertyKeys.trash(skip, take),
    queryFn: () => fetchTrash(skip, take),
    staleTime: 30_000,
  });
}
