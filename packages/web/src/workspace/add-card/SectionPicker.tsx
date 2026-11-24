import { DECKLIST_SECTIONS, type DecklistSection } from '@leyline/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

interface SectionPickerProps {
  readonly selectedSection: DecklistSection;
  readonly onChange: (section: DecklistSection) => void;
}

/** The section a card found joins: one radio button per section, drawn as buttons side by side. */
export function SectionPicker({ selectedSection, onChange }: SectionPickerProps) {
  const { t } = useTranslation();
  const radioGroupName = useId();
  return (
    <div
      role="radiogroup"
      aria-label={t('workspace.addCard.sectionPicker')}
      className="flex flex-wrap gap-1"
    >
      {DECKLIST_SECTIONS.map((section) => (
        <label
          key={section}
          className="rounded-md border-2 border-border bg-panel px-3 py-1 text-sm font-semibold hover:bg-accent/20 has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:outline-2 has-focus-visible:outline-focus"
        >
          <input
            type="radio"
            className="sr-only"
            name={radioGroupName}
            value={section}
            checked={selectedSection === section}
            onChange={() => onChange(section)}
          />
          {t(`workspace.sections.${section}`)}
        </label>
      ))}
    </div>
  );
}
