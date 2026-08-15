<div align="center">

<!-- 📌 SUBSTITUA por um banner seu (1280×400). Sugestão: Figma ou canva.com,
     com o nome do app, um mockup do celular e a paleta navy/azul do projeto.
     Salve em `docs/banner.png` e o caminho abaixo já funciona. -->
<img src="docs/banner.png" alt="Minha Imobiliária" width="100%" />

# 🏡 Minha Imobiliária

**O catálogo de imóveis que tirou uma imobiliária inteira da galeria do celular.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[![CI](https://img.shields.io/github/actions/workflow/status/franciscolucas686/real-estate-app/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/franciscolucas686/real-estate-app/actions)
![Testes](https://img.shields.io/badge/testes-224%20passando-success?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-5A0FC8?style=flat-square&logo=pwa)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-lightgrey?style=flat-square)

<!-- 📌 SUBSTITUA pela URL do seu deploy na Vercel -->
**[🔗 Ver aplicação](https://SEU-DEPLOY.vercel.app)** · **[⚙️ Repositório da API](https://github.com/franciscolucas686/api-real-estate)**

</div>

---

## 📖 A história

> Uma imobiliária real. Centenas de imóveis. **Zero organização.**

As fotos viviam espalhadas entre a galeria do celular do corretor e pastas soltas no Drive.
Achar "aquele apartamento de 2 quartos no Campolim até R$ 400 mil" significava rolar
conversas de WhatsApp e abrir pasta por pasta. Do outro lado, o cliente esperava — e muitas
vezes desistia antes da resposta chegar.

**O problema nunca foi falta de imóvel. Era falta de encontrabilidade.**

### 💡 A solução

Um app com duas caras, porque são duas pessoas com perguntas diferentes:

| 👤 Quem usa | ❓ A pergunta que faz | 🎯 O que o app entrega |
|---|---|---|
| **Cliente final** | *"Tem alguma coisa que sirva pra mim?"* | Busca com filtros combináveis, galeria de fotos organizada por ambiente e contato direto no WhatsApp |
| **Corretor** | *"Como eu ponho isso no ar rápido?"* | Cadastro guiado em 3 passos, upload de fotos por cômodo e controle de publicação |

---

## 🎬 Demonstração

<!-- 📌 GRAVE 3 GIFs curtos (10–15s) com ScreenToGif, LICEcap ou Kap.
     Salve em `docs/` e os caminhos abaixo já funcionam.
     Dica: grave em janela estreita (390px) pra mostrar que é mobile-first. -->

<div align="center">

| 🔍 Busca e filtros | 🖼️ Galeria por ambiente | ✍️ Cadastro do imóvel |
|:---:|:---:|:---:|
| <img src="docs/demo-filtros.gif" width="260" /> | <img src="docs/demo-galeria.gif" width="260" /> | <img src="docs/demo-cadastro.gif" width="260" /> |
| Filtros que viram link compartilhável | Fotos organizadas por cômodo | Wizard em 3 passos com validação |

</div>

---

## ✨ Funcionalidades

**Para o cliente**
- [x] 🔎 Busca com filtros combináveis — tipo, negócio, faixa de preço, área, quartos, cidade
- [x] 🔗 **Filtros na URL** — o link filtrado é compartilhável, sobrevive ao F5 e o botão voltar desfaz
- [x] 🖼️ Galeria organizada por ambiente, com visualizador em tela cheia
- [x] 🗺️ Localização no mapa (Leaflet)
- [x] 💬 Contato direto via WhatsApp, com o código do imóvel já na mensagem
- [x] 📱 PWA instalável, com suporte offline

**Para o corretor**
- [x] 🔐 Área autenticada com sessão por cookie e refresh automático de token
- [x] 📝 Cadastro em 3 passos, com regras condicionais por tipo de imóvel
- [x] 📸 Upload de fotos com organização por cômodo e seleção múltipla por gesto
- [x] 🚦 Controle de status — ativo, pendente, inativo
- [x] ⚙️ Configurações de contato público da imobiliária

---

## 🛠️ Stack

| Camada | Tecnologia | Por que |
|---|---|---|
| **UI** | React 19 + TypeScript 5.9 | Tipagem estrita ponta a ponta (`noUnusedLocals`, `strict`) |
| **Build** | Vite 7 | HMR instantâneo e build enxuto |
| **Estilo** | Tailwind CSS 4 | Design tokens em `@theme`, sem CSS solto |
| **Estado servidor** | TanStack Query 5 | Cache, invalidação e estados de carregamento |
| **Estado de busca** | React Router 7 (`useSearchParams`) | A URL **é** o estado — link compartilhável de graça |
| **Formulários** | React Hook Form + Zod 4 | Schemas espelhando as regras reais do backend |
| **Mapas** | Leaflet | Seleção e exibição de coordenadas |
| **Animação** | Motion | Transições de página respeitando `prefers-reduced-motion` |
| **Testes** | Vitest + Testing Library + MSW | 224 testes sem back-end no ar |
| **CI/CD** | GitHub Actions → Vercel | Lint, testes e build barram o merge |

---

## 🏗️ Arquitetura

O que eu mais aprendi construindo isso não foi *usar* as bibliotecas — foi **decidir onde
cada coisa mora** e fazer o projeto se defender de decisões ruins futuras.

```
src/
├── ui/          🎨 Design system. Zero domínio, zero rede, zero rota.
├── layout/      📐 Estrutura de página. Conteúdo chega por children.
├── features/    🧩 Um domínio por pasta, dono do seu api/hooks/components/schema
├── pages/       📄 Rotas — apenas composição
└── app/         🚀 Router, guards e composição das shells
```

<details>
<summary><b>🔒 As camadas não são convenção — são regra de lint</b></summary>

<br>

A direção de dependência é `ui → layout → features → pages → app`, e ela é **verificada por
`no-restricted-imports` no ESLint**. Um componente de `ui/` que tentar importar
`@/features/*` quebra o build.

Isso não nasceu de teoria: a estrutura anterior tinha a mesma intenção escrita num arquivo
markdown e derivou assim mesmo — `components/ui/` tinha acumulado um badge que importava
`PropertyStatus`, um mapa e um guard que chamava `useMe()`. Um design system que conhece
imóveis e autenticação não é reutilizável.

**Resultado medido:** zero dependências circulares no grafo de imports.

</details>

<details>
<summary><b>🔗 Por que os filtros vivem na URL e não no React</b></summary>

<br>

`useFilters()` deriva os filtros de `useSearchParams`. Não existe `FilterProvider`.

Isso é o que faz uma busca filtrada ser **compartilhável, sobreviver ao reload e ser
desfeita com o botão voltar** — três coisas que não funcionavam quando o estado morava num
contexto.

Detalhes que a implementação precisou resolver:

- Todo campo tem `.catch()` para o valor padrão, então um link editado à mão degrada para
  "filtro ignorado" em vez de quebrar ou gerar um 400 na API.
- O histórico é dividido por intenção: arrastar um slider **substitui** a entrada (senão
  seriam vinte cliques no voltar), enquanto aplicar ou limpar **empilha**.
- `status` é deliberadamente **não** parametrizável pela URL — senão qualquer um digitaria
  `?status=PENDING` e veria imóveis não publicados.

</details>

<details>
<summary><b>📱 Responsividade decidida em CSS, não em JavaScript</b></summary>

<br>

Não existe `useIsDesktop` neste projeto. Ele existiu, com **26 pontos de bifurcação em 6
arquivos** — três telas carregavam duas árvores de componentes paralelas, e o dashboard
chegava a escolher o *tamanho da página* pelo viewport (a query key mudava ao redimensionar,
e no celular a paginação simplesmente não existia).

Hoje layout é media query para estrutura e container query para componente. Onde o
comportamento realmente difere por largura — como a foto principal do imóvel, que abre o
mosaico no celular e o visualizador no desktop — são **duas superfícies de clique mutuamente
exclusivas por CSS**, não um `if` em JS.

</details>

<details>
<summary><b>♿ Acessibilidade tratada como requisito, não como enfeite</b></summary>

<br>

- Skip link em ambas as shells (WCAG 2.4.1)
- Todo banner de erro com `role="alert"` — validação que o leitor de tela nunca lê não é validação
- Fotos da galeria são `role="checkbox"` com `aria-checked`, alcançáveis por teclado — antes eram `<div>` com eventos de ponteiro
- Navegação sempre com `<Link>`, nunca `<button onClick={navigate}>` — senão ctrl+clique e "abrir em nova aba" não funcionam
- Zoom não bloqueado e inputs em 16px (evita o auto-zoom do iOS)
- Cores de status escolhidas para **4.5:1** com texto branco — os badges são 10px bold, que a WCAG não trata como texto grande
- `prefers-reduced-motion` respeitado em CSS e na biblioteca de animação

</details>

<details>
<summary><b>🧪 Como os testes são escritos</b></summary>

<br>

**224 testes, 27 arquivos, sem back-end rodando.** As requisições são interceptadas por
**MSW** — a rede é falsa, o componente é real.

- **Unitários** — schemas Zod testados direto, cobrindo cada regra condicional
- **Integração** — a página real é renderizada e dirigida com `user-event`, afirmando sobre o DOM

Duas regras que valem mais que a contagem:

1. **Campos são endereçados por rótulo**, nunca por posição. O `getAllByPlaceholderText('0')[5]`
   que existia antes significava que reordenar um campo silenciosamente mudava o alvo da
   asserção — foi o que tornou um formulário de 1.300 linhas perigoso de refatorar.
2. **A verificação é o exit code, não o texto da saída.** Um `grep` por "FAIL" mostra verde
   numa execução onde uma exceção não capturada dentro de um handler do React fez o Vitest
   sair com 1. Aconteceu, e o aprendizado virou comentário no `test/setup.ts`.

</details>

---

## 🚀 Rodando localmente

> Uma jornada de três paradas. Você vai precisar de **Node.js 20+** na mochila.

**1ª parada — clonar e instalar**

```bash
git clone https://github.com/franciscolucas686/real-estate-app.git
cd real-estate-app
npm install
```

**2ª parada — apontar para o back-end**

```bash
cp .env.example .env.development
```

O arquivo já aponta para `http://localhost:3000`, onde a
[API](https://github.com/franciscolucas686/api-real-estate) roda. Prefere só ver a interface?
Os testes rodam com MSW e não precisam de servidor nenhum.

**3ª parada — subir**

```bash
npm run dev
```

Pronto: `http://localhost:5173`.

<details>
<summary><b>📜 Todos os comandos</b></summary>

<br>

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Checagem de tipos (`tsc -b`) + build de produção |
| `npm run preview` | Serve o build local |
| `npm run lint` | ESLint, incluindo as regras de camada |
| `npm test` | Todos os testes, uma vez |
| `npm run test:watch` | Testes em watch mode |
| `npm run test:cov` | Relatório de cobertura |

</details>

---

## 📊 O projeto em números

| | |
|---|---|
| 📁 Arquivos de código | 114 |
| 📝 Linhas de código | ~12.100 |
| ✅ Testes automatizados | **224** em 27 arquivos |
| 🧪 Linhas de teste | ~3.800 |
| 🔁 Dependências circulares | **0** |
| 🗺️ Rotas | 13, incluindo catch-all |

---

## 🗺️ Próximos passos

- [x] Filtros compartilháveis por URL
- [x] Galeria organizada por ambiente
- [x] PWA instalável
- [x] Camadas verificadas por lint
- [ ] 🔍 Auditoria com axe/Lighthouse na aplicação rodando
- [ ] 🌙 Tema escuro (os tokens já estão prontos para isso)
- [ ] ❤️ Favoritos para o cliente final
- [ ] 📈 Métricas de visualização por imóvel para o corretor

---

## 👨‍💻 Autor

**Francisco Lucas**

Desenvolvedor em transição de carreira, construindo software para resolver problemas reais de
negócios reais. Este projeto nasceu de uma imobiliária que precisava sair da galeria do
celular — e virou meu laboratório de arquitetura front-end.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-conectar-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/SEU-PERFIL)
[![GitHub](https://img.shields.io/badge/GitHub-seguir-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/franciscolucas686)
[![Email](https://img.shields.io/badge/Email-falar-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:franciscolucas686@gmail.com)

<div align="center">

⭐ **Se este projeto te ajudou ou te interessou, deixe uma estrela!**

</div>
