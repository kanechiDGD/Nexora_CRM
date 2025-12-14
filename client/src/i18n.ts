import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import en from './locales/en.json';

i18n
  // Detectar idioma del navegador
  .use(LanguageDetector)
  // Pasar la instancia de i18n a react-i18next
  .use(initReactI18next)
  // Inicializar i18next
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: 'en', // Force initial language to English
    fallbackLng: 'en', // Idioma por defecto: INGLÉS
    debug: false,

    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },

    detection: {
      // Orden de detección: localStorage > navegador
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
