import { useEffect, useRef } from 'react';

/** Quanto tempo o dedo precisa ficar parado sobre a foto. */
const LONG_PRESS_MS = 2000;

/**
 * O mesmo limiar com que `useSwipeToSelect` decide que o gesto virou arrasto. Compartilhar o
 * número não é economia: os dois gestos disputam o mesmo pointerdown na grade de fotos, e um
 * limiar menor aqui faria o long-press cancelar antes de o outro se decidir — ou, ao
 * contrário, disparar durante uma rolagem que o outro já classificou como scroll.
 */
const MOVE_TOLERANCE_PX = 8;

export interface UseLongPressOptions {
  enabled: boolean;
  onLongPress: () => void;
  durationMs?: number;
  moveTolerancePx?: number;
}

export interface LongPressHandlers {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
  onPointerLeave: React.PointerEventHandler<HTMLElement>;
  onContextMenu: React.MouseEventHandler<HTMLElement>;
}

/**
 * Dispara uma ação quando o dedo fica parado sobre o elemento pelo tempo configurado.
 *
 * **Só para toque e caneta.** No mouse o gesto não vale: segurar o botão sobre uma foto não é
 * intenção de nada, e no desktop a mesma ação já está no overlay de hover. Restringir também
 * evita que um clique demorado, que acontece por acidente, abra uma folha de ações.
 *
 * Cancela em três situações, e todas importam: o dedo saiu antes do tempo (é um toque), o
 * dedo andou mais que o limiar (é uma rolagem ou um arrasto de seleção), ou o navegador
 * cancelou o ponteiro. O `contextmenu` é suprimido apenas no toque, onde o menu nativo de
 * imagem ("salvar imagem") competiria com este gesto pelo mesmo segundo de pressão.
 */
export function useLongPress({
  enabled,
  onLongPress,
  durationMs = LONG_PRESS_MS,
  moveTolerancePx = MOVE_TOLERANCE_PX,
}: UseLongPressOptions): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isTouch = useRef(false);

  function cancel() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  // Um gesto interrompido por navegação deixaria o timer vivo apontando para um callback de
  // uma tela que não existe mais.
  useEffect(() => cancel, []);

  return {
    onPointerDown(e) {
      cancel();
      if (!enabled || e.pointerType === 'mouse') return;

      isTouch.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, durationMs);
    },
    onPointerMove(e) {
      if (timer.current === null) return;

      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > moveTolerancePx || dy > moveTolerancePx) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu(e) {
      if (enabled && isTouch.current) e.preventDefault();
    },
  };
}
