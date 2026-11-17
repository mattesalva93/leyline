import { useTranslation } from 'react-i18next';
import { LABEL } from '../ui/board-styles.ts';

/** Glues the words of a count together, so a narrow top bar breaks the line only between counts. */
function unbreakable(text: string): string {
  return text.replaceAll(' ', '\u00a0');
}

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
    <p className={`${LABEL} pr-2`}>
      {t('workspace.decklistCount', {
        cards: unbreakable(t('workspace.cardCount', { count: cardCount })),
        pages: unbreakable(t('workspace.pageCount', { count: pageCount })),
      })}
    </p>
  );
}
