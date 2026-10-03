import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  test.setTimeout(120000);
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: 'Demo Admin Login' }).click();
  await expect(page.getByRole('heading', { name: 'Sales overview' })).toBeVisible();
});
const dialog = (page) => page.getByRole('dialog');
const save = async (page) => {
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
};

test('agent icons create, update and confirm deletion with persistent team history', async ({
  page,
}) => {
  await page.goto('/admin/agents');
  await page.getByRole('button', { name: 'Add agent', exact: true }).click();
  await dialog(page).getByLabel('Name', { exact: true }).fill('Lifecycle Agent');
  await dialog(page).getByLabel('Email', { exact: true }).fill('lifecycle@example.com');
  await dialog(page).getByLabel('Phone', { exact: true }).fill('+971501234567');
  await dialog(page).getByLabel('Specialization').fill('Luxury villas');
  await dialog(page).getByLabel('Languages (comma separated)').fill('English, Arabic');
  await dialog(page).getByLabel('Locations (comma separated)').fill('Dubai Marina');
  await save(page);
  await page.getByLabel('Search agents').fill('lifecycle@example.com');
  await expect(page.locator('.crm-agent-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit Lifecycle Agent', exact: true }).click();
  await dialog(page).getByLabel('Name', { exact: true }).fill('Updated Lifecycle Agent');
  await dialog(page).getByLabel('Status', { exact: true }).selectOption('INACTIVE');
  await save(page);
  await page.reload();
  await page.getByLabel('Agent status').selectOption('INACTIVE');
  await page.getByRole('button', { name: 'Delete Updated Lifecycle Agent', exact: true }).click();
  await dialog(page).getByLabel('Type agent name to confirm').fill('incorrect');
  await dialog(page).getByRole('button', { name: 'Delete agent', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('Type the agent name');
  await dialog(page).getByLabel('Type agent name to confirm').fill('Updated Lifecycle Agent');
  await dialog(page).getByRole('button', { name: 'Delete agent', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Updated Lifecycle Agent', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.crm-timeline')).toContainText(
    'Deleted agent Updated Lifecycle Agent',
  );
});

test('linked agent deletion explains safeguards and bulk reassignment transfers selected leads', async ({
  page,
}) => {
  await page.goto('/admin/agents');
  await page.getByRole('button', { name: 'Delete Sarah Ahmed', exact: true }).click();
  await expect(
    dialog(page).getByRole('button', { name: 'Delete agent', exact: true }),
  ).toBeDisabled();
  await expect(dialog(page)).toContainText('linked CRM history');
  await dialog(page).getByRole('link', { name: 'Manage assigned leads' }).click();
  await expect(page.getByLabel('Agent', { exact: true })).toHaveValue('agent-1');
  await page.getByLabel('Status', { exact: true }).selectOption('ASSIGNED');
  const selectedNames = await page.locator('.crm-table tbody .crm-record-link').allTextContents();
  expect(selectedNames.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Select page', exact: true }).click();
  await page.getByRole('button', { name: 'Assign selected', exact: true }).click();
  await dialog(page).getByLabel('Assign to agent').selectOption('agent-2');
  await dialog(page).getByRole('button', { name: 'Assign leads', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByText('No matching records', { exact: true })).toBeVisible();
  await page.getByLabel('Agent', { exact: true }).selectOption('agent-2');
  for (const name of selectedNames)
    await expect(page.getByRole('link', { name: name.trim(), exact: true })).toBeVisible();
});

test('follow-up filters, report cohorts and CSV downloads work on desktop and mobile', async ({
  page,
}) => {
  await page.goto('/admin/leads');
  await page.getByLabel('Follow-up', { exact: true }).selectOption('overdue');
  await expect(page.locator('.crm-table tbody tr').first()).toContainText('Overdue');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export leads', exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), 'utf8');
  expect(csv).toContain('"Lead ID","Customer","Email"');
  await page.goto('/admin/reports');
  await page.getByLabel('Report agent').selectOption('agent-1');
  await expect(page.getByText(/matching leads. Dates filter/)).toContainText('7 matching leads');
  await page.getByLabel('Leads created from').fill('2099-01-01');
  await expect(page.getByRole('button', { name: 'Export report' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset report filters' }).click();
  await expect(page.getByRole('button', { name: 'Export report' })).toBeEnabled();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['agents', 'properties', 'leads', 'reports']) {
      await page.goto(`/admin/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBe(true);
    }
  }
});

test('property icon lifecycle rejects stale edits and retains deletion history', async ({
  page,
  context,
}) => {
  await page.goto('/admin/properties');
  await page.getByRole('button', { name: 'Add property', exact: true }).click();
  await dialog(page).getByLabel('Title', { exact: true }).fill('Lifecycle Residence');
  await dialog(page).getByLabel('Price (AED)').fill('3000000');
  await dialog(page).getByLabel('Area (sq ft)').fill('1800');
  await dialog(page)
    .getByLabel('Description')
    .fill('A residence for property lifecycle verification.');
  await dialog(page)
    .getByLabel('Image URLs (one per line)')
    .fill('https://images.unsplash.com/photo-1613490493576-7fde63acd811');
  await dialog(page).getByLabel('Status', { exact: true }).selectOption('ACTIVE');
  await save(page);
  await page.getByLabel('Search properties').fill('Lifecycle Residence');
  await page.getByRole('button', { name: 'Edit Lifecycle Residence', exact: true }).click();
  await dialog(page).getByLabel('Title', { exact: true }).fill('Unsaved local title');
  const other = await context.newPage();
  await other.goto('/login');
  await other.getByRole('button', { name: 'Demo Admin Login' }).click();
  await expect(other.getByRole('heading', { name: 'Sales overview' })).toBeVisible();
  await other.goto('/admin/properties');
  await other.getByLabel('Search properties').fill('Lifecycle Residence');
  await other.getByRole('button', { name: 'Edit Lifecycle Residence', exact: true }).click();
  await dialog(other).getByLabel('Title', { exact: true }).fill('Updated Lifecycle Residence');
  await save(other);
  await expect(
    page.getByRole('button', {
      name: 'Edit Updated Lifecycle Residence',
      exact: true,
      includeHidden: true,
    }),
  ).toBeAttached();
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('has changed');
  await expect(dialog(page).getByLabel('Title', { exact: true })).toHaveValue(
    'Unsaved local title',
  );
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await other.close();
  await page
    .getByRole('button', { name: 'Delete Updated Lifecycle Residence', exact: true })
    .click();
  await dialog(page).getByLabel('Type property title to confirm').fill('Wrong title');
  await dialog(page).getByRole('button', { name: 'Delete property', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('Type the property title');
  await dialog(page)
    .getByLabel('Type property title to confirm')
    .fill('Updated Lifecycle Residence');
  await dialog(page).getByRole('button', { name: 'Delete property', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.reload();
  await page.getByLabel('Search properties').fill('Lifecycle Residence');
  await expect(page.getByRole('heading', { name: 'No matching records' })).toBeVisible();
  await expect(page.locator('.crm-timeline')).toContainText(
    'Deleted property Updated Lifecycle Residence',
  );
  await page.goto('/property/lifecycle-residence-21');
  await expect(page.locator('h1')).toHaveText('Page Not Found');
});

test('linked property delete action offers archive and removes the public listing', async ({
  page,
}) => {
  await page.goto('/admin/properties');
  await page.getByLabel('Search properties').fill('Palm Jumeirah Villa');
  await page.getByRole('button', { name: 'Delete Palm Jumeirah Villa', exact: true }).click();
  await expect(dialog(page)).toContainText('preserving this history');
  await expect(
    dialog(page).getByRole('button', { name: 'Delete property', exact: true }),
  ).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Archive property', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('.crm-table .crm-badge')).toHaveText('Inactive');
  await page.goto('/property/palm-jumeirah-villa');
  await expect(page.locator('h1')).toHaveText('Page Not Found');
});
