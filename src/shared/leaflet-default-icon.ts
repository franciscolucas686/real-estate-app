// Leaflet's default marker icon resolves its PNG paths by reading the computed
// `background-image` of a `.leaflet-default-icon-path` div and stripping the
// `marker-icon.png` suffix off that URL. Vite's production build inlines that
// PNG as a base64 data: URI (it's under the default 4KB assetsInlineLimit),
// which the suffix-stripping heuristic can't parse — the marker's <img> gets an
// invalid src and silently fails to load, in production only (dev serves the
// file at its own URL, where the heuristic still works).
//
// `?url` alone still lets Vite inline small files as base64 below
// `assetsInlineLimit` (these PNGs are ~1-1.5KB, under the 4KB default) — the
// `no-inline` modifier is what actually forces a real, resolvable asset URL.
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png?url&no-inline';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url&no-inline';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png?url&no-inline';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
