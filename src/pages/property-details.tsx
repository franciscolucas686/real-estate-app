import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, useIsPresent } from 'motion/react';
import { motion } from 'motion/react';
import { ChevronLeft, Pencil, CheckCircle, MapPin, Share2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useProperty } from '@/features/properties/hooks/use-property';
import { PropertyMediaCarousel } from '@/features/properties/components/media/property-media-carousel';
import { PropertyMediaGallery } from '@/features/properties/components/media/property-media-gallery';
import { PropertyMediaViewer } from '@/features/properties/components/media/property-media-viewer';
import { PropertyDetailSkeleton } from '@/features/properties/components/property-skeletons';
import { PageContainer } from '@/layout/page-container';
import { SuccessSplash } from '@/ui/success-splash';
import { PropertyMap } from '@/features/properties/components/property-map';
import { StatusBadge } from '@/features/properties/components/status-badge';
import {
  formatPrice,
  formatMainPrice,
  buildWhatsAppUrl,
  PropertyTypeLabel,
  BusinessTypeLabel,
  SaleTypeLabel,
} from '@/shared/format';
import {
  PropertyStatus,
  BusinessType,
  type PropertyDetailDto,
  type PropertyImageDto,
  type PropertyLocationDto,
} from '@/shared/api/types';
import { Badge } from '@/features/properties/components/badge';
import { DetailBreadcrumb } from '@/features/properties/components/detail-breadcrumb';
import { PropertySpecGrid } from '@/features/properties/components/property-spec-grid';
import { QuickSpecs } from '@/features/properties/components/quick-specs';
import { SplashIdentity } from '@/features/properties/components/splash-identity';
import { useMe } from '@/features/auth/use-auth';
import { useScrollLock } from '@/shared/hooks/use-scroll-lock';
import { buildPropertyShareUrl } from '@/shared/share-url';
import { useToast } from '@/ui/toast-context';
import { imageUrl } from '@/shared/image-url';
import { cn } from '@/shared/cn';
import { usePropertyMutationRefresh } from '@/features/properties/hooks/use-property-mutation-refresh';

function flattenGallery(property: PropertyDetailDto): PropertyImageDto[] {
  const rooms = [...property.gallery.rooms].sort((a, b) => a.order - b.order);
  const roomImages = rooms.flatMap((r) =>
    [...r.images].sort((a, b) => a.order - b.order).map((img) => ({ ...img, roomName: r.name })),
  );
  const unassigned = [...(property.gallery.unassigned ?? [])].sort((a, b) => a.order - b.order);
  return [...roomImages, ...unassigned];
}

function hasCoords(
  location: PropertyLocationDto | null,
): location is PropertyLocationDto & { latitude: number; longitude: number } {
  return location !== null && location.latitude !== null && location.longitude !== null;
}

export function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const refreshPropertyQueries = usePropertyMutationRefresh();
  const locationState = location.state as { context?: string; showSplash?: boolean } | null;
  const isPostCreate = locationState?.context === 'post-create';

  const { data: property, isLoading: propertyLoading, isPlaceholderData } = useProperty(id!);
  const { data: me, isLoading: authLoading } = useMe();
  // isPlaceholderData: useProperty seeds the query with a stale preview card
  // (from the list cache) whose whatsappContact is always null. Treat that
  // placeholder the same as "still loading" so the WhatsApp CTA and gallery
  // don't render from stale data and then pop in once the real fetch resolves.
  const isLoading = propertyLoading || authLoading || isPlaceholderData;
  const isAuthenticated = Boolean(me);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const [stickyHeaderVisible, setStickyHeaderVisible] = useState(false);
  const [splashVisible, setSplashVisible] = useState(Boolean(locationState?.showSplash));
  const [finalizeSplashVisible, setFinalizeSplashVisible] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();
  const toast = useToast();

  useEffect(() => {
    if (!splashVisible) return;
    const t = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(t);
  }, [splashVisible]);

  useEffect(() => {
    if (!finalizeSplashVisible) return;
    const t = setTimeout(() => navigate('/dashboard'), 2000);
    return () => clearTimeout(t);
  }, [finalizeSplashVisible, navigate]);

  useScrollLock(galleryOpen);
  useScrollLock(mapFullscreen);

  /**
   * Compartilhar o imóvel.
   *
   * `navigator.share` primeiro: no celular ele abre a bandeja nativa, onde o WhatsApp já
   * está — que é para onde este link vai na prática. Onde a API não existe (a maioria dos
   * desktops), copia e avisa.
   *
   * O `AbortError` é o usuário fechando a bandeja. Não é falha e não pode virar toast; sem
   * este ramo, desistir de compartilhar acusaria um erro que não houve.
   */
  async function handleShare() {
    if (!property) return;
    const url = buildPropertyShareUrl(property.id);
    const title = `${PropertyTypeLabel[property.type]} · ${property.neighborhood}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Qualquer outra falha cai no copiar, que é o mesmo destino de quem não tem a API.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      // Resta o caso sem contexto seguro e sem bandeja — nada a fazer além de avisar.
      toast.error('Não foi possível copiar o link.');
    }
  }

  const allImages = property ? flattenGallery(property) : [];
  /*
   * Exatamente a URL que o carrossel vai pedir — `imageUrl(url, 'card')`, não o
   * original.
   *
   * Sem o `imageUrl` aqui, este pré-carregamento baixava os ~350KB da versão de
   * 1920px que **nenhum elemento da página exibe**, e só então liberava o esqueleto;
   * o `<img>` do carrossel começava aí o download da variante de 1600px, do zero. Duas
   * cópias da mesma foto e a primeira pintura esperando a errada. É inofensivo hoje
   * só porque `VITE_IMAGE_CDN` está vazia e `imageUrl` devolve a URL intacta — no dia
   * em que a flag subir, as duas URLs passam a divergir.
   */
  const coverUrl = allImages[0] ? imageUrl(allImages[0].url, 'card') : undefined;

  useEffect(() => {
    if (!coverUrl) return;
    const img = new Image();
    img.onload = () => setCoverReady(true);
    img.onerror = () => setCoverReady(true);
    img.src = coverUrl;
  }, [coverUrl]);

  // Memoize map coordinates to prevent re-renders during gestures
  const mapCenter = useMemo<[number, number] | undefined>(() => {
    if (property && hasCoords(property.location)) {
      return [property.location.latitude, property.location.longitude];
    }
    return undefined;
  }, [property]);

  useLayoutEffect(() => {
    // Once AnimatePresence marks this page as exiting (back navigation), the
    // incoming route's scroll restoration can still dispatch a 'scroll' event
    // while this component is kept mounted for its exit animation. Without this
    // guard that stray event would flip the sticky header/CTA visibility and
    // fire a second, conflicting exit animation on top of the page slide-out.
    if (!isPresent) return;
    const handleScroll = () => {
      setStickyHeaderVisible(window.scrollY > 2);
      if (ctaRef.current) {
        const ctaBottom = ctaRef.current.getBoundingClientRect().bottom;
        const headerH = stickyHeaderRef.current?.getBoundingClientRect().height ?? 0;
        setStickyCtaVisible(ctaBottom < headerH);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPresent]);

  // Keep the skeleton up until the cover photo has actually loaded, so the
  // user never sees the page (incl. the WhatsApp CTA) before its first
  // visible image is ready.
  if (isLoading || (allImages.length > 0 && !coverReady)) {
    // One skeleton for both, because there is now one layout. The desktop variant existed
    // only to mirror the second tree.
    return <PropertyDetailSkeleton />;
  }

  if (!property) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 md:min-h-full">
        <p className="text-sm text-foreground-subtle">Imóvel não encontrado.</p>
      </div>
    );
  }

  if (!isAuthenticated && property.status !== PropertyStatus.ACTIVE) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 md:min-h-full">
        <p className="text-sm text-foreground-subtle">Imóvel não encontrado.</p>
      </div>
    );
  }

  const whatsUrl = property.whatsappContact
    ? buildWhatsAppUrl(property.whatsappContact, property.code)
    : null;

  /*
   * Só imóvel publicado é compartilhável.
   *
   * A rota de share resolve apenas `status: ACTIVE` — é a mesma regra que impede inventário
   * não publicado de vazar. Oferecer o botão num rascunho geraria um link que abre "Imóvel
   * não encontrado" para quem recebe, e o operador só descobriria pelo outro lado.
   *
   * Para o visitante isto é sempre verdadeiro, já que ele não enxerga outro status; quem vê
   * o botão sumir é o operador, nos imóveis que ainda não publicou.
   */
  const canShare = property.status === PropertyStatus.ACTIVE;

  return (
    <article data-slot="page-property-details" className="flex flex-col">
      {/*
        One composition, not two.

        This page used to render the mobile layout and the desktop layout as separate JSX
        trees, ~200 lines each, switched on `useIsDesktop()`. They contained the same
        sections in a different order, which meant every product change had to be made
        twice and the two drifted: the desktop tree showed a `StatusBadge` and a
        breadcrumb the mobile one didn't, and the mobile one had a "Valores e Negócios"
        block with a second copy of the price.

        The order difference is expressible in CSS. A two-row, two-column grid gives:
        - mobile (single column): media → identity/price/CTA → specs and content
        - desktop: media top-left, contact rail top-right and sticky, content below-left

        `md:row-span-2` on the rail is what lets it stay sticky while the content column
        scrolls past — a sticky item can only travel within its own grid area.
      */}
      <PageContainer maxWidth="wide" className="flex flex-col gap-5 pb-10 md:py-8">
        <DetailBreadcrumb type={property.type} />

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start md:gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Media ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 md:col-start-1 md:row-start-1">
            {/* Full-bleed on mobile, a rounded card from `md` up. This is the "two
                layouts" difference reduced to two utility classes. */}
            <div className="relative -mx-gutter overflow-hidden md:mx-0 md:rounded-2xl">
              <PropertyMediaCarousel
                images={allImages}
                onOpenGallery={() => setGalleryOpen(true)}
                onOpenViewer={(i) => setViewerIndex(i)}
                showDots={false}
              />
              {isPostCreate ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/properties/${id}/edit`, { state: { context: 'post-create' } })
                  }
                  className="absolute left-4 top-[calc(env(safe-area-inset-top,12px)+12px)] z-(--z-raised) flex h-10 items-center gap-2 rounded-full bg-black/40 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-transform active:scale-90 md:top-4 md:hover:bg-black/55"
                >
                  <Pencil size={15} aria-hidden="true" />
                  Editar imóvel
                </button>
              ) : (
                /* `md:hidden`, and no `md:` styling left on it for the same reason the
                   sticky CTA carries none: the element does not render at that width, so
                   any desktop class would be dead and would tell the next reader
                   otherwise. `DetailBreadcrumb` is the way out from `md` up — its docblock
                   states the other half of this, and the two are now genuinely exclusive
                   rather than merely different in size. */
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Voltar"
                  className="absolute left-3 top-[calc(env(safe-area-inset-top,12px)+12px)] z-(--z-raised) flex size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90 md:hidden"
                >
                  <ChevronLeft size={24} aria-hidden="true" />
                </button>
              )}

              {/* Espelha o botão voltar do outro lado, e fica **fora** do ternário acima de
                  propósito: os dois ramos de lá são o controle da esquerda, e compartilhar
                  precisa existir nos dois — inclusive no estado pós-criação.

                  Sem nenhuma classe `md:`, pela mesma razão que o voltar não tem: o elemento
                  não renderiza nessa largura, então qualquer estilo de desktop seria morto e
                  enganaria quem lesse depois. De `md` para cima quem carrega esta ação é o
                  rail. */}
              {canShare && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  aria-label="Compartilhar"
                  className="absolute right-3 top-[calc(env(safe-area-inset-top,12px)+12px)] z-(--z-raised) flex size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90 md:hidden"
                >
                  <Share2 size={24} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Thumbnail strip: only useful where there's room for it to be tappable, which
                is why it starts at `lg` and not `md`. Between the two the media column is
                308–563px wide, so six tiles plus five gaps left each one too small to aim
                at. Being `hidden lg:grid`, the tiles below need no breakpoint gating of
                their own to send the viewer everything from `lg` up.

                Three things move with this boundary and have to keep moving together: the
                photo's proportion (`lg:aspect-21/9`, which exists to fit *beside* this
                strip), the "Ver todas" pill (`lg:hidden`, the affordance that covers the
                band where this one is absent), and the strip term in
                `--property-photo-max-height`.

                The tiles are a fixed `h-20` rather than `aspect-square`, and that is the
                other half of a decision made in `index.css`. A square tile's height is
                whatever the media column's width divided by six happens to be — 120px to
                147px across the widths where it now renders — so the strip could only
                enter that token's accounting as a worst-case guess, and the photo would
                pay ~60px for it at every size. Raise this height without raising that term
                and the strip starts falling off the viewport again. */}
            {allImages.length > 0 && (
              <div className="hidden grid-cols-6 gap-2 lg:grid">
                {allImages.slice(0, 5).map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setViewerIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className="h-20 overflow-hidden rounded-lg"
                  >
                    <img
                      src={imageUrl(img.url, 'thumb')}
                      alt={img.label ?? `Foto ${i + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-opacity md:hover:opacity-80"
                    />
                  </button>
                ))}
                {allImages.length > 5 && (
                  /* Opens the viewer on the photo it shows (`allImages[5]`), the same rule
                     the five tiles before it follow. The label still says "todas" because
                     the destination really is the whole set — the viewer browses every
                     photo; only the door changed, from the mosaic to the viewer. */
                  <button
                    type="button"
                    onClick={() => setViewerIndex(5)}
                    aria-label={`Ver todas as ${allImages.length} fotos`}
                    className="relative h-20 overflow-hidden rounded-lg"
                  >
                    <img
                      src={imageUrl(allImages[5].url, 'thumb')}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                      +{allImages.length - 5} fotos
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Contact rail ──────────────────────────────────────────────── */}
          {/* 24px from the viewport, which is correct only because `TopNav` no longer pins —
              it scrolls away with the page instead of holding the top band. While it is
              still leaving, it paints over the rail (it carries `z-(--z-nav)`, the rail
              carries none), which reads fine for something on its way out.

              Pin the nav again and this offset has to clear `--site-nav-height`, or the rail
              spends every scroll behind the bar, badges and title included — the bug it
              used to have. The two are one decision made in two files. */}
          <aside className="flex flex-col gap-4 md:col-start-2 md:row-span-2 md:row-start-1 md:sticky md:top-6 md:self-start md:rounded-2xl md:border md:border-border md:bg-surface-raised md:p-6 md:shadow-sm">
            <div className="flex flex-wrap gap-2">
              {/* Only meaningful to someone who can change it. A visitor can only ever see
                  ACTIVE properties, so the badge would be a constant. */}
              {isAuthenticated && <StatusBadge status={property.status} />}
              <Badge color={property.businessType === BusinessType.SALE ? 'action' : 'accent'}>
                {BusinessTypeLabel[property.businessType]}
              </Badge>
              {property.saleTypes.map((st) => (
                <Badge key={st.id} color="border">
                  {SaleTypeLabel[st.type]}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <h1 className="text-xl font-bold text-foreground md:text-2xl">
                {PropertyTypeLabel[property.type]}
              </h1>
              <span className="font-mono text-sm text-muted-foreground">Cód. {property.code}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <p className="text-2xl font-bold text-foreground">
                {formatMainPrice(property.businessType, property.price, property.rentPrice)}
              </p>
              {property.condoFee && (
                <p className="text-sm text-foreground-subtle">
                  Condomínio: {formatPrice(property.condoFee)}/mês
                </p>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-sm text-foreground-subtle">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {property.neighborhood}, {property.city} — {property.state}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
              <QuickSpecs property={property} />
            </div>

            {/* The inline CTA. `ctaRef` is watched so the fixed mobile bar only appears
                once this one has scrolled out of view. */}
            {whatsUrl && (
              <div className="hidden md:block">
                <a
                  href={whatsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action text-base font-semibold text-white transition-[transform,filter] active:scale-[0.98] md:h-12 md:hover:brightness-110"
                >
                  <FaWhatsapp size={22} aria-hidden="true" />
                  Conversar conosco agora
                </a>
              </div>
            )}

            {/* A ação de compartilhar no desktop. `hidden md:flex` porque abaixo de `md` ela
                já existe sobre o carrossel e na barra fixa — este é o terceiro lugar da
                mesma ação, não um quarto controle.

                Secundário de propósito: o CTA do WhatsApp acima é o que a página quer que
                aconteça, e dois botões preenchidos disputando a mesma coluna diluiriam os
                dois. Fora do `whatsUrl` porque compartilhar não depende de haver número de
                contato cadastrado. */}
            {canShare && (
              <button
                type="button"
                onClick={() => void handleShare()}
                className="hidden h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-transparent text-sm font-semibold text-foreground-subtle transition-colors md:flex md:hover:bg-border/60 md:hover:text-foreground"
              >
                <Share2 size={18} aria-hidden="true" />
                Compartilhar imóvel
              </button>
            )}
          </aside>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 md:col-start-1 md:row-start-2">
            {whatsUrl && (
              // Mobile keeps the CTA in the flow, right after the price, because there is
              // no rail to pin it to.
              // The sticky bottom bar is mobile-only, so this is the only CTA the scroll
              // observer needs to watch.
              <div ref={ctaRef} className="md:hidden">
                <a
                  href={whatsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action text-base font-semibold text-white transition-transform active:scale-[0.98]"
                >
                  <FaWhatsapp size={22} aria-hidden="true" />
                  Conversar conosco agora
                </a>
              </div>
            )}

            <PropertySpecGrid property={property} />

            {property.description && (
              <section className="flex flex-col gap-2">
                {/* Section headings sit at `lg`, not `base`. At `base` they were one step
                    above the body and rendered as 17px against 15px on a desktop — bold
                    body text, not a heading. See the sibling headings below. */}
                <h2 className="text-lg font-semibold text-foreground md:text-xl">Sobre o imóvel</h2>
                {/* Capped for reading comfort: prose past ~70 characters per line is
                    measurably harder to track back from. */}
                <p className="max-w-prose leading-relaxed text-foreground-subtle">
                  {property.description}
                </p>
              </section>
            )}

            {hasCoords(property.location) && (
              <section className="flex flex-col gap-3 border-t border-border pt-6">
                <h2 className="text-lg font-semibold text-foreground md:text-xl">Localização</h2>
                {mapCenter && (
                  <button
                    type="button"
                    onClick={() => setMapFullscreen(true)}
                    aria-label="Abrir mapa em tela cheia"
                    className={cn(
                      // A real <button>: this was a <div onClick>, unreachable by keyboard.
                      'relative isolate h-72 w-full overflow-hidden rounded-lg md:h-80',
                      mapFullscreen && 'invisible',
                    )}
                  >
                    <PropertyMap center={mapCenter} interactive={false} className="h-full w-full" />
                  </button>
                )}
                <p className="text-sm text-foreground-subtle">
                  {property.location.neighborhood}, {property.location.city} —{' '}
                  {property.location.state}
                </p>
              </section>
            )}

            {/* Clears the fixed mobile CTA bar. */}
            <div className="h-20 md:hidden" aria-hidden="true" />
          </div>
        </div>
      </PageContainer>
      {/* Gallery overlay — portaled to escape the route-transition transform, which would
          otherwise become the containing block for this fixed overlay. */}
      {createPortal(
        <AnimatePresence>
          {galleryOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 40, stiffness: 400 }}
              className="fixed inset-0 z-(--z-fixed) flex flex-col bg-background overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
                <button
                  type="button"
                  onClick={() => setGalleryOpen(false)}
                  aria-label="Voltar"
                  className="flex size-10 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform"
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="text-base font-semibold text-foreground">
                  Fotos ({allImages.length})
                </span>
              </div>
              <PropertyMediaGallery
                images={allImages}
                onImageClick={(i) => {
                  setViewerIndex(i);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      {/* Fullscreen viewer — portaled to escape the route-transition transform, which would
          otherwise become the containing block for this fixed overlay. */}
      {createPortal(
        <AnimatePresence>
          {viewerIndex !== null && (
            <PropertyMediaViewer
              images={allImages}
              initialIndex={viewerIndex}
              onClose={() => setViewerIndex(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {/* Fullscreen map overlay — portaled to escape the route-transition transform, which
          would otherwise become the containing block for this fixed overlay. */}
      {createPortal(
        <AnimatePresence>
          {mapFullscreen && hasCoords(property.location) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex flex-col bg-background"
              style={{
                zIndex: 1000,
                touchAction: 'none',
                WebkitOverflowScrolling: 'touch',
                isolation: 'isolate',
              }}
            >
              {/* Header - fixed height */}
              <div className="flex-none flex items-center gap-3 border-b border-border bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] relative z-20">
                <button
                  type="button"
                  onClick={() => setMapFullscreen(false)}
                  aria-label="Voltar"
                  className="flex size-10 items-center justify-center rounded-full text-foreground active:scale-90 transition-transform"
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="text-base font-semibold text-foreground">Localização</span>
              </div>

              {/* Map container - fills remaining space */}
              <div className="flex-1 relative overflow-hidden">
                {mapCenter && (
                  <PropertyMap center={mapCenter} interactive={true} className="h-full w-full" />
                )}
              </div>

              {/* Footer - fixed height */}
              <div className="flex-none px-4 py-3 border-t border-border bg-background relative z-20">
                <p className="text-sm text-foreground-subtle">
                  {property.location.neighborhood}, {property.location.city} —{' '}
                  {property.location.state}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      {/* WhatsApp CTA 2 — sticky, appears when CTA1 is covered by sticky header.
          Portaled to escape the route-transition transform, which would otherwise
          become the containing block for this fixed overlay.

          `md:hidden` because the desktop rail (sticky below the nav, see its offset above)
          already keeps the WhatsApp CTA in view permanently — this bar exists to solve a
          problem the rail does not have.

          It also fixes a condition that was quietly always-true on desktop: the gate below
          is `ctaBottom < headerH`, and `ctaRef` sits on a `md:hidden` div, so above `md`
          `getBoundingClientRect()` returns an empty box and `ctaBottom` is 0. Once the
          sticky header existed, `0 < headerH` held and 3px of scroll was enough to raise
          this bar. With the header hidden too, `headerH` is 0 and the state stops
          oscillating. */}
      {createPortal(
        <AnimatePresence>
          {isPresent &&
            whatsUrl &&
            stickyCtaVisible &&
            stickyHeaderVisible &&
            !mapFullscreen &&
            !isPostCreate && (
              <motion.div
                data-slot="sticky-cta"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="fixed inset-x-0 bottom-0 z-(--z-nav) px-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] pt-3 bg-surface-raised border-t border-border shadow-lg md:hidden"
              >
                {/* No `md:` styling here on purpose: the container above never renders at
                    that width, so any desktop class would be dead and would suggest
                    otherwise to whoever reads it next. */}
                <a
                  href={whatsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action text-base font-semibold text-white transition-[transform,background-color] active:scale-[0.98]"
                >
                  <FaWhatsapp size={22} />
                  Conversar conosco agora
                </a>
              </motion.div>
            )}
        </AnimatePresence>,
        document.body,
      )}

      {/* post-create: Finalizar imóvel CTA — portaled to escape the route-transition
          transform, which would otherwise become the containing block for this fixed overlay */}
      {isPostCreate &&
        !mapFullscreen &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-border bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] pt-3 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                refreshPropertyQueries();
                setFinalizeSplashVisible(true);
              }}
              className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-[transform,background-color] active:scale-[0.98] md:mx-auto md:h-12 md:max-w-md md:hover:bg-action-hover"
            >
              Finalizar imóvel
            </button>
          </div>,
          document.body,
        )}
      {/* post-create: success splash */}
      <SuccessSplash visible={splashVisible}>
        <CheckCircle size={64} className="text-action" />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xl font-bold text-foreground">Imóvel criado!</p>
          <p className="text-sm text-muted-foreground">Revise o imóvel e finalize o cadastro.</p>
        </div>
        <SplashIdentity property={property} />
      </SuccessSplash>
      {/* post-create: finalize success splash */}
      <SuccessSplash visible={finalizeSplashVisible}>
        <CheckCircle size={64} className="text-action" />
        <div className="flex flex-col items-center gap-1 text-center">
          {/* The title states the outcome and nothing else. It used to read
              "Imóvel 575301 / finalizado com sucesso!" with a hard `<br />` splitting the
              sentence around the code — a line break placed for one string length, on a
              screen whose width varies. The code moved into `SplashIdentity` below, where
              it sits with the rest of what identifies the property. */}
          <p className="text-xl font-bold text-foreground">Imóvel finalizado com sucesso!</p>
        </div>
        <SplashIdentity property={property} />
      </SuccessSplash>
      {/* Sticky back button header — appears when carousel scrolls out of view.
          Portaled to escape the route-transition transform, which would otherwise
          become the containing block for this fixed overlay.

          `md:hidden` completes an intent `DetailBreadcrumb` already documents: the overlaid
          back button is the phone's way out, the breadcrumb (`hidden md:flex`) is the
          desktop's. This half never got the matching class, so both rendered on a desktop.
          Nothing is stranded — this bar is only the scrolled-state copy of the button
          overlaid on the carousel, which is `md:hidden` too, so the pair is mobile-only at
          both ends and the desktop has the trail. */}
      {createPortal(
        <AnimatePresence>
          {isPresent && stickyHeaderVisible && !mapFullscreen && (
            <motion.div
              ref={stickyHeaderRef}
              data-slot="sticky-header"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 40, stiffness: 400 }}
              className="fixed inset-x-0 top-0 z-(--z-nav) flex items-center gap-3 border-b border-border bg-surface-raised px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] shadow-sm md:hidden"
            >
              {isPostCreate ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/properties/${id}/edit`, { state: { context: 'post-create' } })
                  }
                  aria-label="Editar imóvel"
                  className="flex h-10 items-center px-4 ml-2 gap-2 rounded-full text-sm font-medium bg-black/40 text-white transition-transform active:scale-90 md:hover:bg-black/55"
                >
                  <Pencil size={16} />
                  Editar imóvel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Voltar"
                  className="flex size-12 items-center justify-center rounded-full bg-black/40 text-white transition-transform active:scale-90 md:hover:bg-black/55"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* A cópia rolada do botão sobre o carrossel — a barra é a mesma ação depois
                  que a foto sai de vista, e as duas precisam andar juntas.

                  `ml-auto` empurra para a direita: a barra é um `flex gap-3` cujo único
                  outro filho é o controle da esquerda. `size-10` como o irmão ao lado, o que
                  mantém a altura da barra — que o handler de scroll **mede** para decidir o
                  CTA fixo. Mudar este tamanho realimenta aquele cálculo. */}
              {canShare && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  aria-label="Compartilhar"
                  className="ml-auto flex size-12 items-center justify-center rounded-full bg-black/40 text-white transition-transform active:scale-90 md:hover:bg-black/55"
                >
                  <Share2 size={24} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </article>
  );
}
