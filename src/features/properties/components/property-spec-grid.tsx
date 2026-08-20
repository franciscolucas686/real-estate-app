import {
  ArrowUp,
  Bath,
  Bed,
  Building2,
  Car,
  Droplets,
  Fish,
  Home as HomeIcon,
  Layers,
  Map as MapIcon,
  Maximize,
  Ruler,
  Sun,
  Trees,
  Triangle,
  Waves,
  Wind,
  Workflow,
} from 'lucide-react';
import {
  formatArea,
  formatZoning,
  SunPositionLabel,
  TopographyLabel,
  WaterSourceLabel,
} from '@/shared/format';
import { PropertyType } from '@/shared/api/types';
import type {
  ApartmentDetailsDto,
  CountryHouseDetailsDto,
  HouseDetailsDto,
  LandDetailsDto,
  PropertyDetailDto,
  SmallFarmDetailsDto,
} from '@/shared/api/types';

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

export function PropertySpecGrid({
  property,
  showHeading = true,
}: {
  property: PropertyDetailDto;
  showHeading?: boolean;
}) {
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
      items.push({ icon: <Building2 size={20} />, label: `Cond. ${h.condominiumName}` });
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
      {showHeading && (
        <h2 className="text-lg font-semibold text-foreground md:text-xl">Características</h2>
      )}
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
        style={{ gridAutoRows: '1fr' }}
      >
        {items.map((item, i) => (
          <SpecItem key={i} icon={item.icon} label={item.label} sublabel={item.sublabel} />
        ))}
      </div>
    </div>
  );
}
