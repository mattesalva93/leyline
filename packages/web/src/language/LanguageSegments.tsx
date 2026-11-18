import { LANGS } from '@mtg-suite/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguagePickerProps } from './LanguagePicker.tsx';

/**
 * The language choice of `LanguagePicker` as one row of segments, short enough for a phone:
 * each language by its code and its prints. They are radio buttons still, each named in full.
 */
export function LanguageSegments({
  label,
  selectedLang,
  onChange,
  printCounts,
}: LanguagePickerProps) {
  const { t } = useTranslation();
  const radioGroupName = useId();
  return (
    <fieldset className="flex shrink-0 rounded-sm border-2 border-border">
      <legend className="sr-only">{label}</legend>
      {LANGS.map((lang) => {
        const printCount = printCounts?.[lang];
        const langName = t(`lang.${lang}`);
        const langCode = t(`langCode.${lang}`);
        return (
          <label
            key={lang}
            className="flex min-h-9 items-center px-2 font-mono text-xs font-bold whitespace-nowrap not-last:border-r-2 not-last:border-border has-checked:bg-foreground has-checked:text-panel has-disabled:opacity-40 has-focus-visible:outline-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              className="sr-only"
              name={radioGroupName}
              value={lang}
              checked={selectedLang === lang}
              disabled={printCount === 0}
              onChange={() => onChange(lang)}
            />
            <span aria-hidden="true">
              {printCount === undefined
                ? langCode
                : t('printPicker.langCodeWithPrintCount', { lang: langCode, count: printCount })}
            </span>
            <span className="sr-only">
              {printCount === undefined
                ? langName
                : t('printPicker.langWithPrintCount', { lang: langName, count: printCount })}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
