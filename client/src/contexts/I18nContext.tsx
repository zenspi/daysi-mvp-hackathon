import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Import locale files
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';

type Language = 'en' | 'es';
type LocaleData = typeof enLocale;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Locale data mapping
const locales: Record<Language, LocaleData> = {
  en: enLocale,
  es: esLocale,
};

// Helper function to get nested object value by dot notation
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // First check localStorage
        const savedLanguage = localStorage.getItem('preferredLanguage') as Language;
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
          setLanguageState(savedLanguage);
        } else {
          // Check browser language as fallback
          const browserLang = navigator.language.toLowerCase();
          if (browserLang.startsWith('es')) {
            setLanguageState('es');
          } else {
            setLanguageState('en'); // Default to English
          }
        }
      } catch (error) {
        console.warn('Failed to initialize language preferences:', error);
        setLanguageState('en'); // Fallback to English
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferredLanguage', lang);
    
    // If user is logged in, update their preference via API
    // This will be implemented when user management is added
    // updateUserLanguagePreference(lang);
  };

  const t = (key: string, fallback?: string): string => {
    try {
      const currentLocale = locales[language];
      const value = getNestedValue(currentLocale, key);
      
      if (value && typeof value === 'string') {
        return value;
      }
      
      // Fallback to English if not found in current language
      if (language !== 'en') {
        const englishValue = getNestedValue(locales.en, key);
        if (englishValue && typeof englishValue === 'string') {
          return englishValue;
        }
      }
      
      // Return the fallback or the key itself
      return fallback || key;
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return fallback || key;
    }
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Custom hook to use the i18n context
export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Language options for UI
export const SUPPORTED_LANGUAGES = [
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸' },
];

// Helper function to get language display info
export function getLanguageInfo(code: Language) {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || SUPPORTED_LANGUAGES[0];
}