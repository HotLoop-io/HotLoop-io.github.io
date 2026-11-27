// Message lookup. One flat JSON catalog per language, the same shape and file naming the products use
// (hotloop-flow web/src/i18n/ui.<code>.json): a key, a string, {placeholders} for values, and a little
// inline HTML where a sentence carries a link. scripts/i18n-check.mjs runs in the build and fails it if
// a language is missing a key, changes a placeholder or a link, or drops a product name.
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import it from './it.json';
import de from './de.json';
import nb from './nb.json';
import bg from './bg.json';
import el from './el.json';
import ko from './ko.json';
import ja from './ja.json';
import vi from './vi.json';
import hi from './hi.json';
import zhHans from './zh-Hans.json';
import ar from './ar.json';
import { DEFAULT, href, type Locale } from './locales';
import { EN_SEO } from './seo-en';

const CATALOGS: Record<string, Record<string, string>> = {
  en, es, fr, it, de, nb, bg, el, ko, ja, vi, hi, 'zh-Hans': zhHans, ar,
};

export type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

export function messages(locale: Locale): Record<string, string> {
  return CATALOGS[locale.code];
}

export function useT(locale: Locale) {
  const cat = CATALOGS[locale.code];
  const t = (key: string, vars?: Vars): string => {
    const s = (locale === DEFAULT ? EN_SEO[key] : undefined) ?? cat[key] ?? (locale === DEFAULT ? undefined : CATALOGS.en[key]);
    if (s === undefined) throw new Error(`i18n: no "${key}" in ${locale.code}`);
    return fill(s, vars);
  };
  // For strings that carry links: an internal link to a translated page follows the reader's language.
  const rich = (key: string, vars?: Vars): string =>
    t(key, vars).replace(/href="(\/[^"]*)"/g, (_m, route) => `href="${href(route, locale)}"`);
  return { t, rich, to: (route: string) => href(route, locale) };
}
