import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../ui/LoadingSpinner.tsx';
import { imagelessTextKey, type ImagelessGridTile } from '../card-grid/grid-tiles.ts';

/** How to fix a line still to recognise, not found or a deck link; nothing for any other reason. */
export function LineToFixHint({
  lineToFix,
  isResolving,
}: {
  readonly lineToFix: ImagelessGridTile;
  readonly isResolving: boolean;
}) {
  const { t } = useTranslation();
  const { reason } = lineToFix;
  if (reason === 'pending') {
    return (
      <p className="text-muted-foreground">
        {isResolving ? <LoadingSpinner label={t('decklist.resolving')} /> : t('line.pending')}
      </p>
    );
  }
  if (reason === 'notFound' || reason === 'deckLink') {
    return <p className="text-muted-foreground">{t(`line.${imagelessTextKey(lineToFix)}`)}</p>;
  }
  return null;
}
