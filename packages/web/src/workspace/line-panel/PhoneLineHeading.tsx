import { previewPrint, type ResolvedLine } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { SMALL_IMAGE } from '../card-image/scryfall-image-sizes.ts';

/** The card of `line` in the header of its phone panel: a small image and its name, cut if long. */
export function PhoneLineHeading({ line }: { readonly line: ResolvedLine }) {
  const { t } = useTranslation();
  const frontFace = previewPrint(line)?.faces[0];
  return (
    <>
      {frontFace && (
        <img
          className="block w-10 shrink-0"
          style={CARD_SHAPE}
          src={frontFace.imageUris.small}
          alt={t('line.imageAlt', { name: frontFace.name })}
          width={SMALL_IMAGE.width}
          height={SMALL_IMAGE.height}
        />
      )}
      <h2 className="min-w-0 truncate text-lg leading-tight font-bold">{line.card.name}</h2>
    </>
  );
}
