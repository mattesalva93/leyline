import { LANGS, type Lang, type PrintCountsByLang } from '@mtg-suite/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export interface LanguagePickerProps {
  readonly label: string;
  readonly selectedLang: Lang;
  readonly onChange: (lang: Lang) => void;
  /**
   * How many prints each language has, shown beside it; a language with none cannot be picked.
   * Absent where the choice is not about prints, and `null` while the counts are not known.
   */
  readonly printCounts?: PrintCountsByLang | null;
}

/** One radio button per card language. */
export function LanguagePicker({
  label,
  selectedLang,
  onChange,
  printCounts,
}: LanguagePickerProps) {
  const { t } = useTranslation();
  const radioGroupName = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <legend className="float-left mr-2 font-semibold">{label}</legend>
      {LANGS.map((lang) => {
        const printCount = printCounts?.[lang];
        return (
          <label key={lang} className="flex min-h-9 items-center gap-1.5 has-disabled:opacity-40">
            <input
              type="radio"
              className="accent-foreground"
              name={radioGroupName}
              value={lang}
              checked={selectedLang === lang}
              disabled={printCount === 0}
              onChange={() => onChange(lang)}
            />
            {printCount === undefined
              ? t(`lang.${lang}`)
              : t('printPicker.langWithPrintCount', { lang: t(`lang.${lang}`), count: printCount })}
          </label>
        );
      })}
    </fieldset>
  );
}
