import { sheetOptionLimits, type SheetOptions } from '@mtg-suite/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SheetOptionsFormProps {
  readonly options: SheetOptions;
  readonly onChange: (options: SheetOptions) => void;
}

/** The layout settings of the sheet: margin, spacing between cards, crop marks. */
export function SheetOptionsForm({ options, onChange }: SheetOptionsFormProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="sheet-options">
      <legend>{t('sheetOptions.title')}</legend>
      <MillimetreInput
        id="sheet-margin"
        label={t('sheetOptions.margin')}
        valueMm={options.marginMm}
        limits={sheetOptionLimits.marginMm}
        onChange={(marginMm) => onChange({ ...options, marginMm })}
      />
      <MillimetreInput
        id="sheet-spacing"
        label={t('sheetOptions.spacing')}
        valueMm={options.spacingMm}
        limits={sheetOptionLimits.spacingMm}
        onChange={(spacingMm) => onChange({ ...options, spacingMm })}
      />
      <label className="sheet-options__crop-marks">
        <input
          type="checkbox"
          checked={options.cropMarks}
          onChange={(event) => onChange({ ...options, cropMarks: event.target.checked })}
        />
        {t('sheetOptions.cropMarks')}
      </label>
    </fieldset>
  );
}

interface MillimetreInputProps {
  readonly id: string;
  readonly label: string;
  readonly valueMm: number;
  readonly limits: { readonly min: number; readonly max: number };
  readonly onChange: (valueMm: number) => void;
}

/**
 * A number of mm the user types. What they type stays in the field while they edit it; only a
 * number within `limits` reaches the sheet, and leaving the field shows the value in use.
 */
function MillimetreInput({ id, label, valueMm, limits, onChange }: MillimetreInputProps) {
  const [typedText, setTypedText] = useState<string | null>(null);
  return (
    <div className="sheet-options__field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={limits.min}
        max={limits.max}
        step={0.5}
        value={typedText ?? String(valueMm)}
        onChange={(event) => {
          setTypedText(event.target.value);
          const typedMm = event.target.valueAsNumber;
          if (typedMm >= limits.min && typedMm <= limits.max) onChange(typedMm);
        }}
        onBlur={() => setTypedText(null)}
      />
    </div>
  );
}
