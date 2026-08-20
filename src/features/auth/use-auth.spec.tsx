import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { useMe } from '@/features/auth/use-auth';

/**
 * Regressão de uma rajada que já foi reportada em produção: `GET /auth/me` e
 * `POST /auth/refresh` repetindo indefinidamente com ninguém logado.
 *
 * A causa era o 401 ser modelado como **erro**. No React Query um erro não tem `data`, e
 * `isStaleByTime` devolve `true` de saída quando `data` é `undefined` — sem consultar o
 * `staleTime`. A query do visitante anônimo ficava permanentemente stale, então
 * `refetchOnMount` e `refetchOnWindowFocus` a refaziam a cada observer novo e a cada volta
 * para a aba, e `apiFetch` pendurava um `POST /auth/refresh` em cada 401.
 *
 * Estes testes olham para o **número de requisições**, não para o estado renderizado, porque
 * era exatamente aí que o defeito vivia: a tela ficava correta o tempo todo.
 */

let meCount = 0;
let refreshCount = 0;

// `Response`, e não `HttpResponse`: este último é genérico e os dois call sites devolvem corpos
// de tipos diferentes (o `null` do anônimo e o vazio do 401). `HttpResponse` estende `Response`.
function countingHandlers(response: () => Response) {
  meCount = 0;
  refreshCount = 0;
  server.use(
    http.get('/api/auth/me', () => {
      meCount += 1;
      return response();
    }),
    http.post('/api/auth/refresh', () => {
      refreshCount += 1;
      return new HttpResponse(null, { status: 401 });
    }),
  );
}

/** Dois observers da mesma chave, como o nav e a ficha de imóvel montam numa página pública. */
function TwoObservers() {
  const a = useMe();
  const b = useMe();
  return <p>{a.isPending || b.isPending ? 'carregando' : 'resolvido'}</p>;
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    // Espelha `main.tsx`: 4xx não é retentado. Deixar o default de 3 aqui esconderia o
    // defeito, porque as repetições viriam do retry e não do que se quer medir.
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  focusManager.setFocused(undefined);
});

describe('useMe — visitante anônimo', () => {
  it('pergunta pela sessão uma vez só, mesmo com dois observers montados', async () => {
    countingHandlers(() => HttpResponse.json(null));

    renderWithClient(<TwoObservers />);

    expect(await screen.findByText('resolvido')).toBeInTheDocument();
    expect(meCount).toBe(1);
  });

  it('não refaz a chamada quando a aba recebe foco de novo', async () => {
    countingHandlers(() => HttpResponse.json(null));

    renderWithClient(<TwoObservers />);
    expect(await screen.findByText('resolvido')).toBeInTheDocument();
    expect(meCount).toBe(1);

    // O ciclo que o usuário faz sem pensar: sair da aba e voltar. Era aqui que a rajada
    // reaparecia, porque uma query sem `data` é stale para sempre.
    focusManager.setFocused(false);
    focusManager.setFocused(true);

    // Espera de verdade em vez de assumir: um refetch sairia neste intervalo.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(meCount).toBe(1);
  });

  it('não dispara refresh nenhum: o 200 com null não é um 401', async () => {
    countingHandlers(() => HttpResponse.json(null));

    renderWithClient(<TwoObservers />);
    expect(await screen.findByText('resolvido')).toBeInTheDocument();

    expect(refreshCount).toBe(0);
  });

  it('um 401 vira `null` como data, e não estado de erro', async () => {
    // O caso que sobra depois da rota virar auth-aware: cookie de refresh expirado, onde a
    // API responde 401 de propósito para o cliente tentar renovar, e a renovação falha.
    countingHandlers(() => new HttpResponse(null, { status: 401 }));

    renderWithClient(<TwoObservers />);

    expect(await screen.findByText('resolvido')).toBeInTheDocument();
    // Uma tentativa de refresh é o correto aqui — o cliente não tinha como saber que falharia.
    await waitFor(() => expect(refreshCount).toBe(1));

    // O que não pode acontecer é a query ficar em erro: seria a rajada de volta.
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(meCount).toBe(1);
  });
});
