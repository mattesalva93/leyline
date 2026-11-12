import { LANGS, type Lang } from '@mtg-suite/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguagePickerProps {
  readonly label: string;
  readonly selectedLang: Lang;
  readonly onChange: (lang: Lang) => void;
}

/** One radio button per card language. */
export function LanguagePicker({ label, selectedLang, onChange }: LanguagePickerProps) {
  const { t } = useTranslation();
  const radioGroupName = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <legend className="float-left mr-2 font-semibold">{label}</legend>
      {LANGS.map((lang) => (
        <label key={lang} className="flex min-h-9 items-center gap-1.5">
          <input
            type="radio"
            className="accent-foreground"
            name={radioGroupName}
            value={lang}
            checked={selectedLang === lang}
            onChange={() => onChange(lang)}
          />
          {t(`lang.${lang}`)}
        </label>
      ))}
    </fieldset>
  );
}
