import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from './locales/it.json';

// The UI is Italian only for now; every string still goes through i18next.
await i18next.use(initReactI18next).init({
  lng: 'it',
  fallbackLng: 'it',
  resources: { it: { translation: it } },
  interpolation: { escapeValue: false }, // React already escapes.
});
