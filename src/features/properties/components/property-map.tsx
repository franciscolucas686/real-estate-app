import { memo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface PropertyMapProps {
  center: LatLngExpression;
  interactive?: boolean;
  className?: string;
}

/**
 * Optimized Leaflet map component for property locations.
 * Configured for performance and smooth tile loading.
 */
export const PropertyMap = memo<PropertyMapProps>(
  ({ center, interactive = true, className }) => {
    return (
      <div className={className}>
        <MapContainer
          center={center}
          zoom={15}
          minZoom={10}
          maxZoom={18}
          zoomSnap={0.5}
          zoomDelta={0.5}
          dragging={interactive}
          touchZoom={interactive}
          scrollWheelZoom={interactive}
          doubleClickZoom={interactive}
          boxZoom={interactive}
          keyboard={interactive}
          zoomControl={interactive}
          attributionControl={false}
          preferCanvas={true}
          wheelPxPerZoomLevel={120}
          tapTolerance={15}
          wheelDebounceTime={100}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            // 19, not 18: with detectRetina on, Leaflet auto-decrements the layer's own
            // maxZoom by 1 on retina screens (to compensate for @2x tiles), which used to
            // leave it one level below the map's maxZoom=18 and blanked tiles at max zoom
            // on retina devices. 19 here lands on 18 after that adjustment.
            maxZoom={19}
            maxNativeZoom={18}
            minZoom={10}
            tileSize={256}
            keepBuffer={interactive ? 3 : 2}
            updateWhenIdle={true}
            updateWhenZooming={false}
            opacity={1}
            zIndex={1}
            detectRetina={true}
            crossOrigin={true}
          />
          <Marker position={center} />
        </MapContainer>
      </div>
    );
  },
  // Only re-render if center coordinates actually change
  (prevProps, nextProps) => {
    const prevCenter = prevProps.center as [number, number];
    const nextCenter = nextProps.center as [number, number];
    return (
      prevCenter[0] === nextCenter[0] &&
      prevCenter[1] === nextCenter[1] &&
      prevProps.interactive === nextProps.interactive
    );
  },
);

PropertyMap.displayName = 'PropertyMap';
