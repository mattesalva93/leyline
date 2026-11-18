import { useTranslation } from 'react-i18next';

/** The title of the print picker, with how many prints the card has or the print query found. */
export function PrintCountHeading({
  total,
  isSearching,
}: {
  /** `null` until the first page of prints arrives. */
  readonly total: number | null;
  readonly isSearching: boolean;
}) {
  const { t } = useTranslation();
  return (
    <h3 className="flex items-baseline justify-between font-semibold">
      {t('panel.prints')}
      {total !== null && (
        <span className="font-mono text-xs text-muted-foreground">
          {t(isSearching ? 'printPicker.foundCount' : 'panel.printCount', { count: total })}
        </span>
      )}
    </h3>
  );
}
