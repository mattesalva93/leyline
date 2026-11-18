import { useTranslation } from 'react-i18next';
import { TILE_WIDTH_PX } from './tile-width.ts';

/** The slider that sets the tile width of the card grid: it makes the tiles bigger or smaller. */
export function TileWidthSlider({
  width,
  onChange,
  className = '',
}: {
  readonly width: number;
  readonly onChange: (width: number) => void;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  return (
    <label className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <span>{t('workspace.tileWidth')}</span>
      <input
        type="range"
        min={TILE_WIDTH_PX.min}
        max={TILE_WIDTH_PX.max}
        step={TILE_WIDTH_PX.step}
        className="w-24 accent-accent"
        value={width}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  );
}
