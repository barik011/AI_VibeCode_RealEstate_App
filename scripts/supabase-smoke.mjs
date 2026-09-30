// Opt-in hosted acceptance check. Creates and removes only its own test records.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { admin, url } from './supabase-admin.mjs';

const baseURL = process.argv[2] || process.env.SUPABASE_APP_URL || 'http://localhost:5173';
const runId = randomUUID();
const customerName = `Connection check ${runId.slice(0, 8)}`;
const customerEmail = `inquiry-${runId}@example.invalid`;
const agentId = `CHECK-${runId}`;
const password = `${randomUUID()}Aa1!`;
const users = [];
const problems = [];
let browser;
let agentCreated = false;
const requireResult = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
const publicClient = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const localDate = (days) => {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(13, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T13:00`;
};
try {
  assert.ok(requireResult(await publicClient.from('properties').select('id')).length >= 20);
  const denied = await publicClient.from('leads').select('id');
  assert.equal(denied.error?.code, '42501', 'Anonymous CRM reads must be denied.');
  console.log('Public catalog reads and anonymous CRM access restrictions passed.');
  requireResult(
    await admin
      .from('agents')
      .insert({
        id: agentId,
        name: 'Connection Check Agent',
        email: `agent-${runId}@example.invalid`,
        phone: '+971500000000',
        specialization: 'Acceptance testing',
        locations: ['Dubai'],
        languages: ['English'],
        status: 'ACTIVE',
      }),
  );
  agentCreated = true;
  for (const role of ['ADMIN', 'AGENT']) {
    const email = `${role.toLowerCase()}-${runId}@example.invalid`;
    const { user } = requireResult(
      await admin.auth.admin.createUser({ email, password, email_confirm: true }),
    );
    users.push(user);
    requireResult(
      await admin
        .from('profiles')
        .insert({
          id: user.id,
          name: `Connection Check ${role}`,
          role,
          agent_id: role === 'AGENT' ? agentId : null,
        }),
    );
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL });
  await context.route('https://images.unsplash.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"/>',
    }),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => problems.push(error.message));
  const login = async (user) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Demo .* Login/ })).toHaveCount(0);
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/(admin|agent)\/dashboard/, { timeout: 30000 });
  };
  const logout = async () => {
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  };
  const modal = () => page.getByRole('dialog');
  const save = async () => {
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modal()).toHaveCount(0, { timeout: 30000 });
  };
  await page.goto('/property/palm-jumeirah-villa', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText('Palm Jumeirah Villa', { timeout: 30000 });
  await page.getByLabel('Full name').fill(customerName);
  await page.getByLabel('Email address', { exact: true }).fill(customerEmail);
  await page.getByLabel('Phone number').fill('+971500000000');
  await page.getByLabel('Country', { exact: true }).fill('UAE');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /start a conversation/ }).click();
  await expect(page.locator('.form-success')).toContainText('received', { timeout: 30000 });
  const lead = requireResult(
    await admin.from('leads').select('id,status').eq('customer_email', customerEmail).single(),
  );
  assert.equal(lead.status, 'NEW');
  console.log('Public browser inquiry persisted in the hosted database.');
  await login(users[0]);
  await page.goto(`/admin/leads/${lead.id}`);
  await page.getByRole('button', { name: 'Assign agent', exact: true }).click();
  await modal().getByLabel('Agent', { exact: true }).selectOption(agentId);
  await save();
  await logout();
  await login(users[1]);
  await page.goto('/agent/leads/LEAD-1003');
  await expect(page.getByText('Lead unavailable', { exact: true })).toBeVisible();
  await page.goto(`/agent/leads/${lead.id}`);
  await expect(page.locator('h1')).toHaveText(customerName);
  await page.getByRole('button', { name: 'Log communication' }).click();
  await modal().getByLabel('Conversation notes').fill('Live database connection verified.');
  await save();
  await page.getByRole('button', { name: 'Schedule follow-up', exact: true }).click();
  await modal().getByLabel('Date and time').fill(localDate(10));
  await save();
  await page.getByRole('button', { name: 'Schedule viewing', exact: true }).click();
  await modal().getByLabel('Date and time').fill(localDate(9));
  await modal().getByLabel('Meeting location').fill('Connection verification lobby');
  await save();
  const viewing = requireResult(
    await admin.from('viewings').select('id').eq('lead_id', lead.id).single(),
  );
  // Advance only this test viewing, using server-side time (never the user's data).
  requireResult(
    await admin
      .from('viewings')
      .update({ date: new Date(Date.now() - 3600000).toISOString() })
      .eq('id', viewing.id),
  );
  await page.goto('/agent/viewings');
  await page.getByLabel('Search viewings').fill(customerName);
  await page.getByRole('button', { name: 'Complete viewing' }).click();
  await modal().getByLabel('Outcome', { exact: true }).selectOption('Very Interested');
  await modal().getByLabel('Outcome notes').fill('Hosted workflow verified.');
  await save();
  await page.goto(`/agent/leads/${lead.id}`);
  await expect(page.locator('.crm-page-heading .crm-badge').first()).toHaveText('Negotiation');
  await page.getByRole('button', { name: 'Mark as Won', exact: true }).click();
  await modal().getByLabel('Final deal value (AED)').fill('27500000');
  await modal().getByRole('checkbox').check();
  await modal().getByRole('button', { name: 'Confirm won deal' }).click();
  await expect(modal()).toHaveCount(0, { timeout: 30000 });
  await page.reload();
  await expect(page.locator('.crm-page-heading .crm-badge').first()).toHaveText('Won');
  assert.equal(
    requireResult(await admin.from('leads').select('status').eq('id', lead.id).single()).status,
    'WON',
  );
  assert.deepEqual(problems, []);
  console.log(
    'Real password login, assignment, agent isolation, follow-up, viewing, won deal and refresh persistence passed.',
  );
} finally {
  await browser?.close();
  const cleanupErrors = [];
  const clean = async (work) => {
    try {
      requireResult(await work());
    } catch (error) {
      cleanupErrors.push(error.message);
    }
  };
  const found = await admin.from('leads').select('id').eq('customer_email', customerEmail);
  if (found.error) cleanupErrors.push(found.error.message);
  else
    for (const { id } of found.data) {
      for (const table of ['notifications', 'lead_activities', 'lead_notes', 'tasks', 'viewings'])
        await clean(() => admin.from(table).delete().eq('lead_id', id));
      await clean(() => admin.from('leads').delete().eq('id', id));
    }
  for (const user of users) await clean(() => admin.auth.admin.deleteUser(user.id));
  if (agentCreated) await clean(() => admin.from('agents').delete().eq('id', agentId));
  if (cleanupErrors.length)
    throw new Error(`Test cleanup needs attention (${runId}): ${cleanupErrors.join('; ')}`);
  console.log('Temporary acceptance-test accounts and records removed.');
}
