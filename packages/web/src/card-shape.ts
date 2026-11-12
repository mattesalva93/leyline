import { CARD_CORNER_RADIUS_MM, CARD_MM } from '@mtg-suite/core';
import type { CSSProperties } from 'react';
import { NORMAL_IMAGE } from './scryfall-image-sizes.ts';

const cornerPercentOf = (sideMm: number) => (CARD_CORNER_RADIUS_MM / sideMm) * 100;

/**
 * The shape of a card on screen: a Scryfall image shown whole, at its own proportions, with the
 * rounded corners of a real card.
 */
export const CARD_SHAPE: CSSProperties = {
  aspectRatio: `${NORMAL_IMAGE.width} / ${NORMAL_IMAGE.height}`,
  borderRadius: `${cornerPercentOf(CARD_MM.width)}% / ${cornerPercentOf(CARD_MM.height)}%`,
};
