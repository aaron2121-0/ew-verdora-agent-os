import { en, type MessageKey } from './en';
import { zh } from './zh';

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export type { MessageKey };

export const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, zh };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Translate a key, filling `{name}` placeholders. */
export function t(locale: Locale, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const template = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Pick a locale from a saved preference, then the browser's language header. */
export function resolveLocale(saved: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(saved)) return saved;
  const first = (acceptLanguage ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('zh') ? 'zh' : DEFAULT_LOCALE;
}
