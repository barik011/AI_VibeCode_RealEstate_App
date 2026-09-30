import { test, expect } from '@playwright/test';
const modal = (page) => page.getByRole('dialog');
const login = async (page, role = 'Admin') => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: `Demo ${role} Login` }).click();
  await expect(page.locator('h1')).toBeVisible();
};
const save = async (page) => {
  await modal(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
};
const future = (days) => {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(13, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T13:00`;
};
test.beforeEach(async ({ page }) => {
  test.setTimeout(120000);
  await page.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    }),
  );
});
test('normal login validation, remember me, sign out and password help', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@dubaihouse.demo');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Demo123!');
  await page.getByLabel('Password', { exact: true }).fill('Demo123!');
  await page.getByLabel('Remember me').check();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/admin/dashboard');
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Sales overview');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dubai-bayt:session')).id)).toBe(
    'profile-admin',
  );
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/admin/tasks');
  await expect(page).toHaveURL('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email', { exact: true }).fill('admin@dubaihouse.demo');
  await page.getByRole('button', { name: 'Show reset instructions' }).click();
  await expect(page.getByText(/No reset email is sent/)).toBeVisible();
});
test('task and follow-up rescheduling, completion, cancellation and calendar links', async ({
  page,
}) => {
  await login(page, 'Agent');
  await page.goto('/agent/leads/LEAD-1002');
  await page.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
  await modal(page).getByLabel('Title', { exact: true }).fill('Management follow-up');
  await modal(page).getByLabel('Date and time').fill(future(2));
  await save(page);
  await page.goto('/agent/tasks');
  await page.getByLabel('Search tasks').fill('Management follow-up');
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
  await modal(page).getByLabel('New date and time').fill(future(3));
  await save(page);
  await page.getByRole('button', { name: 'Start task', exact: true }).click();
  await expect(page.locator('.crm-work-card .crm-badge').first()).toHaveText('In Progress');
  await page.goto('/agent/calendar');
  const current = new Date().getMonth();
  if (new Date(future(3)).getMonth() !== current)
    await page.getByRole('button', { name: 'Next month' }).click();
  await page.getByRole('link', { name: /Management follow-up/ }).click();
  await expect(page).toHaveURL(/agent\/tasks\?record=/);
  await page.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(page.locator('.crm-work-card .crm-badge').first()).toHaveText('Completed');
  await page.reload();
  await expect(page.locator('.crm-work-card .crm-badge').first()).toHaveText('Completed');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await modal(page).getByLabel('Lead', { exact: true }).selectOption('LEAD-1002');
  await modal(page).getByLabel('Title', { exact: true }).fill('Cancel this task');
  await modal(page).getByLabel('Date and time').fill(future(3));
  await save(page);
  await page.getByRole('button', { name: 'Show all records' }).click();
  await page.getByLabel('Search tasks').fill('Cancel this task');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await modal(page).getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.crm-work-card .crm-badge').first()).toHaveText('Cancelled');
});
test('viewing rescheduling and cancellation records the outcome and preserves the lead', async ({
  page,
}) => {
  await login(page, 'Agent');
  await page.goto('/agent/leads/LEAD-1002');
  await page.getByRole('button', { name: 'Schedule viewing', exact: true }).click();
  await modal(page).getByLabel('Date and time').fill(future(20));
  await modal(page).getByLabel('Meeting location').fill('Management test lobby');
  await save(page);
  await page.goto('/agent/viewings');
  await page.getByLabel('Search viewings').fill('Management test lobby');
  await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
  await modal(page).getByLabel('New date and time').fill(future(21));
  await save(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await modal(page).getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator('.crm-work-card .crm-badge')).toHaveText('Cancelled');
  await page.goto('/agent/leads/LEAD-1002');
  await expect(page.locator('.crm-timeline')).toContainText('Viewing rescheduled');
  await expect(page.locator('.crm-timeline')).toContainText('Viewing cancelled');
  await expect(page.locator('.crm-page-heading .crm-badge').first()).toHaveText('Follow Up');
});
test('manual lead creation, filters, property publish controls and saved preferences', async ({
  page,
}) => {
  await login(page);
  await page.goto('/admin/leads');
  await page.getByLabel('Agent', { exact: true }).selectOption('agent-1');
  await expect(page.locator('.crm-table tbody tr')).toHaveCount(7);
  await page.getByLabel('Status', { exact: true }).selectOption('ASSIGNED');
  await expect(page.locator('.crm-table tbody tr')).toHaveCount(2);
  await page.getByLabel('Source', { exact: true }).selectOption('Referral');
  await expect(page.locator('.crm-table tbody tr')).toHaveCount(1);
  await page.getByLabel('Priority', { exact: true }).selectOption('LOW');
  await expect(page.getByText('No matching records', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Created from').fill('2099-01-01');
  await expect(page.getByText('No matching records', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Sort', { exact: true }).selectOption('name');
  await expect(page.locator('.crm-table tbody tr').first()).toContainText('Adam Scott');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.crm-pagination')).toContainText('Page 2 of 4');
  await page.getByRole('button', { name: 'Add lead', exact: true }).click();
  await modal(page).getByLabel('Customer name').fill('Manual Lead');
  await modal(page).getByLabel('Email', { exact: true }).fill('manual@example.com');
  await modal(page).getByLabel('Phone', { exact: true }).fill('+971501234567');
  await save(page);
  await expect(page.locator('h1')).toHaveText('Manual Lead');
  await page.goto('/admin/properties?add=1');
  await modal(page).getByLabel('Title', { exact: true }).fill('Recruiter Test Residence');
  await modal(page).getByLabel('Price (AED)').fill('3000000');
  await modal(page).getByLabel('Area (sq ft)').fill('1800');
  await modal(page)
    .getByLabel('Description')
    .fill('A spacious demonstration residence with a private terrace.');
  await modal(page)
    .getByLabel('Image URLs (one per line)')
    .fill('https://images.unsplash.com/photo-1613490493576-7fde63acd811');
  await modal(page).getByLabel('Status', { exact: true }).selectOption('ACTIVE');
  await save(page);
  await page.getByLabel('Search properties').fill('Recruiter Test Residence');
  await page.getByRole('button', { name: 'Feature Recruiter Test Residence', exact: true }).click();
  await page.reload();
  await page.getByLabel('Search properties').fill('Recruiter Test Residence');
  await expect(
    page.getByRole('button', { name: 'Unfeature Recruiter Test Residence' }),
  ).toBeVisible();
  await page.goto('/property/recruiter-test-residence-21');
  await expect(page.locator('h1')).toHaveText('Recruiter Test Residence');
  await page.goto('/admin/properties');
  await page.getByLabel('Search properties').fill('Recruiter Test Residence');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await modal(page).getByLabel('Status', { exact: true }).selectOption('DRAFT');
  await save(page);
  await page.goto('/property/recruiter-test-residence-21');
  await expect(page.locator('h1')).toHaveText('Page Not Found');
  await page.goto('/admin/settings');
  await page.getByLabel('Company name').fill('Dubai House Demo');
  await page.getByLabel('Default lead view').selectOption('kanban');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.reload();
  await expect(page.getByLabel('Company name')).toHaveValue('Dubai House Demo');
  await page.goto('/admin/leads');
  await expect(page.getByRole('button', { name: 'Kanban', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
