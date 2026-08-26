import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPress } from './use-long-press';

/** Um evento de ponteiro com só o que o hook lê. */
function pointer(
  overrides: Partial<{ pointerType: string; clientX: number; clientY: number }> = {},
) {
  return {
    pointerType: 'touch',
    clientX: 0,
    clientY: 0,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.PointerEvent<HTMLElement>;
}

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(enabled = true) {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ enabled, onLongPress }));
    return { onLongPress, handlers: () => result.current };
  }

  it('dispara depois de 2 segundos com o dedo parado', () => {
    const { onLongPress, handlers } = setup();

    act(() => handlers().onPointerDown(pointer()));
    act(() => vi.advanceTimersByTime(1999));
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('um toque curto não dispara nada', () => {
    const { onLongPress, handlers } = setup();

    act(() => handlers().onPointerDown(pointer()));
    act(() => vi.advanceTimersByTime(300));
    act(() => handlers().onPointerUp(pointer()));
    act(() => vi.advanceTimersByTime(5000));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  // Rolar a grade com o dedo é o gesto mais comum desta tela; ele não pode virar uma folha
  // de ações aberta sozinha.
  it('cancela quando o dedo anda mais que o limiar', () => {
    const { onLongPress, handlers } = setup();

    act(() => handlers().onPointerDown(pointer()));
    act(() => handlers().onPointerMove(pointer({ clientY: 20 })));
    act(() => vi.advanceTimersByTime(5000));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('um tremor dentro do limiar não cancela', () => {
    const { onLongPress, handlers } = setup();

    act(() => handlers().onPointerDown(pointer()));
    act(() => handlers().onPointerMove(pointer({ clientX: 4, clientY: 4 })));
    act(() => vi.advanceTimersByTime(2000));

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  // No desktop a mesma ação já está no overlay de hover; segurar o botão do mouse não é
  // intenção de nada.
  it('ignora o mouse', () => {
    const { onLongPress, handlers } = setup();

    act(() => handlers().onPointerDown(pointer({ pointerType: 'mouse' })));
    act(() => vi.advanceTimersByTime(5000));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('não dispara quando está desligado', () => {
    const { onLongPress, handlers } = setup(false);

    act(() => handlers().onPointerDown(pointer()));
    act(() => vi.advanceTimersByTime(5000));

    expect(onLongPress).not.toHaveBeenCalled();
  });
});
