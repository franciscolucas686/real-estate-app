import { useState } from 'react';
import { cn } from '@/shared/cn';
import { imageUrl } from '@/shared/image-url';
import type { PropertyImageDto } from '@/shared/api/types';
import { Carousel } from '@/ui/carousel';

interface PropertyMediaCarouselProps {
  images: PropertyImageDto[];
  className?: string;
  /** Below `md`: the whole photo opens the mosaic. */
  onOpenGallery?: () => void;
  /** From `md` up: the photo opens the fullscreen viewer on the slide that was clicked. */
  onOpenViewer?: (index: number) => void;
  showDots?: boolean;
}

export function PropertyMediaCarousel({
  images,
  className,
  onOpenGallery,
  onOpenViewer,
  showDots = true,
}: PropertyMediaCarouselProps) {
  // Only needed for the roving tabindex below — the click itself uses the slide's own `i`.
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          // Same proportions as a real photo below, at both breakpoints, or the "no
          // photos" box stands exactly where the height was just taken out.
          'flex aspect-4/3 w-full items-center justify-center bg-border md:aspect-16/9 lg:aspect-21/9',
          className,
        )}
      >
        <span className="text-sm text-muted-foreground">Sem fotos</span>
      </div>
    );
  }

  return (
    <div data-slot="property-media-carousel" className={cn('relative w-full', className)}>
      <Carousel showDots={showDots} onSlideChange={setCurrent}>
        {images.map((img, i) => (
          /*
            Two click surfaces, mutually exclusive by breakpoint, because the destination
            differs by viewport and this app decides that in CSS — there is no
            `useIsDesktop` to branch on, by design. They sit inside the slide rather than
            over the carousel as a whole: a single overlay outside would paint above the
            `Carousel`'s prev/next arrows and kill them.

            Dragging still works. `trackHandlers` are React handlers on the track, and
            events from a descendant bubble up to it, so an overlay does not swallow the
            gesture.
          */
          <div key={img.id} className="relative">
            {/*
              Three proportions, and the middle one is not a compromise between the
              other two — each answers what is below the photo at that width.

              The phone's `4/3.5` in a desktop-width column is ~800px tall, which
              overflowed the viewport on its own and left the thumbnail strip born off
              screen. `21/9` from `lg` is the proportion that fits the photo *and* that
              strip in every window down to a 1366×768 laptop.

              Between `md` and `lg` there is no strip (`property-details.tsx` renders it
              `hidden lg:grid`), so the reason for `21/9` is absent and it would only
              waste the freed height: the column is 308–563px wide there, which at
              `21/9` is a 132–241px band of photo under a tablet's ~850px of room.
              `16/9` gives that height back. The two must move together — reintroducing
              the strip below `lg` without narrowing this back re-opens the overflow.

              The ceiling is the net, not the rule. Above `lg` it bites only under
              ~640px of usable height; below `lg` it is slack in every real window (see
              the two-band accounting in `index.css`). Where it does bite, the width
              stays 100% and only the height is clamped, so the frame goes wider still
              than the declared ratio — `object-cover` is what makes that a crop rather
              than a stretch.
            */}
            <img
              src={imageUrl(img.url, 'card')}
              alt={img.label ?? `Foto ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
              className="aspect-4/3.5 w-full object-cover md:aspect-16/9 md:max-h-(--property-photo-max-height) lg:aspect-21/9"
            />

            {/* `aria-hidden` and unfocusable on purpose: below `md` the "Ver todas" pill is
                the labelled, keyboard-reachable control for this exact action, and naming
                this too would put two near-identical names on the same photo. No regression
                either — it used to be an `<img onClick>`, which no keyboard could reach. */}
            {onOpenGallery && (
              <button
                type="button"
                data-slot="media-open-gallery"
                aria-hidden="true"
                tabIndex={-1}
                onClick={onOpenGallery}
                className="absolute inset-0 cursor-pointer md:hidden"
              />
            )}

            {/* A real button, unlike its mobile twin: from `md` up this is the only way the
                main photo itself can be reached, and the only labelled one — the pill that
                survives until `lg` opens the mosaic, not the viewer. `tabIndex` roves with
                the carousel — every slide is mounted, so without it N photos would mean N
                tab stops onto slides that are off screen. */}
            {onOpenViewer && (
              <button
                type="button"
                data-slot="media-open-viewer"
                aria-label={`Ampliar foto ${i + 1}`}
                tabIndex={i === current ? 0 : -1}
                onClick={() => onOpenViewer(i)}
                className="absolute inset-0 hidden cursor-pointer md:block"
              />
            )}
          </div>
        ))}
      </Carousel>

      {/* `lg:hidden`, tracking the strip rather than the photo's click surfaces: the mosaic
          loses its entry point exactly where the thumbnail strip gains one, so every width
          keeps some way to see that there is more than one photo. It was `md:hidden`, from
          when the strip also started at `md`; leaving it there would have left the md–lg
          band with no dots (`showDots={false}` at the call site), no pill, no strip, and
          arrows that only appear on hover — nothing at all on a touch tablet.

          Between `md` and `lg` the pill and the photo therefore lead to different places,
          the mosaic and the viewer, which is fine: they carry different names. */}
      {onOpenGallery && images.length > 1 && (
        <button
          type="button"
          onClick={onOpenGallery}
          className="absolute bottom-10 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm lg:hidden"
        >
          Ver todas ({images.length})
        </button>
      )}
    </div>
  );
}
