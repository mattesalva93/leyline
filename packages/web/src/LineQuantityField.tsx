import { useTranslation } from 'react-i18next';
import { SYMBOL_BUTTON } from './ui/board-styles.ts';

/** How many copies a line prints, with a − and a + to change it; never fewer than one. */
export function LineQuantityField({
  quantity,
  onQuantityChange,
}: {
  readonly quantity: number;
  readonly onQuantityChange: (quantity: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="float-left mr-3 font-semibold">{t('panel.quantity')}</legend>
      <button
        type="button"
        className={SYMBOL_BUTTON}
        aria-label={t('panel.decrease')}
        disabled={quantity <= 1}
        onClick={() => onQuantityChange(quantity - 1)}
      >
        {t('panel.minus')}
      </button>
      <output aria-live="polite" className="min-w-[2ch] text-center font-mono font-bold">
        {quantity}
      </output>
      <button
        type="button"
        className={SYMBOL_BUTTON}
        aria-label={t('panel.increase')}
        onClick={() => onQuantityChange(quantity + 1)}
      >
        {t('panel.plus')}
      </button>
    </fieldset>
  );
}
