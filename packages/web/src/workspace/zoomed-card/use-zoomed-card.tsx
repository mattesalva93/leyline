import type { PrintFace } from '@mtg-suite/core';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { LARGE_IMAGE } from '../card-image/scryfall-image-sizes.ts';
import { HARD_SHADOW } from '../../ui/board-styles.ts';
import { ZOOMED_CARD_PX, zoomedCardPlacement } from './zoomed-card-placement.ts';

/** How long the pointer rests on a tile of the card grid before its card shows enlarged. */
export const TILE_ZOOM_WAIT_MS = 1000;

/** Shorter than on a tile: in the print picker the user is comparing prints one after another. */
export const PRINT_PICKER_ZOOM_WAIT_MS = 500;

/** Spread on the element whose card the pointer can zoom. */
interface ZoomHandlers {
  readonly onPointerEnter: (event: PointerEvent<Element>) => void;
  readonly onPointerLeave: () => void;
  readonly onPointerDown: () => void;
}

/**
 * The handlers that zoom `face` once the pointer rests on the element they are spread on.
 * `besideClosest` is a selector of the element's ancestor the zoomed card must stand beside, when
 * that is more than the element itself.
 */
export type ZoomOn = (face: PrintFace | undefined, besideClosest?: string) => ZoomHandlers;

interface Zoom {
  /** The element the pointer rested on, which the card stands beside. */
  readonly hovered: Element;
  readonly face: PrintFace;
  readonly left: number;
  readonly top: number;
}

/**
 * A card shown enlarged, at reading size, beside the element the pointer has rested on for
 * `waitMs`. Only a pointer zooms: a touch never does, nor a pointer carrying a drag. Leaving the
 * element, pressing on it, scrolling anything, starting a drag or the element leaving the page
 * (its card taken out of the decklist) puts the card away, so it is never in the way.
 */
export function useZoomedCard(waitMs: number): {
  readonly zoomOn: ZoomOn;
  readonly zoomedCard: ReactNode;
} {
  const { t } = useTranslation();
  const timer = useRef<number | undefined>(undefined);
  // Some browsers still report the pointer entering tiles while a drag carries it over them.
  const isDragging = useRef(false);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setZoom(null);
  }, []);

  useEffect(() => {
    const startDrag = () => {
      isDragging.current = true;
      hide();
    };
    const endDrag = () => {
      isDragging.current = false;
    };
    // Capturing, since a scroll does not bubble: the scroll of any zone reaches the window.
    window.addEventListener('scroll', hide, true);
    window.addEventListener('dragstart', startDrag, true);
    window.addEventListener('dragend', endDrag, true);
    // A drop too: the reorder it makes may take the dragged tile out, and its `dragend` with it.
    window.addEventListener('drop', endDrag, true);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('dragstart', startDrag, true);
      window.removeEventListener('dragend', endDrag, true);
      window.removeEventListener('drop', endDrag, true);
      window.clearTimeout(timer.current);
    };
  }, [hide]);

  // An element taken off the page under the pointer never reports the pointer leaving it.
  const zoomedElement = zoom?.hovered;
  useEffect(() => {
    if (!zoomedElement) return;
    const hideOnceGone = new MutationObserver(() => {
      if (!zoomedElement.isConnected) hide();
    });
    hideOnceGone.observe(document.body, { childList: true, subtree: true });
    return () => hideOnceGone.disconnect();
  }, [zoomedElement, hide]);

  const zoomOn: ZoomOn = (face, besideClosest) => ({
    onPointerEnter(event) {
      if (!face || event.pointerType === 'touch' || isDragging.current) return;
      const element = event.currentTarget;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!element.isConnected) return;
        const hovered = element.getBoundingClientRect();
        const placement = zoomedCardPlacement({
          hovered,
          beside:
            (besideClosest && element.closest(besideClosest)?.getBoundingClientRect()) || hovered,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        });
        setZoom({ hovered: element, face, ...placement });
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
        className={`pointer-events-none fixed z-50 animate-fade-in ring-3 ring-border ${HARD_SHADOW}`}
        style={{ ...CARD_SHAPE, left: zoom.left, top: zoom.top, ...ZOOMED_CARD_PX }}
        src={zoom.face.imageUris.large}
        alt={t('zoomedCard.alt', { name: zoom.face.name })}
        width={LARGE_IMAGE.width}
        height={LARGE_IMAGE.height}
      />,
      document.body,
    );

  return { zoomOn, zoomedCard };
}
