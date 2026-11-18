import {
  imageQualities,
  pageFormats,
  sheetOptionLimits,
  type ImageQuality,
  type PageFormat,
  type SheetOptions,
} from '@mtg-suite/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FIELD } from '../../ui/board-styles.ts';

const OPTION_FIELD = 'flex items-center justify-between gap-4';

interface SheetOptionsFormProps {
  readonly options: SheetOptions;
  readonly onChange: (options: SheetOptions) => void;
  /** Whether to warn that a PNG sheet makes a PDF heavy enough to strain a phone. */
  readonly warnAboutPngWeight: boolean;
}

/**
 * The settings of the sheet: page format, image quality, margin, spacing between cards, crop
 * marks.
 */
export function SheetOptionsForm({ options, onChange, warnAboutPngWeight }: SheetOptionsFormProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{t('sheetOptions.title')}</legend>
      <div className={OPTION_FIELD}>
        <label htmlFor="sheet-page-format">{t('sheetOptions.pageFormat')}</label>
        <select
          className={FIELD}
          id="sheet-page-format"
          value={options.pageFormat}
          onChange={(event) =>
            onChange({ ...options, pageFormat: event.target.value as PageFormat })
          }
        >
          {pageFormats.map((pageFormat) => (
            <option key={pageFormat} value={pageFormat}>
              {t(`sheetOptions.pageFormats.${pageFormat}`)}
            </option>
          ))}
        </select>
      </div>
      <div className={OPTION_FIELD}>
        <label htmlFor="sheet-image-quality">{t('sheetOptions.imageQuality')}</label>
        <select
          className={FIELD}
          id="sheet-image-quality"
          value={options.imageQuality}
          onChange={(event) =>
            onChange({ ...options, imageQuality: event.target.value as ImageQuality })
          }
        >
          {imageQualities.map((imageQuality) => (
            <option key={imageQuality} value={imageQuality}>
              {t(`sheetOptions.imageQualities.${imageQuality}`)}
            </option>
          ))}
        </select>
      </div>
      {warnAboutPngWeight && options.imageQuality === 'png' && (
        <p className="text-sm text-warning" role="status">
          {t('sheetOptions.pngWeightWarning')}
        </p>
      )}
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
      <label className="flex min-h-9 items-center gap-2">
        <input
          type="checkbox"
          className="accent-foreground"
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
    <div className={OPTION_FIELD}>
      <label htmlFor={id}>{label}</label>
      <input
        className={`${FIELD} w-20`}
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
