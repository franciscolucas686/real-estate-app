import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Bed,
  Bath,
  Car,
  Maximize,
  Home as HomeIcon,
  Layers,
  Building2,
  ArrowUp,
  Wind,
  Sun,
  Waves,
  Map as MapIcon,
  Triangle,
  Droplets,
  Trees,
  Fish,
  Workflow,
  Ruler,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useProperty } from '../hooks/use-property';
import { PropertyMediaCarousel } from '../components/media/property-media-carousel';
import { PropertyMediaGallery } from '../components/media/property-media-gallery';
import { PropertyMediaViewer } from '../components/media/property-media-viewer';
import { PropertyDetailSkeleton } from '../components/ui/skeletons';
import { PageContainer } from '../components/ui/page-container';
import { PropertyMap } from '../components/property-map';
import {
  formatPrice,
  formatArea,
  formatMainPrice,
  buildWhatsAppUrl,
  PropertyTypeLabel,
  BusinessTypeLabel,
  SaleTypeLabel,
  SunPositionLabel,
  formatZoning,
  TopographyLabel,
  WaterSourceLabel,
} from '../utils/format';
import {
  PropertyType,
  BusinessType,
  type PropertyDetailDto,
  type PropertyImageDto,
  type PropertyLocationDto,
  type HouseDetailsDto,
  type ApartmentDetailsDto,
  type LandDetailsDto,
  type SmallFarmDetailsDto,
  type CountryHouseDetailsDto,
} from '../types/api';
import { twMerge } from 'tailwind-merge';

function flattenGallery(property: PropertyDetailDto): PropertyImageDto[] {
  const roomImages = property.gallery.rooms.flatMap((r) =>
    r.images.map((img) => ({ ...img, roomName: r.name })),
  );
  const unassigned = property.gallery.unassigned ?? [];
  return [...roomImages, ...unassigned].sort((a, b) => a.order - b.order);
}

function hasCoords(
  location: PropertyLocationDto | null,
): location is PropertyLocationDto & { latitude: number; longitude: number } {
  return location !== null && location.latitude !== null && location.longitude !== null;
}

export function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: property, isLoading } = useProperty(id!);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const [stickyHeaderVisible, setStickyHeaderVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const allImages = property ? flattenGallery(property) : [];

  // Memoize map coordinates to prevent re-renders during gestures
  const mapCenter = useMemo<[number, number] | undefined>(() => {
    if (property && hasCoords(property.location)) {
      return [property.location.latitude, property.location.longitude];
    }
    return undefined;
  }, [property]);

  useEffect(() => {
    if (!property?.whatsappContact) return;
    const el = ctaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setStickyCtaVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [property?.whatsappContact]);

  useEffect(() => {
    const handleScroll = () => setStickyHeaderVisible(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) return <PropertyDetailSkeleton />;

  if (!property) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <p className="text-sm text-foreground-subtle">Imóvel não encontrado.</p>
      </div>
    );
  }

  const whatsUrl = property.whatsappContact
    ? buildWhatsAppUrl(property.whatsappContact, property.code)
    : null;

  return (
    <div data-slot="page-property-details" className=" flex flex-col">
      {/* Full-width carousel with back button overlaid */}
      <div className="relative mx-0 w-full">
        <PropertyMediaCarousel
          images={allImages}
          onOpenGallery={() => setGalleryOpen(true)}
          showDots={false}
        />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="absolute left-3 top-[calc(env(safe-area-inset-top,20px)+12px)] z-10 flex size-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Main content */}
      <PageContainer className="flex flex-col gap-4 py-6">
        {/* Price */}
        <div className="flex flex-col pt-6 gap-0.5">
          <span className="text-xl font-bold text-foreground">
            {formatMainPrice(property.businessType, property.price, property.rentPrice)}
          </span>
          {property.condoFee && (
            <span className="text-sm text-foreground-subtle">
              Condomínio: {formatPrice(property.condoFee)}/mês
            </span>
          )}
        </div>

        <hr className="border-bs-gray-300 my-2" />

        {/* Property details wrapper */}
        <div className="flex flex-col gap-1.5">
          {/* Property type — card style */}
          <span className="text-sm text-muted-foreground tracking-wide">
            {PropertyTypeLabel[property.type]}
          </span>

          {/* Location */}
          <p className="font-bold text-sm text-foreground-subtle">
            {property.neighborhood}, {property.city} – {property.state}
          </p>

          {/* Quick specs row — area, bedrooms, bathrooms, parking only */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground">
            {(() => {
              const items = [];

              if (property.totalArea) {
                items.push(<span key="area">{formatArea(property.totalArea)}</span>);
              }
              if (property.bedrooms != null) {
                items.push(
                  <span key="bed">
                    {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
                  </span>,
                );
              }
              if (property.bathrooms != null) {
                items.push(
                  <span key="bath">
                    {property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}
                  </span>,
                );
              }
              if (property.parkingSpaces != null) {
                items.push(
                  <span key="parking">
                    {property.parkingSpaces} {property.parkingSpaces === 1 ? 'vaga' : 'vagas'}
                  </span>,
                );
              }

              return items.flatMap((item, i) => [
                item,
                i < items.length - 1 && (
                  <span key={`dot-${i}`} className="text-foreground-subtle">
                    •
                  </span>
                ),
              ]);
            })()}
          </div>
        </div>

        {/* WhatsApp CTA 1 — inline */}
        {whatsUrl && (
          <div ref={ctaRef}>
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action text-base font-semibold text-white transition-transform active:scale-[0.98] my-4"
            >
              <FaWhatsapp size={22} />
              Conversar conosco agora
            </a>
          </div>
        )}

        {/* Values and Deals wrapper */}
        <div className="flex flex-col gap-5">
          <h2 className="text-base font-semibold text-foreground">Valores e Negócios</h2>
          <div className="flex flex-wrap gap-2">
            <Badge color={property.businessType === BusinessType.SALE ? 'action' : 'accent'}>
              {BusinessTypeLabel[property.businessType]}
            </Badge>
            {property.saleTypes.map((st) => (
              <Badge key={st.id} color="border">
                {SaleTypeLabel[st.type]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-2xl font-bold text-foreground">
              {formatMainPrice(property.businessType, property.price, property.rentPrice)}
            </span>
            {property.condoFee && (
              <span className="text-sm text-foreground-subtle">
                Condomínio: {formatPrice(property.condoFee)}/mês
              </span>
            )}
          </div>
        </div>

        <hr className="border-bs-gray-300 my-6" />

        {/* Spec grid — type-specific + basic specs */}
        <PropertySpecGrid property={property} />

        <hr className="border-bs-gray-300 my-6" />

        {/* Description */}
        {property.description && (
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-foreground">Descrição</h2>
            <p className=" leading-relaxed text-foreground-subtle">{property.description}</p>
          </div>
        )}

        <hr className="border-bs-gray-300 my-6" />

        {/* Property code */}
        <div>
          <Badge color="border">Cód. Prop: {property.code}</Badge>
        </div>

        {/* Map section */}
        {hasCoords(property.location) && (
          <>
            <hr className="border-bs-gray-300 my-6" />

            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">Localização</h2>

              {/* Inline map - read-only */}
              {mapCenter && (
                <div
                  className={twMerge(
                    'relative isolate h-96 w-full rounded-lg overflow-hidden cursor-pointer',
                    mapFullscreen && 'invisible',
                  )}
                  onClick={() => setMapFullscreen(true)}
                >
                  <PropertyMap center={mapCenter} interactive={false} className="h-full w-full" />
                </div>
              )}

              {/* Address text */}
              <p className="text-sm text-foreground-subtle">
                {property.location.neighborhood}, {property.location.city} —{' '}
                {property.location.state}
              </p>

              {/* Fixed padding to prevent content from being covered by sticky CTA */}
              <div className="h-24" aria-hidden="true" />
            </div>
          </>
        )}
      </PageContainer>

      {/* Gallery overlay */}
      <AnimatePresence>
        {galleryOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 400 }}
            className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto"
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
      </AnimatePresence>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <PropertyMediaViewer
            images={allImages}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen map overlay */}
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
      </AnimatePresence>

      {/* WhatsApp CTA 2 — sticky, appears when CTA1 is covered by sticky header */}
      <AnimatePresence>
        {whatsUrl && stickyCtaVisible && stickyHeaderVisible && !mapFullscreen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] pt-3 bg-surface-raised border-t border-border shadow-lg"
          >
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action text-base font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <FaWhatsapp size={22} />
              Conversar conosco agora
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky back button header — appears when carousel scrolls out of view */}
      <AnimatePresence>
        {stickyHeaderVisible && !mapFullscreen && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 400 }}
            className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-border bg-surface-raised px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] shadow-sm"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="flex size-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90"
            >
              <ChevronLeft size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────── Badge ──────────────────── */
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    action: 'bg-action/10 text-action',
    accent: 'bg-accent/10 text-accent',
    border: 'bg-border text-foreground-subtle',
  };
  return (
    <span
      className={twMerge(
        'rounded-full px-3 py-1.5 text-xs font-semibold',
        colorMap[color] ?? colorMap.border,
      )}
    >
      {children}
    </span>
  );
}

/* ──────────────────── Spec grid ──────────────────── */
function SpecItem({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex h-full items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-3">
      <span className="text-foreground-subtle">{icon}</span>
      <div className="flex flex-col">
        <span className="text-sm text-foreground">{label}</span>
        {sublabel && <span className="text-xs text-foreground-subtle">{sublabel}</span>}
      </div>
    </div>
  );
}

function PropertySpecGrid({ property }: { property: PropertyDetailDto }) {
  const items: { icon: React.ReactNode; label: string; sublabel?: string }[] = [];

  // Area items — shown separately so both are visible when available
  if (property.builtArea != null) {
    items.push({
      icon: <Ruler size={20} />,
      label: formatArea(property.builtArea),
      sublabel: 'Área construída',
    });
  }
  if (property.totalArea != null) {
    items.push({
      icon: <Maximize size={20} />,
      label: formatArea(property.totalArea),
      sublabel: 'Área total',
    });
  }

  // Bedrooms + suites in a single card
  if (property.bedrooms != null) {
    const bedroomLabel = `${property.bedrooms} ${property.bedrooms === 1 ? 'quarto' : 'quartos'}`;
    const suiteLabel =
      property.suites != null
        ? `(${property.suites} ${property.suites === 1 ? 'suíte' : 'suítes'})`
        : undefined;

    items.push({
      icon: <Bed size={20} />,
      label: bedroomLabel,
      sublabel: suiteLabel,
    });
  }

  if (property.bathrooms != null) {
    items.push({
      icon: <Bath size={20} />,
      label: `${property.bathrooms} ${property.bathrooms === 1 ? 'banheiro' : 'banheiros'}`,
    });
  }
  if (property.parkingSpaces != null) {
    items.push({
      icon: <Car size={20} />,
      label: `${property.parkingSpaces} ${property.parkingSpaces === 1 ? 'vaga' : 'vagas'}`,
    });
  }

  // Type-specific details
  const d = property.details;

  if (property.type === PropertyType.HOUSE && d) {
    const h = d as HouseDetailsDto;
    items.push({
      icon: <Layers size={20} />,
      label: h.floors === 1 ? 'Térrea' : `${h.floors} andares`,
    });
    if (h.isInCondominium && h.condominiumName) {
      items.push({ icon: <Building2 size={20} />, label: `Cond.: ${h.condominiumName}` });
    }
  }

  if (property.type === PropertyType.APARTMENT && d) {
    const a = d as ApartmentDetailsDto;
    items.push({
      icon: <Building2 size={20} />,
      label: a.isGroundFloor ? 'Térreo' : `${a.floor}º andar`,
    });
    if (a.hasElevator) items.push({ icon: <ArrowUp size={20} />, label: 'Elevador' });
    if (a.hasBalcony) items.push({ icon: <Wind size={20} />, label: 'Varanda' });
    if (a.hasPool) items.push({ icon: <Waves size={20} />, label: 'Piscina' });
    items.push({ icon: <Sun size={20} />, label: SunPositionLabel[a.sunPosition] });
  }

  if (property.type === PropertyType.LAND && d) {
    const l = d as LandDetailsDto;
    items.push({ icon: <MapIcon size={20} />, label: formatZoning(l.zoning) });
    items.push({ icon: <Triangle size={20} />, label: TopographyLabel[l.topography] });
  }

  if (property.type === PropertyType.SMALL_FARM && d) {
    const sf = d as SmallFarmDetailsDto;
    items.push({ icon: <Droplets size={20} />, label: WaterSourceLabel[sf.waterSource] });
    if (sf.hasHouse) items.push({ icon: <HomeIcon size={20} />, label: 'Casa sede' });
    if (sf.hasPool) items.push({ icon: <Waves size={20} />, label: 'Piscina' });
    if (sf.hasLake) items.push({ icon: <Fish size={20} />, label: 'Lago' });
    if (sf.hasFruitTrees) items.push({ icon: <Trees size={20} />, label: 'Pomar' });
  }

  if (property.type === PropertyType.COUNTRY_HOUSE && d) {
    const ch = d as CountryHouseDetailsDto;
    if (ch.hasRiver) items.push({ icon: <Workflow size={20} />, label: 'Rio' });
    if (ch.hasSpring) items.push({ icon: <Droplets size={20} />, label: 'Nascente' });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-base font-semibold text-foreground">Características</h2>
      <div className="grid grid-cols-2 gap-4" style={{ gridAutoRows: '1fr' }}>
        {items.map((item, i) => (
          <SpecItem key={i} icon={item.icon} label={item.label} sublabel={item.sublabel} />
        ))}
      </div>
    </div>
  );
}
