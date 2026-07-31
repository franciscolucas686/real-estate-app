import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/ui/modal';

/**
 * These cover the reasons the app moved off its two hand-rolled surfaces.
 *
 * `BottomSheet` had no `role="dialog"`, no accessible name, no Escape handler and
 * no focus trap — it assumed a tap on the backdrop was enough, which is only true
 * for a pointer user. `Dialog` had a focus trap, but one built by querying a fixed
 * list of focusable selectors. Both are now Radix's job, so what's worth asserting
 * is the contract the app depends on, not Radix's internals.
 */

function Harness({
  onClose = () => {},
  ...props
}: {
  onClose?: () => void;
  title?: string;
  hideTitle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <button type="button">Fora do modal</button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        title="Mais opções"
        {...props}
      >
        <button type="button">Ação interna</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('não renderiza nada enquanto fechado', () => {
    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ação interna' })).not.toBeInTheDocument();
  });

  it('expõe role="dialog" com nome acessível vindo do title', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('dialog', { name: 'Mais opções' })).toBeInTheDocument();
  });

  it('mantém o nome acessível mesmo com hideTitle (título só para leitores de tela)', async () => {
    const user = userEvent.setup();
    render(<Harness hideTitle />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Mais opções' });
    // O título continua no DOM, mas não deve aparecer como texto visível ao lado
    // do conteúdo — é isso que `hideTitle` significa.
    expect(within(dialog).getByText('Mais opções')).toHaveClass('sr-only');
  });

  it('Escape fecha — o BottomSheet antigo ignorava a tecla', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o botão de fechar dispara onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('devolve o foco ao gatilho depois de fechar', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await user.click(trigger);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('esconde o resto da árvore de leitores de tela enquanto aberto', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const outside = screen.getByRole('button', { name: 'Fora do modal' });
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');

    // Radix marca o conteúdo de fundo como aria-hidden. É a razão pela qual, em
    // testes que abrem um modal, queries acessíveis a elementos externos passam a
    // falhar e precisam ser escopadas com `within(dialog)`.
    await waitFor(() => {
      expect(outside.closest('[aria-hidden="true"]')).not.toBeNull();
    });
    expect(screen.queryByRole('button', { name: 'Fora do modal' })).not.toBeInTheDocument();
  });
});
