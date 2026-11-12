import { useTranslation } from 'react-i18next';
import { LABEL } from '../ui/board-styles.ts';
import type { Generator } from '../use-generator.ts';

/** How many cards the decklist has and how many pages they print on, in a few characters. */
export function DeckCount({ generator }: { readonly generator: Generator }) {
  const { t } = useTranslation();
  return (
    <p className={`${LABEL} pr-2 whitespace-nowrap`}>
      {t('workspace.deckCount', {
        cards: t('workspace.cardCount', { count: generator.cardCount }),
        pages: t('workspace.pageCount', { count: generator.pageCount }),
      })}
    </p>
  );
}
