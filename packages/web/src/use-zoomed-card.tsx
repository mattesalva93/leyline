import type { PrintFace } from '@mtg-suite/core';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from './card-shape.ts';
import { LARGE_IMAGE } from './scryfall-image-sizes.ts';
import { ZOOMED_CARD_PX, zoomedCardPlacement } from './zoomed-card-placement.ts';

/** How long the pointer rests on a tile of the card grid before its card shows enlarged. */
export const TILE_ZOOM_WAIT_MS = 1000;

/** Shorter than on a tile: in the print picker the user is comparing prints one after another. */
export const PRINT_PICKER_ZOOM_WAIT_MS = 500;

/** Spread on the element whose card the pointer can zoom. */
export interface ZoomHandlers {
  readonly onPointerEnter: (event: PointerEvent<Element>) => void;
  readonly onPointerLeave: () => void;
  readonly onPointerDown: () => void;
}

/**
 * The handlers that zoom `face` once the pointer rests on the element they are spread on.
 * `besideOf` names what the zoomed card must stand beside, when that is more than the element.
 */
export type ZoomOn = (
  face: PrintFace | undefined,
  besideOf?: (element: Element) => Element | null,
) => ZoomHandlers;

interface Zoom {
  readonly face: PrintFace;
  readonly left: number;
  readonly top: number;
}

/**
 * A card shown enlarged, at reading size, beside the element the pointer has rested on for
 * `waitMs`. Only a pointer zooms: a touch never does. Leaving the element, pressing on it,
 * scrolling anything or starting a drag puts the card away, so it is never in the way.
 */
export function useZoomedCard(waitMs: number): {
  readonly zoomOn: ZoomOn;
  readonly zoomedCard: ReactNode;
} {
  const { t } = useTranslation();
  const timer = useRef<number | undefined>(undefined);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setZoom(null);
  }, []);

  useEffect(() => {
    // Capturing, since a scroll does not bubble: the scroll of any zone reaches the window.
    window.addEventListener('scroll', hide, true);
    window.addEventListener('dragstart', hide, true);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('dragstart', hide, true);
      window.clearTimeout(timer.current);
    };
  }, [hide]);

  const zoomOn: ZoomOn = (face, besideOf) => ({
    onPointerEnter(event) {
      if (!face || event.pointerType === 'touch') return;
      const element = event.currentTarget;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const hovered = element.getBoundingClientRect();
        const placement = zoomedCardPlacement({
          hovered,
          beside: besideOf?.(element)?.getBoundingClientRect() ?? hovered,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        });
        setZoom(placement && { face, ...placement });
      }, waitMs);
    },
    onPointerLeave: hide,
    onPointerDown: hide,
  });

  const zoomedCard =
    zoom &&
    // On the page itself, so no scrolling or clipping zone it was opened from can cut it.
    createPortal(
      <img
        className="pointer-events-none fixed z-50 shadow-[0_0_0_3px_var(--color-border),10px_10px_0_var(--color-border)]"
        style={{ ...CARD_SHAPE, left: zoom.left, top: zoom.top, width: ZOOMED_CARD_PX.width }}
        src={zoom.face.imageUris.large}
        alt={t('zoomedCard.alt', { name: zoom.face.name })}
        width={LARGE_IMAGE.width}
        height={LARGE_IMAGE.height}
      />,
      document.body,
    );

  return { zoomOn, zoomedCard };
}
