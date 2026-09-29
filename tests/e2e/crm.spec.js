import { test, expect } from '@playwright/test';
const login = async (page, role = 'Admin') => {
  await page.goto('/login');
  await page.getByRole('button', { name: `Demo ${role} Login` }).click();
  await expect(page).toHaveURL(new RegExp(`/${role.toLowerCase()}/dashboard`));
};
const dialog = (page) => page.getByRole('dialog');
const save = async (page) => {
  await dialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
};
const localDate = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
test.beforeEach(async ({ page }) => {
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect width="100" height="80" fill="#9cabb5"/></svg>',
    }),
  );
});
test('inquiry to admin assignment to agent follow-up viewing won and refresh', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/property/palm-jumeirah-villa');
  await page.getByLabel('Full name').fill('Recruiter Workflow');
  await page.getByLabel('Email address', { exact: true }).fill('recruiter@example.com');
  await page.getByLabel('Phone number').fill('+971501234567');
  await page.getByLabel('Country', { exact: true }).fill('UAE');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Let’s start a conversation' }).click();
  await expect(page.locator('.form-success')).toContainText(
    'Your property inquiry has been received',
  );
  await login(page);
  await page.getByRole('link', { name: 'Recruiter Workflow', exact: true }).click();
  const leadRoute = new URL(page.url()).pathname;
  await page.getByRole('button', { name: 'Assign agent', exact: true }).click();
  await dialog(page).getByLabel('Agent', { exact: true }).selectOption('agent-1');
  await save(page);
  await expect(page.locator('.crm-timeline')).toContainText('Assigned to Sarah Ahmed');
  await login(page, 'Agent');
  await page.goto(leadRoute.replace('/admin/', '/agent/'));
  await expect(page.locator('h1')).toHaveText('Recruiter Workflow');
  await page.getByRole('button', { name: 'Log communication' }).click();
  await dialog(page)
    .getByLabel('Conversation notes')
    .fill('Customer confirmed budget and availability.');
  await save(page);
  await page.getByRole('button', { name: 'Add note', exact: true }).first().click();
  await dialog(page).getByLabel('Note', { exact: true }).fill('Prefers a sea view.');
  await save(page);
  const now = Date.now();
  const viewingTime = now + 10 * 86400000;
  const followTime = now + 11 * 86400000;
  await page.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
  await dialog(page).getByLabel('Date and time').fill(localDate(followTime));
  await save(page);
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await dialog(page).getByLabel('Title', { exact: true }).fill('Prepare shortlist');
  await dialog(page).getByLabel('Date and time').fill(localDate(followTime));
  await save(page);
  await page.getByRole('button', { name: 'Schedule viewing', exact: true }).click();
  await dialog(page).getByLabel('Date and time').fill(localDate(viewingTime));
  await dialog(page).getByLabel('Meeting location').fill('Palm main lobby');
  await save(page);
  await page.goto('/agent/viewings');
  await page.getByLabel('Search viewings').fill('Recruiter Workflow');
  await expect(page.getByRole('button', { name: 'Complete viewing' })).toBeDisabled();
  await page.clock.install({ time: new Date(viewingTime + 120000) });
  await page.reload();
  await page.getByLabel('Search viewings').fill('Recruiter Workflow');
  await page.getByRole('button', { name: 'Complete viewing' }).click();
  await dialog(page).getByLabel('Outcome', { exact: true }).selectOption('Very Interested');
  await dialog(page).getByLabel('Outcome notes').fill('Ready to negotiate the final price.');
  await save(page);
  await page.goto(leadRoute.replace('/admin/', '/agent/'));
  await expect(page.locator('.crm-page-heading .crm-badge').first()).toHaveText('Negotiation');
  await page.getByRole('button', { name: 'Mark as Won', exact: true }).click();
  await dialog(page).getByLabel('Final deal value (AED)').fill('27500000');
  await dialog(page).getByRole('checkbox').check();
  await dialog(page).getByRole('button', { name: 'Confirm won deal' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('.crm-page-heading .crm-badge').first()).toHaveText('Won');
  await page.reload();
  await expect(page.locator('.crm-timeline')).toContainText('Deal marked as won');
  await expect(page.getByText('Prefers a sea view.', { exact: true })).toBeVisible();
  await login(page);
  await page.goto('/admin/reports');
  await expect(page.locator('.crm-stat').filter({ hasText: 'Won deal value' })).toContainText(
    'AED',
  );
  expect(errors).toEqual([]);
});
test('route guards, assignment isolation, search, filters, notifications and lost outcome', async ({
  page,
}) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL('/login');
  await login(page, 'Agent');
  await page.goto('/admin/leads');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  await page.goto('/agent/leads/LEAD-1003');
  await expect(page.getByText('Lead unavailable', { exact: true })).toBeVisible();
  await page.goto('/agent/dashboard');
  await page.getByLabel('Search CRM').fill('Daniel Cooper');
  await expect(page.getByText('No matching records')).toBeVisible();
  await login(page);
  await page.goto('/admin/leads');
  await page.getByLabel('Search leads').fill('Amelia Ross');
  await expect(page.locator('.crm-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Kanban', exact: true }).click();
  await expect(page.locator('.crm-lead-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Change stage for Amelia Ross' }).click();
  await dialog(page).getByLabel('Stage').selectOption('CONTACTED');
  await save(page);
  await page.getByRole('link', { name: 'Amelia Ross', exact: true }).click();
  await page.getByRole('button', { name: 'Mark as Lost', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Confirm lost lead' }).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByLabel('Lost reason').selectOption('No Response');
  await dialog(page).getByRole('button', { name: 'Confirm lost lead' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('.crm-page-heading .crm-badge').first()).toHaveText('Lost');
  await page.getByRole('button', { name: /Notifications, / }).click();
  await dialog(page).getByRole('button', { name: 'Mark all as read' }).click();
  await dialog(page).getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible();
});
test('property changes update public catalog, settings reset and all CRM routes render', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  for (const route of [
    'dashboard',
    'leads',
    'leads/LEAD-1002',
    'properties',
    'agents',
    'agents/agent-1',
    'viewings',
    'tasks',
    'reports',
    'settings',
  ]) {
    await page.goto(`/admin/${route}`);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.goto('/admin/properties');
  await page.getByLabel('Search properties').fill('Palm Jumeirah Villa');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog(page).getByLabel('Title', { exact: true }).fill('Palm Jumeirah Villa Updated');
  await save(page);
  await page.goto('/property/palm-jumeirah-villa');
  await expect(page.locator('h1')).toHaveText('Palm Jumeirah Villa Updated');
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Palm Jumeirah Villa Updated');
  await page.goto('/admin/settings');
  await page.getByRole('button', { name: 'Reset Demo Data', exact: true }).click();
  await dialog(page).getByRole('checkbox').check();
  await dialog(page).getByRole('button', { name: 'Reset Demo Data', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.goto('/property/palm-jumeirah-villa');
  await expect(page.locator('h1')).toHaveText('Palm Jumeirah Villa');
  await login(page, 'Agent');
  for (const route of [
    'dashboard',
    'leads',
    'leads/LEAD-1002',
    'tasks',
    'viewings',
    'calendar',
    'profile',
  ]) {
    await page.goto(`/agent/${route}`);
    await expect(page.locator('h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('CRM responsive layouts, drawer, modal keyboard and screenshots', async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  await page.screenshot({ path: 'artifacts/crm-dashboard-desktop.png', fullPage: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      'dashboard',
      'leads',
      'leads/LEAD-1002',
      'properties',
      'tasks',
      'reports',
    ]) {
      await page.goto(`/admin/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Open CRM navigation' }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open CRM navigation' })).toBeFocused();
  await page.screenshot({ path: 'artifacts/crm-dashboard-mobile.png', fullPage: true });
});
