import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';

/**
 * `api-client.ts` guarda estado no módulo (a janela de cooldown do refresh), então
 * cada caso precisa de uma instância limpa — daí o `resetModules` + import dinâmico
 * em vez de um import estático no topo.
 */
async function freshClient() {
  vi.resetModules();
  return import('@/shared/api/api-client');
}

let refreshCount = 0;

beforeEach(() => {
  refreshCount = 0;
  server.use(
    http.post('/api/auth/refresh', () => {
      refreshCount += 1;
      return new HttpResponse(null, { status: 401 });
    }),
    http.get('/api/protegido', () =>
      HttpResponse.json({ statusCode: 401, message: 'x', error: 'Unauthorized' }, { status: 401 }),
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('apiFetch — tentativa de refresh em 401', () => {
  it('tenta o refresh uma vez e propaga o erro quando ele falha', async () => {
    const { apiFetch } = await freshClient();

    await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshCount).toBe(1);
  });

  it('não repete o refresh dentro da janela de cooldown', async () => {
    const { apiFetch } = await freshClient();

    // Quatro 401 seguidos — exatamente o padrão que a home anônima produzia, entre
    // o /auth/me do nav e os retries do status-counts. Antes, cada um virava um
    // POST /auth/refresh e o balde de 30/5min por IP estourava com poucos visitantes.
    for (let i = 0; i < 4; i++) {
      await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });
    }

    expect(refreshCount).toBe(1);
  });

  it('volta a tentar depois que o cooldown expira', async () => {
    vi.useFakeTimers();
    const { apiFetch } = await freshClient();

    await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshCount).toBe(1);

    await vi.advanceTimersByTimeAsync(31_000);

    await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshCount).toBe(2);
  });

  it('funde chamadas concorrentes num único refresh', async () => {
    const { apiFetch } = await freshClient();

    const results = await Promise.allSettled([
      apiFetch('/protegido'),
      apiFetch('/protegido'),
      apiFetch('/protegido'),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(refreshCount).toBe(1);
  });

  it('resetRefreshCooldown libera a próxima tentativa — o caso do login logo após navegar anônimo', async () => {
    const { apiFetch, resetRefreshCooldown } = await freshClient();

    await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshCount).toBe(1);

    resetRefreshCooldown();

    await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshCount).toBe(2);
  });

  it('refaz a requisição original quando o refresh funciona', async () => {
    let protegidoCount = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 200 });
      }),
      http.get('/api/protegido', () => {
        protegidoCount += 1;
        return protegidoCount === 1
          ? HttpResponse.json({ statusCode: 401, message: 'x', error: 'e' }, { status: 401 })
          : HttpResponse.json({ ok: true });
      }),
    );

    const { apiFetch } = await freshClient();

    await expect(apiFetch('/protegido')).resolves.toEqual({ ok: true });
    expect(refreshCount).toBe(1);
    expect(protegidoCount).toBe(2);
  });

  // O laço: senha errada com sessão ainda válida. `/auth/login` devolve 401, o refresh
  // devolve 200, a requisição é repetida, o login devolve 401 de novo — e o cooldown,
  // zerado a cada refresh bem-sucedido, não segurava nada. Só parava no teto de 30/5min
  // de POST /auth/refresh, queimando o balde do IP inteiro por causa de um typo.
  it('não tenta refresh quando o 401 vem de /auth/login', async () => {
    let loginCount = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 200 });
      }),
      http.post('/api/auth/login', () => {
        loginCount += 1;
        return HttpResponse.json(
          { statusCode: 401, message: 'Email ou senha inválidos', error: 'Unauthorized' },
          { status: 401 },
        );
      }),
    );

    const { apiFetch } = await freshClient();

    await expect(
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({}) }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(loginCount).toBe(1);
    expect(refreshCount).toBe(0);
  });

  it('tenta o refresh uma vez só, mesmo que a repetição também devolva 401', async () => {
    let protegidoCount = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCount += 1;
        return new HttpResponse(null, { status: 200 });
      }),
      http.get('/api/protegido', () => {
        protegidoCount += 1;
        return HttpResponse.json({ statusCode: 401, message: 'x', error: 'e' }, { status: 401 });
      }),
    );

    const { apiFetch } = await freshClient();

    await expect(apiFetch('/protegido')).rejects.toMatchObject({ statusCode: 401 });

    // Duas chamadas ao recurso (original + uma repetição) e um refresh. Sem o teto, a
    // recursão não tinha fim — cada 401 pedia refresh, que sucedia, que repetia.
    expect(protegidoCount).toBe(2);
    expect(refreshCount).toBe(1);
  });
});
