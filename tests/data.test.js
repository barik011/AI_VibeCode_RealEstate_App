import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (name) =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const properties = read('properties');
const locations = read('locations');
const categories = read('categories');
test('property references and routes are complete and unique', () => {
  assert.equal(properties.length, 20);
  assert.equal(new Set(properties.map((p) => p.slug)).size, properties.length);
  assert.equal(new Set(properties.map((p) => p.id)).size, properties.length);
  for (const p of properties) {
    assert.ok(
      locations.some((l) => l.slug === p.locationSlug),
      p.title,
    );
    assert.ok(
      categories.some((c) => c.slug === p.category),
      p.title,
    );
    assert.ok(['buy', 'rent', 'off-plan', 'commercial'].includes(p.purpose));
    assert.ok(Number.isFinite(p.price) && p.price > 0);
    assert.ok(p.images.length >= 3);
    assert.ok(p.amenities.length > 0);
    assert.ok(p.agent.name && p.description && p.coordinates.lat);
  }
});
test('all image sources use Unsplash and hero has enough slides', () => {
  const site = read('site');
  assert.ok(site.heroImages.length >= 4);
  assert.equal(new Set(site.heroImages).size, site.heroImages.length);
  for (const url of [...Object.values(site.images), ...properties.flatMap((p) => p.images)]) {
    assert.equal(new URL(url).hostname, 'images.unsplash.com');
  }
});
test('journal and location slugs are unique with complete detail content', () => {
  for (const rows of [locations, read('blog')])
    assert.equal(new Set(rows.map((row) => row.slug)).size, rows.length);
  for (const article of read('blog'))
    assert.ok(article.paragraphs.length >= 3 && article.excerpt && article.date);
});
