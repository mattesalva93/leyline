import type { DecklistLine } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';

interface DecklistLineItemProps {
  readonly line: DecklistLine;
  /** Called with the oracle id of the suggestion the user picks on an ambiguous line. */
  readonly onChoose: (oracleId: string) => void;
}

export function DecklistLineItem({ line, onChoose }: DecklistLineItemProps) {
  const { t } = useTranslation();
  const face = line.status === 'resolved' ? line.defaultPrint?.faces[0] : undefined;

  return (
    <li className={`line line--${line.status}`}>
      {face ? (
        <img
          className="line__image"
          src={face.imageUris.small}
          alt={t('line.imageAlt', { name: face.name })}
          width={146}
          height={204}
          loading="lazy"
        />
      ) : (
        <div className="line__image line__image--empty" aria-hidden="true" />
      )}
      <div className="line__body">
        <span className="line__quantity">{t('line.quantity', { count: line.quantity })}</span>
        <span className="line__name">
          {line.status === 'resolved' ? line.card.name : line.text.trim()}
        </span>
        {line.status === 'notFound' && <span className="line__note">{t('line.notFound')}</span>}
        {line.status === 'ambiguous' && (
          <div className="line__suggestions">
            <span className="line__note">{t('line.ambiguous')}</span>
            {line.candidates.map(({ card }) => (
              <button
                key={card.oracleId}
                type="button"
                className="line__suggestion"
                onClick={() => onChoose(card.oracleId)}
              >
                {card.name}
              </button>
            ))}
          </div>
        )}
        {line.status === 'resolved' && !line.defaultPrint && (
          <span className="line__note">{t('line.noPrint')}</span>
        )}
      </div>
    </li>
  );
}
