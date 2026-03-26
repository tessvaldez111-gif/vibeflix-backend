// ===== i18n Configuration =====
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
// Simple storage for language preference (Web + Native compatible)
const langStorage = {
  getItem: async (key: string) => {
    try {
      if (typeof window !== 'undefined') return localStorage.getItem(key);
      const { MMKV } = await import('react-native-mmkv');
      const mmkv = new MMKV();
      return mmkv.getString(key);
    } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') { localStorage.setItem(key, value); return; }
      const { MMKV } = await import('react-native-mmkv');
      const mmkv = new MMKV();
      mmkv.set(key, value);
    } catch { /* ignore */ }
  },
};

import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import pt from './pt.json';
import ja from './ja.json';
import ko from './ko.json';

const LANG_KEY = 'app_language';

export const SUPPORTED_LANGUAGES: { code: string; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  pt: { translation: pt },
  ja: { translation: ja },
  ko: { translation: ko },
};

/** Detect device language and map to supported language code */
const detectDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const langCode = locales[0].languageCode;
    if (resources[langCode]) return langCode;
  }
  return 'en';
};

/** Get saved language, fallback to device language */
const getSavedLanguage = async (): Promise<string> => {
  try {
    const saved = await langStorage.getItem(LANG_KEY);
    if (saved && resources[saved]) return saved;
  } catch {
    // ignore
  }
  return detectDeviceLanguage();
};

/** Save language preference */
export const saveLanguage = async (lang: string) => {
  try {
    await langStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(), // Initial, will be overridden by saved
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Override with saved language preference (async)
getSavedLanguage().then((lang) => {
  if (lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
