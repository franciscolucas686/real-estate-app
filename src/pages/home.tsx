import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { PropertyCard } from '@/features/properties/components/property-card';
import { PropertyCardSkeleton } from '@/features/properties/components/property-skeletons';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { usePropertyStatusCounts } from '@/features/properties/hooks/use-property-status-counts';
import { PageContainer } from '@/layout/page-container';
import { BOTTOM_NAV_CLEARANCE } from '@/layout/app-nav';
import { cn } from '@/shared/cn';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { BusinessType, PropertyStatus, PropertyType } from '@/shared/api/types';
import { PropertyTypeLabel } from '@/shared/format';

const HIGHLIGHT_COUNT = 3;

/**
 * The storefront's front door.
 *
 * `/` used to be the results grid itself — the app opened on a wall of cards with no
 * context, no proposition and no visible way to search. Every property portal a visitor
 * has already used opens with a search, so this is Jakob's Law applied literally: the
 * listing moved to `/imoveis` and `/` states what the site is and offers one way in.
 *
 * The hero form does not filter in place; it composes a query and navigates to the
 * listing, so the search a visitor performs is a URL they can share.
 */
export function Home() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [type, setType] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (businessType) params.set('businessType', businessType);
    if (type) params.set('types', type);
    navigate({ pathname: '/imoveis', search: params.toString() });
  }

  return (
    <div
      data-slot="page-home"
      className={cn('flex flex-col bg-background md:pb-0', BOTTOM_NAV_CLEARANCE)}
    >
      <div className="lg:relative">
        <div aria-hidden="true" className="relative hidden overflow-hidden bg-[#081828] lg:block">
          <div className="absolute -inset-16 bg-[url('/images/wallpaper_desktop.webp')] bg-[size:100%_100%] blur-2xl" />
          <div className="relative mx-auto aspect-[1600/666] w-full max-w-[1600px] bg-[url('/images/wallpaper_desktop.webp')] bg-cover bg-center" />
        </div>
        <PageContainer
          withSafeAreaTop
          maxWidth="content"
          className="flex flex-col gap-6 pt-10 md:pt-16 lg:absolute lg:inset-x-0 lg:top-[calc(100%*330/630)] lg:py-0"
        >
          <div className="flex flex-col gap-4 lg:sr-only">
            <h1 className="text-3xl font-bold leading-tight text-foreground text-balance md:text-5xl">
              O imóvel certo em Sorocaba e região
            </h1>
            <p className="max-w-prose text-base text-foreground-subtle md:text-lg">
              Casas, apartamentos, terrenos e chácaras verificados um a um. Busque pelo que importa
              para você e fale direto com quem conhece o bairro.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm lg:flex-row lg:items-end lg:gap-2 lg:shadow-lg"
          >
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Onde
              </span>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade ou bairro"
              />
            </label>

            <label className="flex flex-col gap-1.5 lg:w-48">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Negócio
              </span>
              <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                <option value="">Comprar ou alugar</option>
                <option value={BusinessType.SALE}>Comprar</option>
                <option value={BusinessType.RENT}>Alugar</option>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5 lg:w-44">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tipo
              </span>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todos os tipos</option>
                {Object.values(PropertyType).map((value) => (
                  <option key={value} value={value}>
                    {PropertyTypeLabel[value]}
                  </option>
                ))}
              </Select>
            </label>

            <Button type="submit" size="md" className="lg:w-auto">
              <SearchIcon size={18} aria-hidden="true" />
              Buscar
            </Button>
          </form>
          <ActiveCount />
        </PageContainer>
      </div>

      {/* Fora da sobreposição, de propósito. O formulário tem altura fixa e a arte escala com a
          janela, então tudo que viesse depois dele dentro do palco passearia pela imagem
          conforme a largura — em 1024px esta linha cairia sobre a faixa navy, cinza sobre azul
          escuro. Aqui ela fica sempre no fundo da página, depois da arte.

          Os espaçamentos reproduzem exatamente o que havia antes num container só: o `pt-6` é
          o antigo `gap-6`, e o `pb-10 md:pb-16` é a metade de baixo do antigo `py`. `empty:hidden`
          porque `ActiveCount` devolve `null` enquanto a contagem não chega — sem isso sobraria
          um bloco de 64px de padding em volta de nada. */}
      <Highlights
        title="Destaques para comprar"
        businessType={BusinessType.SALE}
        to="/imoveis?businessType=SALE"
      />
      <Highlights
        title="Para alugar"
        businessType={BusinessType.RENT}
        to="/imoveis?businessType=RENT"
      />
    </div>
  );
}

/** Live inventory size — a concrete number reads as a real catalogue, not a template. */
function ActiveCount() {
  const { counts } = usePropertyStatusCounts(true);
  const active = counts?.[PropertyStatus.ACTIVE];
  if (active == null) return null;

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{active}</span> imóveis disponíveis agora
    </p>
  );
}

function Highlights({
  title,
  businessType,
  to,
}: {
  title: string;
  businessType: BusinessType;
  to: string;
}) {
  const { data, isLoading, isError } = useProperties({
    businessType,
    status: PropertyStatus.ACTIVE,
    take: HIGHLIGHT_COUNT,
    sort: 'newest',
  });

  const properties = data?.data ?? [];

  // A section with nothing in it is noise, so an empty or failed shelf renders nothing
  // rather than an empty-state box the visitor can't act on. The listing page owns the
  // "no results" conversation, where the filters that caused it are visible.
  if (isError || (!isLoading && properties.length === 0)) return null;

  return (
    <PageContainer maxWidth="wide" className="flex flex-col gap-4 border-t border-border py-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground md:text-2xl">{title}</h2>
        <Link
          to={to}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-action transition-colors md:hover:text-action-hover"
        >
          Ver todos
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: HIGHLIGHT_COUNT }).map((_, i) => <PropertyCardSkeleton key={i} />)
          : properties.map((property) => <PropertyCard key={property.id} property={property} />)}
      </div>
    </PageContainer>
  );
}
