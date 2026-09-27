import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { storage } from '../utils/storage';
import { translate } from './translate';

const LanguageContext = createContext(null);
const initialLanguage = () => (storage.get('language', 'en') === 'ar' ? 'ar' : 'en');

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const setLanguage = useCallback((next) => {
    if (next !== 'en' && next !== 'ar') return;
    storage.set('language', next);
    setLanguageState(next);
  }, []);
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    // Refresh native validation messages without changing the user's input.
    document
      .querySelectorAll('input, textarea, select')
      .forEach((field) => field.setCustomValidity(''));
  }, [language]);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isRTL: language === 'ar',
      locale: language === 'ar' ? 'ar-AE' : 'en-GB',
      t: (text, params) => translate(text, language, params),
      formatDate: (date, options) =>
        new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-GB', options).format(
          new Date(date),
        ),
    }),
    [language, setLanguage],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const arabic = language === 'ar';
  return (
    <button
      type="button"
      className="language-switch"
      onClick={() => setLanguage(arabic ? 'en' : 'ar')}
      aria-label={arabic ? 'Switch to English' : 'التبديل إلى العربية'}
      lang={arabic ? 'en' : 'ar'}
      dir={arabic ? 'ltr' : 'rtl'}
    >
      {arabic ? 'English' : 'العربية'}
    </button>
  );
}

export function useFormValidation() {
  const { t } = useLanguage();
  return {
    onInput: (event) => event.target.setCustomValidity?.(''),
    onInvalid: (event) => {
      const field = event.target;
      field.setCustomValidity('');
      if (field.validity.valueMissing)
        field.setCustomValidity(
          t(
            field.type === 'checkbox'
              ? 'Please accept before continuing.'
              : 'Please complete this field.',
          ),
        );
      else if (field.validity.typeMismatch)
        field.setCustomValidity(t('Please enter a valid email address.'));
      else if (field.validity.tooShort)
        field.setCustomValidity(t('Please enter at least {0} characters.', { 0: field.minLength }));
      else if (!field.validity.valid)
        field.setCustomValidity(field.title || t('Please check this field.'));
    },
  };
}
