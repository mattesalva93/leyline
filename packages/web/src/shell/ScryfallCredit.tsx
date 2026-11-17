import { Trans } from 'react-i18next';

const SCRYFALL_URL = 'https://scryfall.com';

/** The small line, always in the top bar, that says where card data and images come from. */
export function ScryfallCredit({ className = '' }: { readonly className?: string }) {
  return (
    <p className={`min-w-0 font-mono text-[10px] lg:whitespace-nowrap ${className}`}>
      <Trans
        i18nKey="shell.scryfallCredit"
        components={{
          scryfall: (
            <a className="underline" href={SCRYFALL_URL} target="_blank" rel="noreferrer" />
          ),
        }}
      />
    </p>
  );
}
