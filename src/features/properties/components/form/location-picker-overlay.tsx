import { useCallback, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/shared/api/api-client';
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface GeoResult {
  neighborhood?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

export function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface LocationPickerOverlayProps {
  onClose: () => void;
  onConfirm: (lat: number, lng: number, city: string, state: string, neighborhood: string) => void;
  initialCenter?: [number, number];
  initialAddress?: { city: string; state: string; neighborhood: string };
}

export function LocationPickerOverlay({
  onClose,
  onConfirm,
  initialCenter,
  initialAddress,
}: LocationPickerOverlayProps) {
  const needsGeocode =
    !initialCenter &&
    Boolean(initialAddress?.city || initialAddress?.state || initialAddress?.neighborhood);

  const [markerPos, setMarkerPos] = useState<[number, number] | null>(initialCenter ?? null);
  const [resolved, setResolved] = useState<GeoResult | null>(
    initialAddress?.city || initialAddress?.state || initialAddress?.neighborhood
      ? {
          neighborhood: initialAddress?.neighborhood || undefined,
          city: initialAddress?.city || undefined,
          state: initialAddress?.state || undefined,
        }
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(needsGeocode);
  const [geocodedCenter, setGeocodedCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!needsGeocode) return;

    let cancelled = false;

    apiFetch<{ latitude: number; longitude: number } | null>('/geocode/forward', {
      method: 'POST',
      body: JSON.stringify({
        neighborhood: initialAddress?.neighborhood ?? '',
        city: initialAddress?.city ?? '',
        state: initialAddress?.state ?? '',
      }),
    })
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setGeocodedCenter([result.latitude, result.longitude]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });

    return () => {
      cancelled = true;
    };
    // Component remounts fresh on every open (parent uses {mapOpen && <.../>}), so deps are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = useCallback(async (lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    setLoading(true);
    try {
      const result = await apiFetch<GeoResult>('/geocode/reverse', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      setResolved(result);
    } catch {
      setResolved(null);
    } finally {
      setLoading(false);
    }
  }, []);

  if (geocoding) {
    return (
      <div className="fixed inset-0 z-(--z-fixed) flex flex-col bg-background">
        <div className="flex shrink-0 items-center gap-3 bg-background px-4 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full"
            aria-label="Fechar mapa"
          >
            <ChevronLeft size={24} />
          </button>
          <p className="text-sm font-semibold text-foreground">Selecionar localização</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-action" />
        </div>
      </div>
    );
  }

  const effectiveCenter: [number, number] = initialCenter ?? geocodedCenter ?? [-23.5505, -46.6333];
  const center: LatLngExpression = markerPos ?? effectiveCenter;

  return (
    <div className="fixed inset-0 z-(--z-fixed) flex flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 bg-background px-4 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3">
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full"
          aria-label="Fechar mapa"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Selecionar localização</p>
          {loading && <p className="text-xs text-muted-foreground">Buscando endereço…</p>}
          {!loading && resolved?.city && (
            <p className="text-xs text-foreground-subtle">
              {resolved.neighborhood ? `${resolved.neighborhood}, ` : ''}
              {resolved.city} – {resolved.state}
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={18}
          />
          <MapClickHandler onClick={handleClick} />
          {markerPos && <Marker position={markerPos} />}
        </MapContainer>

        <div className="absolute inset-x-0 bottom-0 z-(--z-map-overlay) flex justify-center pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
          <button
            type="button"
            disabled={!markerPos || loading || !resolved?.neighborhood}
            onClick={() => {
              if (!markerPos || !resolved?.neighborhood) return;
              onConfirm(
                markerPos[0],
                markerPos[1],
                resolved?.city ?? '',
                resolved?.state ?? '',
                resolved?.neighborhood ?? '',
              );
            }}
            className="flex h-14 w-[90%] md:w-[30%] items-center justify-center rounded-xl bg-action text-base font-semibold text-white shadow-lg disabled:opacity-60"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────
