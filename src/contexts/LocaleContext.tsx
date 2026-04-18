'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { format, formatDistance, formatRelative, Locale } from 'date-fns';
import { enAU } from 'date-fns/locale/en-AU';

// Supported locales — add imports here as languages are added (Phase 2-3)
// Japanese is first priority, then Spanish, Portuguese, French, Arabic
const LOCALE_MAP: Record<string, Locale> = {
  'en-AU': enAU,
  // 'ja': ja,        // Phase 2 — import { ja } from 'date-fns/locale/ja'
  // 'es': es,        // Phase 2
  // 'pt-BR': ptBR,   // Phase 2
  // 'fr': fr,        // Phase 2-3
  // 'ar-SA': arSA,   // Phase 3
};

export type SupportedLocale = keyof typeof LOCALE_MAP | string;

interface LocaleContextValue {
  /** Current locale code (e.g. 'en-AU', 'ja') */
  locale: SupportedLocale;
  /** Switch locale — persists to localStorage when available */
  setLocale: (locale: SupportedLocale) => void;
  /** date-fns Locale object for the current locale */
  dateLocale: Locale;
  /** Format a date with locale awareness. Wraps date-fns format(). */
  formatDate: (date: Date | number, formatStr: string) => string;
  /** Relative time (e.g. "3 days ago"). Wraps date-fns formatDistance(). */
  formatRelativeTime: (date: Date | number, baseDate?: Date | number) => string;
  /** Format a number with locale-aware grouping and decimals */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Format a currency amount (e.g. "$1,234.56" or "¥123,456") */
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const DEFAULT_LOCALE: SupportedLocale = 'en-AU';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  const dateLocale = LOCALE_MAP[locale] || enAU;

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
  }, []);

  const formatDate = useCallback(
    (date: Date | number, formatStr: string) => {
      return format(date, formatStr, { locale: dateLocale });
    },
    [dateLocale]
  );

  const formatRelativeTime = useCallback(
    (date: Date | number, baseDate: Date | number = new Date()) => {
      return formatDistance(date, baseDate, { addSuffix: true, locale: dateLocale });
    },
    [dateLocale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (value: number, currency = 'USD', options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        ...options,
      }).format(value);
    },
    [locale]
  );

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        dateLocale,
        formatDate,
        formatRelativeTime,
        formatNumber,
        formatCurrency,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale-aware formatting throughout the app.
 * Uses en-AU as default. When i18n is added (Phase 2), components
 * using this hook will automatically pick up locale changes.
 */
export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
