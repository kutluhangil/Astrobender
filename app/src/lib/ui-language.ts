export type UiLanguage = 'tr' | 'en'

export function pickLanguage(
  language: UiLanguage,
  tr: string,
  en: string,
): string {
  return language === 'tr' ? tr : en
}
