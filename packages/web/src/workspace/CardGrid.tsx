import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TILE_ZOOM_WAIT_MS, useZoomedCard } from '../use-zoomed-card.tsx';
import { CardGridSection, type CardGridSectionProps } from './CardGridSection.tsx';
import type { GridSection } from './grid-sections.ts';

interface CardGridProps extends Omit<CardGridSectionProps, 'section' | 'zoomOn'> {
  readonly sections: readonly GridSection[];
}

/**
 * The decklist as tiles, section by section, in the order of the text within each, each line's
 * sibling tiles side by side. A tile the pointer rests on shows its card enlarged.
 */
export function CardGrid({ sections, selection, ...sectionProps }: CardGridProps) {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const { zoomOn, zoomedCard } = useZoomedCard(TILE_ZOOM_WAIT_MS);
  // A tile can be selected from outside the grid, such as the first line to fix: bring it in.
  useEffect(() => {
    gridRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selection?.writtenIndex, selection?.printId]);
  return (
    <>
      <div ref={gridRef} role="region" aria-label={t('workspace.cardGrid')}>
        {sections.map((section) => (
          <CardGridSection
            key={section.name}
            section={section}
            selection={selection}
            zoomOn={zoomOn}
            {...sectionProps}
          />
        ))}
      </div>
      {zoomedCard}
    </>
  );
}
