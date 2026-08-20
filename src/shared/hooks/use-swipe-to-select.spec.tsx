import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSwipeToSelect } from './use-swipe-to-select';

/**
 * Mirrors how `gallery-management.tsx` actually wires this up: the container gets
 * `containerProps`, and each item is a real `<button>` with its own `onClick` — the hook is
 * only ever an accelerator for the drag case, never the sole path to a toggle. A test that
 * only fired pointer events (skipping `onClick`) would miss exactly the bug this file guards
 * against: a plain click firing `onToggle` twice — once from the container's pointer
 * handling, once from the button's native `click` — which canceled itself out in the UI.
 */
function TestGrid({ onToggle }: { onToggle: (id: string) => void }) {
  const { containerProps } = useSwipeToSelect({ enabled: true, onToggle });
  return (
    <div {...containerProps}>
      <button data-swipe-select-id="a" onClick={() => onToggle('a')}>
        A
      </button>
      <button data-swipe-select-id="b" onClick={() => onToggle('b')}>
        B
      </button>
    </div>
  );
}

afterEach(() => {
  // src/test/setup.ts stubs this to always return null; each test below points it at a
  // real element instead, so it must not leak into other tests in this file.
  document.elementFromPoint = () => null;
});

describe('useSwipeToSelect', () => {
  it('um clique simples chama onToggle uma única vez, não duas', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TestGrid onToggle={onToggle} />);
    const a = screen.getByText('A');
    document.elementFromPoint = () => a;

    await user.click(a);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('a');
  });

  it('arrastar horizontalmente alterna cada item distinto sob o ponteiro', () => {
    const onToggle = vi.fn();
    render(<TestGrid onToggle={onToggle} />);
    const a = screen.getByText('A');
    const b = screen.getByText('B');
    document.elementFromPoint = (x: number) => (x < 50 ? a : b);

    fireEvent.pointerDown(a, { clientX: 10, clientY: 10, pointerId: 1 });
    // dx (50) clears dy (0) + threshold — classifies as a horizontal drag-select and
    // toggles the item the gesture started on.
    fireEvent.pointerMove(a, { clientX: 60, clientY: 10, pointerId: 1 });
    // Now over "b" — a different item, toggled too.
    fireEvent.pointerMove(a, { clientX: 90, clientY: 10, pointerId: 1 });

    expect(onToggle).toHaveBeenNthCalledWith(1, 'a');
    expect(onToggle).toHaveBeenNthCalledWith(2, 'b');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('um gesto majoritariamente vertical é tratado como rolagem, não seleção', () => {
    const onToggle = vi.fn();
    render(<TestGrid onToggle={onToggle} />);
    const a = screen.getByText('A');
    document.elementFromPoint = () => a;

    fireEvent.pointerDown(a, { clientX: 10, clientY: 10, pointerId: 1 });
    // dy (50) clears dx (2) + threshold — classifies as scroll, page is left alone.
    fireEvent.pointerMove(a, { clientX: 12, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(a, { clientX: 12, clientY: 60, pointerId: 1 });

    expect(onToggle).not.toHaveBeenCalled();
  });
});
