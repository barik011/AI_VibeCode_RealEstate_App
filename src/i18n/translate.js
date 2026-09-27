import messages from './ar.json' with { type: 'json' };
import content from './ar-content.json' with { type: 'json' };

export const arabicMessages = { ...messages, ...content };
export const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

// Non-text React children are deliberately passed through unchanged. The callers
// translate at render boundaries; stored values and route identifiers stay canonical.
export function translate(value, language = 'en', params) {
  if (typeof value !== 'string') return value;
  const key = normalizeText(value);
  let result = value;
  if (language === 'ar') {
    const translated = arabicMessages[key];
    if (translated) {
      result = value.match(/^\s*/)[0] + translated + value.match(/\s*$/)[0];
    } else if (/^AED [\d,]+$/.test(key)) {
      result = new Intl.NumberFormat('ar-AE', {
        style: 'currency',
        currency: 'AED',
        maximumFractionDigits: 0,
      }).format(Number(key.replace(/[^\d]/g, '')));
    } else if (/^\d+ beds$/.test(key)) {
      result = `${key.split(' ')[0]} غرف نوم`;
    } else if (/^Saved properties \(\d+\)$/.test(key)) {
      result = `العقارات المحفوظة (${key.match(/\d+/)[0]})`;
    } else if (key.startsWith('“') && key.endsWith('”')) {
      result = `«${translate(key.slice(1, -1), language)}»`;
    }
  }
  if (params)
    result = result.replace(/\{(\w+)\}/g, (_, name) => {
      const parameter = String(translate(params[name] ?? `{${name}}`, language));
      return language === 'ar' ? parameter.trim() : parameter;
    });
  return result;
}

export function normalizeSearch(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي');
}
