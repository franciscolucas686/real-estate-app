import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Carousel } from '@/ui/carousel';

/**
 * The carousel is embedded in a clickable `<article>` on the listing card, which is what
 * makes propagation part of its contract rather than an implementation detail: its arrows
 * and dots sit *outside* the track, so the drag-suppression `onClickCapture` in
 * `useCarouselSwipe` never sees their clicks. Before this, clicking a dot on a card
 * navigated to the property instead of paging the photo.
 */

const SLIDES = [
  <img key="a" src="/a.jpg" alt="Foto 1" />,
  <img key="b" src="/b.jpg" alt="Foto 2" />,
];

/** Mirrors `PropertyCard`, whose whole `<article>` navigates on click. */
function renderInClickable(ui: React.ReactElement) {
  const onAncestorClick = vi.fn();
  render(<div onClick={onAncestorClick}>{ui}</div>);
  return { onAncestorClick };
}

describe('Carousel', () => {
  it('mostra as setas por padrão', () => {
    render(<Carousel>{SLIDES}</Carousel>);

    expect(screen.getByRole('button', { name: 'Próxima imagem' })).toBeInTheDocument();
  });

  it('showArrows={false} remove as setas sem tirar os dots', () => {
    render(<Carousel showArrows={false}>{SLIDES}</Carousel>);

    expect(screen.queryByRole('button', { name: 'Próxima imagem' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Imagem anterior' })).toBeNull();

    // Os dots continuam sendo o caminho de clique para paginar, e o indicador de que há mais
    // de uma foto — sem eles o card não sinalizaria nada depois que as setas saem.
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toBeInTheDocument();
  });

  it('o dot pagina sem acionar o clique do ancestral', async () => {
    const user = userEvent.setup();
    const { onAncestorClick } = renderInClickable(<Carousel showArrows={false}>{SLIDES}</Carousel>);

    await user.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute('data-active');
    expect(onAncestorClick).not.toHaveBeenCalled();
  });

  it('a seta pagina sem acionar o clique do ancestral', async () => {
    const user = userEvent.setup();
    const { onAncestorClick } = renderInClickable(<Carousel>{SLIDES}</Carousel>);

    await user.click(screen.getByRole('button', { name: 'Próxima imagem' }));

    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute('data-active');
    expect(onAncestorClick).not.toHaveBeenCalled();
  });
});
