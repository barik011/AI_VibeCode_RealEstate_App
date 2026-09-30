import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const data = (name) => JSON.parse(readFileSync(`src/data/${name}.json`, 'utf8'));

async function settleImages(page) {
  // Full-page captures do not scroll through every lazy image. Load them explicitly
  // so the artifact represents the page after a visitor has seen each section.
  await page.locator('img').evaluateAll((images) =>
    images.forEach((img) => {
      img.loading = 'eager';
    }),
  );
  await expect
    .poll(() => page.locator('img').evaluateAll((images) => images.every((img) => img.complete)), {
      timeout: 20000,
    })
    .toBe(true);
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images
          .filter((img) => !img.naturalWidth || img.src.includes('fallback'))
          .map((img) => img.src),
      ),
  ).toEqual([]);
}

test('home interactions, live search, favorites and gallery', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('net::'))
      errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Brighter Tomorrow');
  await page.getByRole('button', { name: 'Pause slideshow' }).click();
  await page.getByRole('button', { name: 'Show hero slide 2', exact: true }).click();
  await expect(page.locator('.hero-slide.active')).toHaveAttribute(
    'src',
    data('site').heroImages[1],
  );
  await page.getByRole('button', { name: 'Show hero slide 1', exact: true }).click();
  await page.getByLabel('Search location', { exact: true }).selectOption('dubai-marina');
  await page.getByLabel('Search property type', { exact: true }).selectOption('apartment');
  await page.getByRole('button', { name: 'Search properties', exact: true }).click();
  await expect(page).toHaveURL(/purpose=buy&location=dubai-marina&type=apartment/);
  await expect(page.locator('.property-card')).toHaveCount(1);
  await expect(page.locator('.property-title')).toHaveText('Marina Panorama');
  await page.getByRole('button', { name: 'Save Marina Panorama to favorites' }).click();
  await page.goto('/favorites');
  await expect(page.locator('.property-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.property-title')).toHaveText('Marina Panorama');
  await page.locator('.property-title').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marina Panorama');
  await page.getByRole('button', { name: 'View property photo 2', exact: true }).click();
  await expect(page.locator('.gallery-counter')).toHaveText('2 / 4');
  await page.getByRole('button', { name: 'Enlarge property photo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open search', exact: true }).click();
  await page.getByLabel('Search properties globally').fill('Palm Jumeirah Villa');
  await expect(page.locator('.search-suggestions a')).toHaveCount(2);
  await page
    .locator('.search-suggestions')
    .getByRole('link', { name: /^Palm Jumeirah Villa/ })
    .click();
  await expect(page).toHaveURL(/property\/palm-jumeirah-villa/);
  expect(errors).toEqual([]);
});

test('filters, prices, sorting, pagination and empty states', async ({ page }) => {
  await page.goto('/properties');
  await expect(page.locator('.property-card')).toHaveCount(9);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.property-card')).toHaveCount(2);
  await page.getByLabel('Sort properties').selectOption('price-asc');
  await expect(page.locator('.property-title').first()).toHaveText('Downtown Studio Residence');
  await page.getByLabel('Sort properties').selectOption('price-desc');
  await expect(page.locator('.property-title').first()).toHaveText('Emirates Signature Estate');
  await page.getByLabel('Purpose', { exact: true }).selectOption('buy');
  await page.getByLabel('Property type', { exact: true }).selectOption('villa');
  await page.getByLabel('Location', { exact: true }).selectOption('palm-jumeirah');
  await page.getByLabel('Bedrooms', { exact: true }).selectOption('4');
  await page.getByLabel('Bathrooms', { exact: true }).selectOption('5');
  await page.getByLabel('Minimum price', { exact: true }).fill('20000000');
  await page.getByLabel('Maximum price', { exact: true }).fill('30000000');
  await expect(page.locator('.property-card')).toHaveCount(1);
  await expect(page.locator('.property-title')).toHaveText('Palm Jumeirah Villa');
  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page.locator('.property-grid')).toHaveClass(/list-view/);
  await page.getByLabel('Maximum price', { exact: true }).fill('100');
  await expect(page.getByText('No properties found matching your criteria.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.property-card')).toHaveCount(9);
});

test('forms validate and store only in this browser', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('net::')) errors.push(m.text());
  });
  await page.goto('/contact?type=expert&location=palm-jumeirah');
  await expect(page.getByLabel('Preferred location')).toHaveValue('palm-jumeirah');
  await page.getByRole('button', { name: 'Let’s start a conversation' }).click();
  await expect(page.locator('.form-success')).toHaveCount(0);
  await page.getByLabel('Full name').fill('Demo Visitor');
  await page.getByLabel('Email address', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Phone number').fill('+971 50 123 4567');
  await page.getByLabel('Country', { exact: true }).fill('United Kingdom');
  await page
    .getByLabel('Your message')
    .fill('I would like to explore waterfront homes for this demo.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Let’s start a conversation' }).click();
  await expect(page.locator('.form-success')).toContainText('No message has been sent');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dubai-bayt:inquiries'))[0].name),
  ).toBe('Demo Visitor');
  await page.getByLabel('Subscribe to our newsletter').fill('demo@example.com');
  await page.getByRole('button', { name: 'Subscribe to newsletter' }).click();
  await expect(page.locator('.newsletter')).toContainText('Saved locally');
  expect(errors).toEqual([]);
});

test('all content routes render, invalid slugs fall back and links are real', async ({ page }) => {
  // Every catalog detail is a fresh document navigation, plus invalid-route checks.
  test.setTimeout(180000);
  // Route assertions do not depend on third-party image delivery.
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    }),
  );
  const routes = [
    '/',
    '/properties',
    '/about',
    '/invest',
    '/locations',
    '/blog',
    '/contact',
    '/favorites',
    '/search?q=marina',
    '/privacy',
    '/terms',
    '/category/villa',
    ...data('properties').map((p) => `/property/${p.slug}`),
    ...data('locations').map((l) => `/location/${l.slug}`),
    ...data('blog').map((a) => `/blog/${a.slug}`),
  ];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).not.toHaveText('Page Not Found');
    expect(await page.locator('a[href="#"]').count(), route).toBe(0);
  }
  for (const route of [
    '/missing',
    '/property/invalid',
    '/location/invalid',
    '/blog/invalid',
    '/category/invalid',
  ]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('homepage carousel, location selection, assets and visual capture', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause slideshow' }).click();
  await expect(page.locator('.client')).toContainText('James Carter');
  await page.getByRole('button', { name: 'Next testimonial' }).click();
  await expect(page.locator('.client')).toContainText('Amelia Ross');
  await page.getByRole('button', { name: 'Previous testimonial' }).click();
  await expect(page.locator('.client')).toContainText('James Carter');
  await page
    .locator('.location-selector')
    .getByRole('button', { name: 'Dubai Marina', exact: true })
    .click();
  await expect(page.locator('.location-copy .button')).toHaveAttribute(
    'href',
    '/location/dubai-marina',
  );
  await page
    .locator('.location-selector')
    .getByRole('button', { name: 'Palm Jumeirah', exact: true })
    .click();
  for (const selector of ['.featured-section', '.home-discover', '.home-community', '.site-footer'])
    await page.locator(selector).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await settleImages(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  const broken = await page
    .locator('img')
    .evaluateAll((images) =>
      images
        .filter((img) => img.complete && (img.naturalWidth === 0 || img.src.includes('fallback')))
        .map((img) => img.src),
    );
  expect(broken).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  await page.screenshot({ path: 'artifacts/home-mobile-viewport.png' });
});

test('responsive layouts, mobile menu, focus and reduced motion', async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/properties', '/property/palm-jumeirah-villa', '/contact']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter(
            (el) =>
              el.getBoundingClientRect().right > innerWidth + 1 &&
              getComputedStyle(el).position !== 'absolute',
          )
          .map((el) => `${el.tagName}.${el.className}`)
          .slice(0, 12),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}: ${overflow.join(', ')}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Properties', exact: true })
    .click();
  await expect(page).toHaveURL('/properties');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Refine your search' }).click();
  await page.getByLabel('Purpose', { exact: true }).selectOption('rent');
  await expect(page.locator('.property-card')).toHaveCount(5);
  await page.goto('/');
  for (const selector of ['.featured-section', '.home-discover', '.home-community', '.site-footer'])
    await page.locator(selector).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleImages(page);
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
});
