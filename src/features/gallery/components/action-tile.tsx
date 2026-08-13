import type { ReactNode } from 'react';

interface ActionTileProps {
  icon: ReactNode;
  label: string;
  /** Full accessible name, when the visible label alone would be ambiguous. Must contain
   *  `label` verbatim — WCAG 2.5.3, Label in Name. */
  ariaLabel?: string;
  onClick: () => void;
}

/**
 * A card that sits *in* a photo grid, exactly the size of a photo: "Gerenciar fotos" at the end
 * of a section, "Adicionar fotos" at the end of the room manager's grid. One component with one
 * set of classes so the two read as the same kind of thing wherever they appear — they used to
 * be a dashed upload tile inside the grid and a "Ver mais" text link below it, which read as two
 * unrelated things and left a room with no photos showing only one of them.
 */
export function ActionTile({ icon, label, ariaLabel, onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-2 text-center text-foreground-subtle transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hover:border-foreground-subtle/40 md:hover:bg-surface-raised"
    >
      {icon}
      <span className="text-xs font-medium leading-tight">{label}</span>
    </button>
  );
}
