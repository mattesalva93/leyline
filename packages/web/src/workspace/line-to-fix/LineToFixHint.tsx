import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../ui/LoadingSpinner.tsx';
import type { ImagelessReason } from '../card-grid/grid-tiles.ts';

/** How to fix a line still to recognise or not found; nothing for any other reason. */
export function LineToFixHint({
  reason,
  isResolving,
}: {
  readonly reason: ImagelessReason;
  readonly isResolving: boolean;
}) {
  const { t } = useTranslation();
  if (reason === 'pending') {
    return (
      <p className="text-muted-foreground">
        {isResolving ? <LoadingSpinner label={t('decklist.resolving')} /> : t('line.pending')}
      </p>
    );
  }
  if (reason === 'notFound') return <p className="text-muted-foreground">{t('line.notFound')}</p>;
  return null;
}
