import { test, expect } from '@playwright/test';

test('hero autoplay, pause and reduced motion', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Show hero slide 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.clock.fastForward(6600);
  await expect(
    page.getByRole('button', { name: 'Show hero slide 2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Pause slideshow' }).click();
  await page.clock.fastForward(14000);
  await expect(
    page.getByRole('button', { name: 'Show hero slide 2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await page.clock.fastForward(14000);
  await expect(
    page.getByRole('button', { name: 'Show hero slide 1', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('header navigation, category links, journal filtering and FAQ', async ({ page }) => {
  await page.goto('/');
  for (const [name, route] of [
    ['Properties', '/properties'],
    ['About', '/about'],
    ['Invest', '/invest'],
    ['Blog', '/blog'],
    ['Contact', '/contact'],
    ['Home', '/'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name, exact: true })
      .click();
    await expect(page).toHaveURL(route);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.locator('.category-card').filter({ hasText: 'Villas' }).click();
  await expect(page).toHaveURL('/properties?type=villa');
  await expect(page.locator('.property-card')).toHaveCount(5);
  await page.goto('/blog');
  await page.getByRole('button', { name: 'Investment', exact: true }).click();
  await expect(page.locator('.blog-card')).toHaveCount(1);
  await page.locator('.blog-card a').click();
  await expect(page.locator('.article-body')).toBeVisible();
  await page.goto('/invest');
  await page.getByText('Are returns guaranteed?', { exact: true }).click();
  await expect(page.locator('details[open]')).toContainText('No.');
});

test('share, remove favorite, keyboard dialog and invalid newsletter', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/property/palm-jumeirah-villa');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Property link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '/property/palm-jumeirah-villa',
  );
  await page.getByRole('button', { name: 'Save Palm Jumeirah Villa to favorites' }).click();
  await page.goto('/favorites');
  await page.getByRole('button', { name: 'Remove Palm Jumeirah Villa from favorites' }).click();
  await expect(page.getByText('You haven’t saved any properties yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(page.getByLabel('Search properties globally')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open search' })).toBeFocused();
  await page.getByLabel('Subscribe to our newsletter').fill('not-an-email');
  await page.getByRole('button', { name: 'Subscribe to newsletter' }).click();
  expect(
    await page.getByLabel('Subscribe to our newsletter').evaluate((el) => el.validity.valid),
  ).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('dubai-bayt:newsletter'))).toBeNull();
});
