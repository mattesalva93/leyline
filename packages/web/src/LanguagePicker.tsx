import { LANGS, type Lang } from '@mtg-suite/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguagePickerProps {
  readonly label: string;
  readonly value: Lang;
  readonly onChange: (lang: Lang) => void;
}

/** Italian or English, as a pair of radio buttons. */
export function LanguagePicker({ label, value, onChange }: LanguagePickerProps) {
  const { t } = useTranslation();
  const name = useId();
  return (
    <fieldset className="language-picker">
      <legend>{label}</legend>
      {LANGS.map((lang) => (
        <label key={lang} className="language-picker__option">
          <input
            type="radio"
            name={name}
            value={lang}
            checked={value === lang}
            onChange={() => onChange(lang)}
          />
          {t(`lang.${lang}`)}
        </label>
      ))}
    </fieldset>
  );
}
