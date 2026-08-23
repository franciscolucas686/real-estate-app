import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { PropertyForm } from '@/pages/property-form';
import { renderWithProviders } from '@/test/render';
import { server } from '@/mocks/server';
import { setMockProperty } from '@/mocks/handlers';
import { BusinessType, PropertyStatus, PropertyType, SaleType } from '@/shared/api/types';
import type { PropertyDetailDto } from '@/shared/api/types';

function renderNewPropertyForm() {
  return renderWithProviders(<PropertyForm />, { route: '/properties/new' });
}

function renderEditPropertyForm(id = 'prop-1') {
  return renderWithProviders(<PropertyForm />, {
    route: `/properties/${id}/edit`,
    path: '/properties/:id/edit',
  });
}

/** Um imóvel completo o bastante para o modo edição hidratar os três passos. */
const EXISTING: PropertyDetailDto = {
  id: 'prop-1',
  code: '575301',
  type: PropertyType.LAND,
  businessType: BusinessType.SALE,
  status: PropertyStatus.ACTIVE,
  saleTypes: [{ id: 'st-1', type: SaleType.DIRECT }],
  price: '450000.00',
  rentPrice: null,
  condoFee: null,
  city: 'Sorocaba',
  state: 'SP',
  neighborhood: 'Campolim',
  description: 'Terreno plano em ótima localização, pronto para construir.',
  totalArea: 500,
  builtArea: null,
  bedrooms: null,
  bathrooms: null,
  suites: null,
  parkingSpaces: null,
  gallery: { rooms: [], unassigned: [] },
  details: { zoning: 'RESIDENTIAL', topography: 'FLAT' } as PropertyDetailDto['details'],
  whatsappContact: null,
  owner: { name: 'Maria Silva', phone: '11987654321' },
  location: null,
  userId: 'user-1',
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z',
};

/** Passos 1 e 2 de um LAND/SALE válido, que é o caminho mais curto até o passo 3. */
/**
 * Os dados do proprietário são obrigatórios e vivem no fim da etapa 1, então todo teste que
 * precisa **passar** dela tem de preenchê-los — inclusive os que investigam outra regra.
 */
async function fillOwner(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Ex: Maria Silva'), 'Maria Silva');
  await user.type(screen.getByPlaceholderText('Ex: (15) 99999-9999'), '11987654321');
}

async function fillLandThroughStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
  await user.click(screen.getByRole('button', { name: 'Venda' }));
  await user.click(screen.getByRole('button', { name: 'Venda direta' }));
  await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
  await fillOwner(user);
  await user.click(screen.getByRole('button', { name: 'Continuar' }));

  await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
  await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
  await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('PropertyForm — step 1 validation blocks navigation', () => {
  it('shows the first Zod error and stays on step 1 when nothing is filled', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Selecione o tipo do imóvel.')).toBeInTheDocument();
    // Still step 1 — the city field (step 2) shouldn't be in the document.
    expect(screen.queryByPlaceholderText('Ex: Sorocaba')).not.toBeInTheDocument();
  });

  it('rejects a SALE property with no sale modality selected', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Selecione ao menos uma modalidade de venda.'),
    ).toBeInTheDocument();
  });
});

describe("PropertyForm — LAND hides fields that don't apply to a lot", () => {
  it('hides Quartos/Banheiros/Suítes/Vagas/Área construída on step 3, keeping Área total visible', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Área total (m²) *')).toBeInTheDocument();
    expect(screen.queryByText('Quartos')).not.toBeInTheDocument();
    expect(screen.queryByText('Banheiros')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Suítes/)).not.toBeInTheDocument();
    expect(screen.queryByText('Vagas')).not.toBeInTheDocument();
    expect(screen.queryByText('Área construída (m²)')).not.toBeInTheDocument();
  });

  it('clears bedrooms/builtArea filled under HOUSE when the type is switched to LAND', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    // Step 1 — HOUSE
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'HOUSE');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 2
    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 3 — fill bedrooms and builtArea for the HOUSE.
    // By label, not by position. These were `findAllByPlaceholderText('0')[0]` and `[5]`,
    // which meant reordering or adding a numeric field silently retargeted the assertion —
    // the single biggest reason this 1300-line file was risky to refactor.
    await user.type(await screen.findByLabelText('Quartos'), '3');
    await user.type(screen.getByLabelText('Área construída (m²)'), '120');
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();

    // Back to step 1 and switch the type to LAND
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');

    // Forward again to step 3
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Área total (m²) *')).toBeInTheDocument();
    expect(screen.queryByText('Quartos')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('3')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('120')).not.toBeInTheDocument();
  });
});

/**
 * As regras condicionais do `superRefine` são o núcleo do wizard e cada uma vale para uma
 * combinação de tipo e negócio. `property.schema.spec.ts` já as cobre contra o schema
 * direto; o que se afirma aqui é que a mensagem **chega à tela e barra a navegação** — o
 * caminho entre o schema e o `errorBanner` passa por `safeParse(getValues())` e por
 * `firstStepError`, que é lógica só do componente.
 */
describe('PropertyForm — regras condicionais chegam à tela', () => {
  it('RENT sem valor de aluguel não avança', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Aluguel' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Informe o valor do aluguel.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Ex: Sorocaba')).not.toBeInTheDocument();
  });

  it('condomínio acima do preço não avança', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '100000');
    await user.type(screen.getByPlaceholderText('Ex: R$ 800'), '200000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('O valor do condomínio não pode ser maior que o preço.'),
    ).toBeInTheDocument();
  });

  it('o passo 2 barra a navegação com estado inválido', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    // Uma letra só. O regex de maiúsculas do schema é inalcançável pela UI — o campo faz
    // `.toUpperCase()` no onChange — então o que dá para exercer daqui é o `.length(2)`.
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'S');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Estado deve ter 2 letras (ex: SP).')).toBeInTheDocument();
    expect(screen.queryByLabelText('Área total (m²) *')).not.toBeInTheDocument();
  });

  /**
   * A UI **impede** o estado inválido em vez de deixá-lo chegar ao schema: o `onChange` de
   * suítes trava no número de banheiros, e o rótulo passa a anunciar o teto. A regra
   * equivalente no `superRefine` é rede para dado hidratado, e `property.schema.spec.ts` já
   * a cobre direto — daqui o que dá para afirmar, e o que ninguém afirmava, é o travamento.
   */
  it('suítes trava no número de banheiros', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'HOUSE');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(await screen.findByLabelText('Banheiros'), '2');
    // O rótulo passa a anunciar o teto assim que há banheiros.
    const suites = screen.getByLabelText('Suítes (máx 2)');

    await user.type(suites, '5');
    expect(suites).toHaveValue(2);

    // E o teto acompanha uma redução no número de banheiros.
    await user.clear(screen.getByLabelText('Banheiros'));
    await user.type(screen.getByLabelText('Banheiros'), '1');
    await user.type(screen.getByLabelText('Suítes (máx 1)'), '4');
    expect(screen.getByLabelText('Suítes (máx 1)')).toHaveValue(1);
  });
});

/**
 * O modo edição não tinha nenhuma cobertura, e é o caminho que mais muda quando a escrita
 * migra para `useMutation`: outro verbo, outra navegação de saída, e é ele que hoje salva
 * sem invalidar o cache. Estes dois testes são a rede desse passo.
 */
describe('PropertyForm — modo edição', () => {
  it('hidrata os três passos a partir do imóvel existente', async () => {
    const user = userEvent.setup();
    setMockProperty(EXISTING);
    renderEditPropertyForm();

    // Passo 1 já vem preenchido — e o rótulo do envio muda de "Criar" para "Salvar".
    expect(await screen.findByDisplayValue('R$ 450.000')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de imóvel *')).toHaveValue('LAND');
    // O preço só existe quando o negócio é venda, então vê-lo preenchido já prova que o
    // `businessType` hidratou. O botão "Venda" não expõe estado — ver a nota no relatório.
    expect(screen.getByRole('button', { name: 'Venda direta' })).toBeInTheDocument();
    // O proprietário hidrata do `owner` aninhado da resposta, e o telefone volta formatado
    // — o formulário guarda dígitos e exibe máscara, como o campo da imobiliária em settings.
    expect(screen.getByDisplayValue('Maria Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(11) 98765-4321')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByDisplayValue('Sorocaba')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Campolim')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });

  it('salva com PATCH e sai da tela', async () => {
    const user = userEvent.setup();
    setMockProperty(EXISTING);

    let patched: unknown = null;
    server.use(
      http.patch('/api/properties/:id', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...EXISTING, description: 'x' });
      }),
    );

    renderEditPropertyForm();
    await screen.findByDisplayValue('R$ 450.000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(patched).not.toBeNull());
    // A splash de sucesso aparece antes da navegação de saída — mesmo padrão visual
    // da criação — e só depois dela é que o botão de envio se desmonta.
    expect(await screen.findByText('Imóvel atualizado!')).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          screen.queryByRole('button', { name: /Salvar alterações|Salvando/ }),
        ).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  /**
   * Campo vazio num PATCH tem de viajar como `null`, não ser omitido.
   *
   * O payload de edição era o mesmo da criação, que descarta o que está vazio — e
   * `PATCH` lê ausência como "mantenha o que está lá". Efeito prático: apagar a taxa de
   * condomínio (ou os quartos, ou a área construída) salvava sem erro e devolvia o
   * valor antigo no recarregamento. O `rentPrice` entra na mesma asserção porque este
   * imóvel é de venda: a coluna do outro tipo de negócio precisa ser limpa, ou a
   * ordenação por preço passa a ler um valor que não vale mais.
   */
  it('esvaziar um campo manda null explícito, não omite a chave', async () => {
    const user = userEvent.setup();
    setMockProperty(EXISTING);

    let patched: Record<string, unknown> | null = null;
    server.use(
      http.patch('/api/properties/:id', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(EXISTING);
      }),
    );

    renderEditPropertyForm();
    await screen.findByDisplayValue('R$ 450.000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched).toMatchObject({
      condoFee: null,
      bedrooms: null,
      bathrooms: null,
      suites: null,
      parkingSpaces: null,
      builtArea: null,
      rentPrice: null,
      // O que está preenchido continua indo com valor.
      price: '450000.00',
      totalArea: 500,
      // Obrigatórios, então nunca viajam como null — não são campos "esvaziáveis".
      ownerName: 'Maria Silva',
      ownerPhone: '11987654321',
    });
  });

  /**
   * Um imóvel anterior à migração chega com `owner: null`, e é o formulário que faz o
   * backfill: sem os dois campos preenchidos a etapa 1 não avança, então não há como salvar
   * uma edição que deixe o imóvel sem dono.
   */
  it('um imóvel sem proprietário não passa da etapa 1 até ser preenchido', async () => {
    const user = userEvent.setup();
    setMockProperty({ ...EXISTING, owner: null });
    renderEditPropertyForm();

    await screen.findByDisplayValue('R$ 450.000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Informe o nome do proprietário.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Sorocaba')).not.toBeInTheDocument();

    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByDisplayValue('Sorocaba')).toBeInTheDocument();
  });
});

describe('PropertyForm — payload de criação', () => {
  it('leva o proprietário no corpo do POST', async () => {
    const user = userEvent.setup();

    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post('/api/properties', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...EXISTING, id: 'prop-novo' }, { status: 201 });
      }),
    );

    renderNewPropertyForm();
    await fillLandThroughStep2(user);

    await user.type(await screen.findByLabelText('Área total (m²) *'), '500');
    await user.selectOptions(screen.getByLabelText('Zoneamento *'), 'RESIDENTIAL');
    await user.selectOptions(screen.getByLabelText('Topografia *'), 'FLAT');
    await user.type(
      screen.getByPlaceholderText('Descreva o imóvel...'),
      'Terreno plano em ótima localização, pronto para construir.',
    );
    await user.click(screen.getByRole('button', { name: 'Criar e ir para Galeria' }));

    await waitFor(() => expect(posted).not.toBeNull());
    // Planos no corpo (espelham coluna), aninhados na resposta (espelham a fronteira de
    // acesso) — a assimetria é a do backend, e é deliberada.
    expect(posted).toMatchObject({ ownerName: 'Maria Silva', ownerPhone: '11987654321' });
  });
});

/**
 * O caminho de falha da API: o `catch` do envio alimenta um banner `role="alert"`. Sem isto
 * nada garante que um 500 do backend vira mensagem em vez de silêncio — e é exatamente o
 * ponto que a migração para `useMutation` reescreve.
 */
describe('PropertyForm — erro da API', () => {
  it('anuncia a falha e mantém o usuário no formulário', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/properties', () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Erro interno', error: 'Internal Server Error' },
          { status: 500 },
        ),
      ),
    );

    renderNewPropertyForm();
    await fillLandThroughStep2(user);

    await user.type(await screen.findByLabelText('Área total (m²) *'), '500');
    await user.selectOptions(screen.getByLabelText('Zoneamento *'), 'RESIDENTIAL');
    await user.selectOptions(screen.getByLabelText('Topografia *'), 'FLAT');
    await user.type(
      screen.getByPlaceholderText('Descreva o imóvel...'),
      'Terreno plano em ótima localização, pronto para construir.',
    );
    await user.click(screen.getByRole('button', { name: 'Criar e ir para Galeria' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Erro interno');
    // Continua no passo 3, com o botão de volta ao estado ocioso.
    expect(screen.getByRole('button', { name: 'Criar e ir para Galeria' })).toBeInTheDocument();
  });
});

describe('PropertyForm — full happy path (LAND / SALE)', () => {
  it('walks through all 3 steps and creates the property', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    // Step 1
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 2
    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 3 (LAND-specific fields) — addressed by label, so the DOM order of the two
    // selects is no longer part of the contract.
    await user.type(await screen.findByLabelText('Área total (m²) *'), '500');
    await user.selectOptions(screen.getByLabelText('Zoneamento *'), 'RESIDENTIAL');
    await user.selectOptions(screen.getByLabelText('Topografia *'), 'FLAT');
    await user.type(
      screen.getByPlaceholderText('Descreva o imóvel...'),
      'Terreno plano em ótima localização, pronto para construir.',
    );
    await user.click(screen.getByRole('button', { name: 'Criar e ir para Galeria' }));

    // On success the component navigates away (no matching route registered
    // in the test), so its own submit button unmounts.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Criar e ir|Salvando/ })).not.toBeInTheDocument();
    });
  });
});

/**
 * A sequência que travava o formulário: escolher Venda, marcar modalidades, mudar de ideia e
 * ir para Aluguel.
 *
 * `saleTypes` ficava no estado enquanto os chips sumiam da tela (eles só renderizam sob
 * "Venda"), e o schema tem uma regra contra isso — então a etapa 1 barrava, citando um campo
 * que o operador não conseguia mais ver nem editar. A única saída era voltar para "Venda",
 * desmarcar tudo e escolher "Aluguel" de novo, sem nenhuma pista de que era isso que faltava.
 */
describe('PropertyForm — trocar Venda por Aluguel', () => {
  async function chooseSaleThenRent(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.click(screen.getByRole('button', { name: 'Financiamento' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Aluguel' }));
  }

  it('a etapa 1 avança em vez de travar numa regra sobre um campo invisível', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await chooseSaleThenRent(user);
    // Os chips saíram da tela junto com o modo Venda — é isso que tornava o erro insolúvel.
    expect(screen.queryByRole('button', { name: 'Venda direta' })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Ex: R$ 2.500'), '2500');
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByPlaceholderText('Ex: Sorocaba')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('voltar para Venda pede a modalidade de novo — a seleção antiga não sobrevive', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await chooseSaleThenRent(user);
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await fillOwner(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Se a seleção tivesse sobrevivido à ida ao Aluguel, esta etapa passaria direto.
    expect(
      await screen.findByText('Selecione ao menos uma modalidade de venda.'),
    ).toBeInTheDocument();
  });
});
