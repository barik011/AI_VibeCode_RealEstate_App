import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const data = (name) => JSON.parse(readFileSync(`src/data/${name}.json`, 'utf8'));
const arabic = async (page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
};

test('language persists and retains filters, favorites, forms and route', async ({ page }) => {
  await arabic(page);
  await expect(page.locator('h1')).toContainText('غداً أكثر إشراقاً');
  await expect(page).toHaveTitle(/عقارات فاخرة في دبي/);
  await page.getByLabel('منطقة البحث', { exact: true }).selectOption('palm-jumeirah');
  await page.getByLabel('نوع العقار المطلوب').selectOption('villa');
  await page.getByRole('button', { name: 'ابحث عن العقارات', exact: true }).click();
  await expect(page.locator('.property-card')).toHaveCount(1);
  await page.locator('.favorite-button').click();
  const url = page.url();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page).toHaveURL(url);
  await expect(page.locator('.property-title')).toHaveText('Palm Jumeirah Villa');
  await expect(page.locator('.favorite-button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.property-title')).toHaveText('فيلا نخلة جميرا');
  await page.goto('/contact');
  await page.getByLabel('الاسم الكامل').fill('أحمد محمد');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill('demo@example.com');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('أحمد محمد');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('demo@example.com');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('Arabic search, validation, gallery and carousel keyboard behavior', async ({ page }) => {
  await arabic(page);
  await page.getByRole('button', { name: 'افتح البحث' }).click();
  await page.getByLabel('ابحث في جميع العقارات').fill('نَخْلَة جُمَيْرَا');
  await expect(page.locator('.search-suggestions a')).toHaveCount(3);
  await page.locator('.search-suggestions a').first().click();
  await expect(page.locator('h1')).toHaveText('فيلا نخلة جميرا');
  await page.getByRole('button', { name: 'تكبير صورة العقار' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'صورة العقار التالية' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.gallery-counter')).toHaveText('2 / 4');
  await page.keyboard.press('Escape');
  await page.goto('/contact');
  await page.getByRole('button', { name: 'لنبدأ الحوار' }).click();
  expect(await page.getByLabel('الاسم الكامل').evaluate((el) => el.validationMessage)).toBe(
    'يرجى إكمال هذا الحقل.',
  );
  await page.getByLabel('الاسم الكامل').fill('أحمد محمد');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill('demo@example.com');
  await page.getByLabel('رقم الهاتف').fill('+971501234567');
  await page.getByLabel('الدولة', { exact: true }).fill('الإمارات');
  await page.getByLabel('رسالتك').fill('أرغب في معرفة المزيد عن العقارات المتاحة في دبي.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'لنبدأ الحوار' }).click();
  await expect(page.locator('.form-success')).toContainText('حُفظ استفسارك');
  await page.goto('/');
  await page.locator('.testimonials').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.client')).toContainText('أميليا روس');
});

test('Arabic pages and data have no untranslated English content', async ({ page }) => {
  test.setTimeout(180000);
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    }),
  );
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await arabic(page);
  const routes = [
    '/',
    '/properties',
    '/about',
    '/invest',
    '/locations',
    '/blog',
    '/contact',
    '/favorites',
    '/search',
    '/privacy',
    '/terms',
    '/not-found',
    ...data('properties').map((p) => `/property/${p.slug}`),
    ...data('locations').map((l) => `/location/${l.slug}`),
    ...data('blog').map((a) => `/blog/${a.slug}`),
  ];
  const leaks = [];
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    const english = await page.locator('body').evaluate((body) => {
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const values = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (
          node.parentElement.closest('script, style') ||
          !node.parentElement.getClientRects().length
        )
          continue;
        const text = node.textContent.trim();
        if (/[a-zA-Z]{2,}/.test(text) && !/^(English|DH-\d+|.*@.*)$/.test(text)) values.push(text);
      }
      return [...new Set(values)];
    });
    if (english.length) leaks.push({ route, english });
  }
  expect(leaks).toEqual([]);
  expect(errors).toEqual([]);
});

test('RTL desktop and mobile mirror without overflow', async ({ page }) => {
  test.setTimeout(180000);
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await arabic(page);
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of [
      '/',
      '/properties',
      '/property/palm-jumeirah-villa',
      '/contact',
      '/blog',
      '/about',
    ]) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.unroute('https://images.unsplash.com/**');
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll((images) =>
    images.forEach((img) => {
      img.loading = 'eager';
    }),
  );
  for (const selector of ['.featured-section', '.home-discover', '.home-community', '.site-footer'])
    await page.locator(selector).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/home-arabic-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/home-arabic-mobile.png', fullPage: true });
  await page.screenshot({ path: 'artifacts/home-arabic-viewport.png' });
  await page.getByRole('button', { name: 'افتح قائمة التنقل' }).click();
  await page
    .getByRole('navigation', { name: 'التنقل عبر الهاتف' })
    .getByRole('link', { name: 'العقارات', exact: true })
    .click();
  await expect(page).toHaveURL('/properties');
  await expect(page.locator('dialog')).toHaveCount(0);
});
