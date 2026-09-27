import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  translate,
  arabicMessages,
  normalizeSearch,
  normalizeText,
} from '../src/i18n/translate.js';
const data = (name) =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));

test('all display fields in the local catalog have Arabic translations', () => {
  const values = [];
  for (const p of data('properties'))
    values.push(
      p.title,
      p.location,
      p.category,
      p.tenure,
      p.furnished,
      p.agent.name,
      p.agent.role,
      p.agent.languages,
      ...p.amenities,
      ...p.description.split('\n\n'),
    );
  for (const l of data('locations')) values.push(l.name, l.tagline, l.description);
  for (const c of data('categories')) values.push(c.name, c.description);
  for (const a of data('blog')) values.push(a.title, a.category, a.excerpt, ...a.paragraphs);
  for (const t of data('testimonials')) values.push(t.name, t.role, t.quote);
  for (const value of values) assert.ok(arabicMessages[normalizeText(value)], `Missing: ${value}`);
});

test('English interpolation preserves whitespace and Arabic translates parameters', () => {
  assert.equal(
    translate('{0} {1}{2} favorites', 'en', { 0: 'Save', 1: 'Palm Jumeirah Villa', 2: ' to' }),
    'Save Palm Jumeirah Villa to favorites',
  );
  assert.equal(translate('At Home in {0}', 'ar', { 0: 'Palm Jumeirah' }), 'منزلك في نخلة جميرا');
  assert.equal(translate('Unknown text', 'ar'), 'Unknown text');
  assert.equal(translate(null, 'ar'), null);
});

test('Arabic search ignores vocalization and currency retains its numeric amount', () => {
  assert.equal(normalizeSearch('نَخْلَة جُمَيْرَا'), normalizeSearch('نخلة جميرا'));
  assert.match(translate('AED 28,000,000', 'ar'), /28,000,000/);
  assert.match(translate('AED 28,000,000', 'ar'), /د/);
});
