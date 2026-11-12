import { useTranslation } from 'react-i18next';
import { LABEL } from '../ui/board-styles.ts';

/** How many cards the decklist has and how many pages they print on, in a few characters. */
export function DecklistCount({
  cardCount,
  pageCount,
}: {
  readonly cardCount: number;
  readonly pageCount: number;
}) {
  const { t } = useTranslation();
  return (
    <p className={`${LABEL} pr-2 whitespace-nowrap`}>
      {t('workspace.decklistCount', {
        cards: t('workspace.cardCount', { count: cardCount }),
        pages: t('workspace.pageCount', { count: pageCount }),
      })}
    </p>
  );
}
