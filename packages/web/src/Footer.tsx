import { useTranslation } from 'react-i18next';

const ISSUES_URL = 'https://github.com/mattesalva93/mtg-suite/issues';
const SCRYFALL_URL = 'https://scryfall.com';

/** Shown on every page: disclaimer, Scryfall credit, issue link. */
export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <p>{t('footer.disclaimer')}</p>
      <p>
        <a href={SCRYFALL_URL} target="_blank" rel="noreferrer">
          {t('footer.scryfall')}
        </a>
      </p>
      <p>
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          {t('footer.report')}
        </a>
      </p>
    </footer>
  );
}
