import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../ui/Icon.tsx';
import {
  QUANTITY_COUNT_MIN_PX,
  QUANTITY_COUNT_PADDING_PX,
  QUANTITY_FONT_PX,
  TILE_TAB_BUTTON_PX,
  TILE_TAB_GAP_PX,
  TILE_TAB_HEIGHT_CSS,
  WARNING_MARK_PX,
  type TileTabRows,
} from './tile-tab-geometry.ts';
import { SIBLING_RING_PX } from './tile-rings.ts';
import { BUTTON_STATES } from '../../ui/board-styles.ts';

const BUTTON_SIZE: CSSProperties = { width: TILE_TAB_BUTTON_PX, height: TILE_TAB_BUTTON_PX };

/**
 * The band at the foot of a button resting on the card, as thick as the sibling ring: it keeps the
 * tab's colour under the hover, so the tab and the card's edge stay one frame.
 */
const CARD_EDGE_BAND = 'bg-clip-padding';
const CARD_EDGE_BAND_STYLE: CSSProperties = { borderBottomWidth: SIBLING_RING_PX };

/** The copies of the tile, which its minus and plus change. */
interface TileTabQuantity {
  readonly count: number;
  readonly decreaseLabel: string;
  readonly increaseLabel: string;
  /** Gives the tile `count` copies of its print; at zero the tile goes. */
  readonly onChange: (count: number) => void;
}

/** The flip of a double-faced card, which turns the tile to its other face. */
interface TileTabFlip {
  readonly label: string;
  readonly isFlipped: boolean;
  readonly onFlip: () => void;
}

interface TileTabProps {
  /** One row with the flip and the warning beside the quantity, or two with them above it. */
  readonly rows: TileTabRows;
  /** The quantity's colour, a CSS colour: the sibling group's, or the plain one. */
  readonly quantityColour: string;
  readonly quantity: TileTabQuantity;
  /** `null` for a single-faced print. */
  readonly flip: TileTabFlip | null;
  /** What the mark of the print's warning says: `null` for a print without one. */
  readonly warningLabel: string | null;
}

/** The outer top corner of the quantity each step button rounds: the minus its left, the plus its right. */
const OUTER_CORNER = { left: 'rounded-tl-md', right: 'rounded-tr-md' } as const;

/**
 * The minus or the plus of the quantity, on its own background in `--quantity-colour`: a
 * background shared behind it would show as a dark thread along its rounded corner when the hover
 * fills it.
 */
function QuantityStepButton({
  symbol,
  label,
  side,
  onClick,
}: {
  readonly symbol: string;
  readonly label: string;
  readonly side: keyof typeof OUTER_CORNER;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`${OUTER_CORNER[side]} ${CARD_EDGE_BAND} border-(--quantity-colour) bg-(--quantity-colour) font-mono font-bold text-panel ${BUTTON_STATES}`}
      style={{ ...BUTTON_SIZE, ...CARD_EDGE_BAND_STYLE, fontSize: QUANTITY_FONT_PX }}
      aria-label={label}
      onClick={onClick}
    >
      {symbol}
    </button>
  );
}

/**
 * The `TileTab` above a tile's card: the quantity with a minus and a plus, centred on the card,
 * with the flip of a double-faced card leaning on its left and the mark of its print's warning on
 * its right, or both side by side above it when the card is too narrow for one row. Its buttons
 * are for the pointer: Tab stops on the tile, whose keys stand in for them.
 */
export function TileTab({ rows, quantityColour, quantity, flip, warningLabel }: TileTabProps) {
  const { t } = useTranslation();
  const quantityGroup = (
    <div className="flex shrink-0" style={{ '--quantity-colour': quantityColour } as CSSProperties}>
      <QuantityStepButton
        symbol={t('panel.minus')}
        label={quantity.decreaseLabel}
        side="left"
        onClick={() => quantity.onChange(quantity.count - 1)}
      />
      <span
        className="grid place-items-center bg-(--quantity-colour) font-mono font-bold text-panel tabular-nums"
        style={{
          height: TILE_TAB_BUTTON_PX,
          minWidth: QUANTITY_COUNT_MIN_PX,
          paddingInline: QUANTITY_COUNT_PADDING_PX,
          fontSize: QUANTITY_FONT_PX,
        }}
      >
        {t('line.quantity', { count: quantity.count })}
      </span>
      <QuantityStepButton
        symbol={t('panel.plus')}
        label={quantity.increaseLabel}
        side="right"
        onClick={() => quantity.onChange(quantity.count + 1)}
      />
    </div>
  );
  const flipButton = flip && (
    <button
      type="button"
      tabIndex={-1}
      className={`grid shrink-0 place-items-center rounded-t-md ${CARD_EDGE_BAND} border-foreground bg-foreground text-panel ${BUTTON_STATES}`}
      style={{ ...BUTTON_SIZE, ...CARD_EDGE_BAND_STYLE }}
      aria-label={flip.label}
      aria-pressed={flip.isFlipped}
      onClick={flip.onFlip}
    >
      <Icon name="flip" className="size-3.5" />
    </button>
  );
  const warningMark = warningLabel && (
    // Above the card, so it never covers the artist or copyright line.
    <span
      role="img"
      aria-label={warningLabel}
      title={warningLabel}
      className="grid shrink-0 place-items-center rounded-t-md bg-warning text-panel"
      style={{ width: WARNING_MARK_PX, height: TILE_TAB_BUTTON_PX }}
    >
      <Icon name="warning" />
    </span>
  );
  // Above the focus line, which meets the tab instead of crossing its buttons.
  const tabClass = 'relative z-20';
  if (rows === 2) {
    return (
      <div
        className={`${tabClass} flex flex-col items-center justify-end`}
        style={{ height: TILE_TAB_HEIGHT_CSS }}
      >
        {(flipButton || warningMark) && (
          <div className="flex items-end" style={{ columnGap: TILE_TAB_GAP_PX }}>
            {flipButton}
            {warningMark}
          </div>
        )}
        {quantityGroup}
      </div>
    );
  }
  return (
    <div
      className={`${tabClass} grid grid-cols-[1fr_auto_1fr] items-end`}
      style={{ height: TILE_TAB_HEIGHT_CSS, columnGap: TILE_TAB_GAP_PX }}
    >
      <div className="flex justify-end">{flipButton}</div>
      {quantityGroup}
      <div className="flex">{warningMark}</div>
    </div>
  );
}
