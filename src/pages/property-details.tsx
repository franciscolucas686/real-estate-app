import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Bed,
  Bath,
  Car,
  Maximize,
  Square,
  Home as HomeIcon,
  Layers,
  Building2,
  ArrowUp,
  Wind,
  Sun,
  Waves,
  Map,
  Triangle,
  Droplets,
  Trees,
  Fish,
  Workflow,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useProperty } from '../hooks/use-property';
import { PropertyMediaCarousel } from '../components/media/property-media-carousel';
import { PropertyMediaGallery } from '../components/media/property-media-gallery';
import { PropertyMediaViewer } from '../components/media/property-media-viewer';
import { PropertyDetailSkeleton } from '../components/ui/skeletons';
import { PageContainer } from '../components/ui/page-container';
import {
  formatPrice,
  formatArea,
  formatMainPrice,
  buildWhatsAppUrl,
  PropertyTypeLabel,
  BusinessTypeLabel,
  SaleTypeLabel,
  SunPositionLabel,
  ZoningLabel,
  TopographyLabel,
  WaterSourceLabel,
} from '../utils/format';
import {
  PropertyType,
  BusinessType,
  type PropertyDetailDto,
  type PropertyImageDto,
  type HouseDetailsDto,
  type ApartmentDetailsDto,
  type LandDetailsDto,
  type SmallFarmDetailsDto,
  type CountryHouseDetailsDto,
} from '../types/api';
import { twMerge } from 'tailwind-merge';

function flattenGallery(property: PropertyDetailDto): PropertyImageDto[] {
  const roomImages = property.gallery.rooms.flatMap((r) => r.images);
  const unassigned = property.gallery.unassigned ?? [];
  return [...roomImages, ...unassigned].sort((a, b) => a.order - b.order);
}

function getDisplayArea(property: PropertyDetailDto): number | null {
  if (property.type === PropertyType.APARTMENT) return property.builtArea;
  return property.totalArea;
}

export function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: property, isLoading } = useProperty(id!);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const allImages = property ? flattenGallery(property) : [];

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

  if (isLoading) return <PropertyDetailSkeleton />;

  if (!property) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <p className="text-sm text-foreground-subtle">Imóvel não encontrado.</p>
      </div>
    );
  }

  const displayArea = getDisplayArea(property);
  const whatsUrl = property.whatsappContact
    ? buildWhatsAppUrl(property.whatsappContact, property.code)
    : null;

  return (
    <div
      data-slot="page-property-details"
      className="-mt-[env(safe-area-inset-top,0px)] flex flex-col pb-24"
    >
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
          className="absolute left-3 top-[calc(env(safe-area-inset-top,16px)+12px)] z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Main content */}
      <PageContainer className="flex flex-col gap-4 py-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge color="primary">{PropertyTypeLabel[property.type]}</Badge>
          <Badge color={property.businessType === BusinessType.SALE ? 'action' : 'accent'}>
            {BusinessTypeLabel[property.businessType]}
          </Badge>
          {property.saleTypes.map((st) => (
            <Badge key={st.id} color="border">
              {SaleTypeLabel[st.type]}
            </Badge>
          ))}
        </div>

        {/* Price */}
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-bold text-foreground">
            {formatMainPrice(property.businessType, property.price, property.rentPrice)}
          </span>
          {property.condoFee && (
            <span className="text-sm text-foreground-subtle">
              Condomínio: {formatPrice(property.condoFee)}/mês
            </span>
          )}
        </div>

        {/* Location */}
        <p className="text-sm text-foreground-subtle">
          {property.neighborhood}, {property.city} – {property.state}
        </p>

        {/* Quick specs row */}
        <div className="flex flex-wrap gap-4 text-sm text-foreground">
          {displayArea && (
            <span className="flex items-center gap-1.5">
              {property.type === PropertyType.APARTMENT ? (
                <Square size={16} />
              ) : (
                <Maximize size={16} />
              )}
              {formatArea(displayArea)}
            </span>
          )}
          {property.bedrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bed size={16} /> {property.bedrooms} quarto{property.bedrooms !== 1 ? 's' : ''}
            </span>
          )}
          {property.suites != null && (
            <span className="flex items-center gap-1.5">
              <Layers size={16} /> {property.suites} suíte{property.suites !== 1 ? 's' : ''}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bath size={16} /> {property.bathrooms} banheiro{property.bathrooms !== 1 ? 's' : ''}
            </span>
          )}
          {property.parkingSpaces != null && (
            <span className="flex items-center gap-1.5">
              <Car size={16} /> {property.parkingSpaces} vaga
              {property.parkingSpaces !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* WhatsApp CTA 1 — inline */}
        {whatsUrl && (
          <div ref={ctaRef}>
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-whatsapp text-base font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <FaWhatsapp size={22} />
              Conversar conosco agora
            </a>
          </div>
        )}

        {/* Type-specific details */}
        <PropertySpecGrid property={property} />

        {/* Description */}
        {property.description && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h2 className="text-base font-semibold text-foreground">Descrição</h2>
            <p className="text-sm leading-relaxed text-foreground-subtle">{property.description}</p>
          </div>
        )}

        {/* Property code */}
        <div className="border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">Cód. Prop: {property.code}</span>
        </div>
      </PageContainer>

      {/* Gallery overlay */}
      <AnimatePresence>
        {galleryOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
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

      {/* WhatsApp CTA 2 — sticky, appears when CTA1 leaves viewport */}
      <AnimatePresence>
        {whatsUrl && stickyCtaVisible && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-3 bg-surface-raised border-t border-border shadow-lg"
          >
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-whatsapp text-base font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <FaWhatsapp size={22} />
              Conversar conosco agora
            </a>
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
        'rounded-full px-3 py-1 text-xs font-semibold',
        colorMap[color] ?? colorMap.border,
      )}
    >
      {children}
    </span>
  );
}

/* ──────────────────── Spec grid ──────────────────── */
function SpecItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-3">
      <span className="text-foreground-subtle">{icon}</span>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

function PropertySpecGrid({ property }: { property: PropertyDetailDto }) {
  const items: { icon: React.ReactNode; label: string }[] = [];

  // Type-specific details
  const d = property.details;

  if (property.type === PropertyType.HOUSE && d) {
    const h = d as HouseDetailsDto;
    items.push({
      icon: <HomeIcon size={16} />,
      label: h.floors === 1 ? 'Térrea' : `${h.floors} andares`,
    });
    if (h.isInCondominium && h.condominiumName) {
      items.push({ icon: <Building2 size={16} />, label: `Cond.: ${h.condominiumName}` });
    }
  }

  if (property.type === PropertyType.APARTMENT && d) {
    const a = d as ApartmentDetailsDto;
    items.push({
      icon: <Building2 size={16} />,
      label: a.isGroundFloor ? 'Térreo' : `${a.floor}º andar`,
    });
    if (a.hasElevator) items.push({ icon: <ArrowUp size={16} />, label: 'Elevador' });
    if (a.hasBalcony) items.push({ icon: <Wind size={16} />, label: 'Varanda' });
    if (a.hasPool) items.push({ icon: <Waves size={16} />, label: 'Piscina' });
    items.push({ icon: <Sun size={16} />, label: SunPositionLabel[a.sunPosition] });
  }

  if (property.type === PropertyType.LAND && d) {
    const l = d as LandDetailsDto;
    items.push({ icon: <Map size={16} />, label: ZoningLabel[l.zoning] });
    items.push({ icon: <Triangle size={16} />, label: TopographyLabel[l.topography] });
  }

  if (property.type === PropertyType.SMALL_FARM && d) {
    const sf = d as SmallFarmDetailsDto;
    items.push({ icon: <Droplets size={16} />, label: WaterSourceLabel[sf.waterSource] });
    if (sf.hasHouse) items.push({ icon: <HomeIcon size={16} />, label: 'Casa sede' });
    if (sf.hasPool) items.push({ icon: <Waves size={16} />, label: 'Piscina' });
    if (sf.hasLake) items.push({ icon: <Fish size={16} />, label: 'Lago' });
    if (sf.hasFruitTrees) items.push({ icon: <Trees size={16} />, label: 'Pomar' });
  }

  if (property.type === PropertyType.COUNTRY_HOUSE && d) {
    const ch = d as CountryHouseDetailsDto;
    if (ch.hasRiver) items.push({ icon: <Workflow size={16} />, label: 'Rio' });
    if (ch.hasSpring) items.push({ icon: <Droplets size={16} />, label: 'Nascente' });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h2 className="text-base font-semibold text-foreground">Características</h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => (
          <SpecItem key={i} icon={item.icon} label={item.label} />
        ))}
      </div>
    </div>
  );
}
