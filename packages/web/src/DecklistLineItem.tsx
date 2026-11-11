import { copiesByPrint, previewPrint, type DecklistLine } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from './print-label.ts';
import { PrintWarningNote } from './PrintWarningNote.tsx';
import { SMALL_IMAGE } from './scryfall-image-sizes.ts';

interface DecklistLineItemProps {
  readonly line: DecklistLine;
  /** Called with the oracle id of the card the user picks among an ambiguous line's candidates. */
  readonly onPickCandidate: (oracleId: string) => void;
  /** Opens the line's panel: only resolved lines have one. */
  readonly onOpenPanel: () => void;
  readonly onSwitchLineToEnglish: () => void;
}

/** One line of the decklist as a card: image, quantity, name, language and what needs fixing. */
export function DecklistLineItem({
  line,
  onPickCandidate,
  onOpenPanel,
  onSwitchLineToEnglish,
}: DecklistLineItemProps) {
  const { t } = useTranslation();
  const frontFace = previewPrint(line)?.faces[0];
  const cardSummary = (
    <>
      {frontFace ? (
        <img
          className="line__image"
          src={frontFace.imageUris.small}
          alt={t('line.imageAlt', { name: frontFace.name })}
          width={SMALL_IMAGE.width}
          height={SMALL_IMAGE.height}
          loading="lazy"
        />
      ) : (
        <div className="line__image line__image--empty" aria-hidden="true" />
      )}
      <span className="line__body">
        <span className="line__quantity">{t('line.quantity', { count: line.quantity })}</span>
        <span className="line__name">
          {line.status === 'resolved' ? line.card.name : line.text.trim()}
        </span>
        <span className="line__lang">{line.lang.toUpperCase()}</span>
      </span>
    </>
  );

  return (
    <li className={`line line--${line.status}`}>
      {line.status === 'resolved' ? (
        <button
          type="button"
          className="line__open"
          aria-label={t('line.open', { name: line.card.name })}
          onClick={onOpenPanel}
        >
          {cardSummary}
        </button>
      ) : (
        <div className="line__summary">{cardSummary}</div>
      )}
      {line.status === 'notFound' && <p className="line__note">{t('line.notFound')}</p>}
      {line.status === 'ambiguous' && (
        <div className="line__suggestions">
          <span className="line__note">{t('line.ambiguous')}</span>
          {line.candidates.map(({ card }) => (
            <button
              key={card.oracleId}
              type="button"
              className="button--secondary"
              onClick={() => onPickCandidate(card.oracleId)}
            >
              {card.name}
            </button>
          ))}
        </div>
      )}
      {line.status === 'resolved' && line.allocations.length > 0 && (
        <p className="line__copies">
          {copiesByPrint(line)
            .map(({ print, quantity }) =>
              t(
                print.id === line.defaultPrint?.id
                  ? 'line.copiesOfDefaultPrint'
                  : 'line.copiesOfPrint',
                { count: quantity, print: setAndNumberOf(print, t) },
              ),
            )
            .join(' · ')}
        </p>
      )}
      {line.status === 'resolved' && (
        <PrintWarningNote line={line} onSwitchLineToEnglish={onSwitchLineToEnglish} />
      )}
    </li>
  );
}
