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
    <fieldset className="language-picker">
      <legend>{label}</legend>
      {LANGS.map((lang) => (
        <label key={lang} className="language-picker__option">
          <input
            type="radio"
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
