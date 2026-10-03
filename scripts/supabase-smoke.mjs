// Opt-in hosted acceptance check. Creates and removes only its own test records.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, expect as playwrightExpect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { admin, url } from './supabase-admin.mjs';

const baseURL = process.argv[2] || process.env.SUPABASE_APP_URL || 'http://localhost:5173';
const expect = playwrightExpect.configure({ timeout: 30000 });
const runId = randomUUID();
const customerName = `Connection check ${runId.slice(0, 8)}`;
const customerEmail = `inquiry-${runId}@example.invalid`;
const agentId = `CHECK-${runId}`;
const directoryEmail = `directory-${runId}@example.invalid`;
const directoryName = `Directory check ${runId.slice(0, 8)}`;
const propertyTitle = `Property check ${runId}`;
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
  const properties = requireResult(
    await publicClient.from('properties').select('id,slug,title').order('id'),
  );
  assert.ok(
    properties.length,
    'At least one published property is required for the inquiry check.',
  );
  const property = properties.find((row) => row.slug === 'palm-jumeirah-villa') || properties[0];
  const denied = await publicClient.from('leads').select('id');
  assert.equal(denied.error?.code, '42501', 'Anonymous CRM reads must be denied.');
  console.log('Public catalog reads and anonymous CRM access restrictions passed.');
  requireResult(
    await admin.from('agents').insert({
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
      await admin.from('profiles').insert({
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
  await page.goto(`/property/${property.slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toHaveText(property.title, { timeout: 30000 });
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
  await page.goto('/admin/agents');
  await page.getByRole('button', { name: 'Add agent', exact: true }).click();
  await modal().getByLabel('Name', { exact: true }).fill(directoryName);
  await modal().getByLabel('Email', { exact: true }).fill(directoryEmail);
  await modal().getByLabel('Phone', { exact: true }).fill('+971500000000');
  await modal().getByLabel('Specialization').fill('Connection verification');
  await modal().getByLabel('Languages (comma separated)').fill('English');
  await modal().getByLabel('Locations (comma separated)').fill('Dubai');
  await save();
  const directoryAgent = requireResult(
    await admin.from('agents').select('id').eq('email', directoryEmail).single(),
  );
  await page.getByLabel('Search agents').fill(directoryEmail);
  await page.getByRole('button', { name: `Edit ${directoryName}`, exact: true }).click();
  await modal().getByLabel('Status', { exact: true }).selectOption('INACTIVE');
  await save();
  assert.equal(
    requireResult(await admin.from('agents').select('status').eq('id', directoryAgent.id).single())
      .status,
    'INACTIVE',
  );
  await page.getByRole('button', { name: `Delete ${directoryName}`, exact: true }).click();
  await modal().getByLabel('Type agent name to confirm').fill(directoryName);
  await modal().getByRole('button', { name: 'Delete agent', exact: true }).click();
  await expect(modal()).toHaveCount(0, { timeout: 30000 });
  assert.equal(
    requireResult(await admin.from('agents').select('id').eq('id', directoryAgent.id)).length,
    0,
  );
  assert.equal(
    requireResult(await admin.from('agent_events').select('id').eq('agent_id', directoryAgent.id))
      .length,
    3,
  );
  console.log('Agent add/edit/delete icons, hosted persistence and retained team history passed.');

  await page.goto('/admin/properties');
  await page.getByRole('button', { name: 'Add property', exact: true }).click();
  await modal().getByLabel('Title', { exact: true }).fill(propertyTitle);
  await modal().getByLabel('Price (AED)').fill('1500000');
  await modal().getByLabel('Area (sq ft)').fill('1200');
  await modal()
    .getByLabel('Description')
    .fill('Temporary property for hosted acceptance verification.');
  await modal()
    .getByLabel('Image URLs (one per line)')
    .fill('https://images.unsplash.com/photo-1613490493576-7fde63acd811');
  await save();
  const testProperty = requireResult(
    await admin.from('properties').select('id,version').eq('title', propertyTitle).single(),
  );
  await page.getByLabel('Search properties').fill(propertyTitle);
  await page.getByRole('button', { name: `Edit ${propertyTitle}`, exact: true }).click();
  await modal().getByLabel('Price (AED)').fill('1600000');
  const propertyReads = '**/rest/v1/properties?**';
  await page.route(propertyReads, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Acceptance test: temporary read outage' }),
    }),
  );
  await save();
  await expect(page.getByRole('alert')).toContainText('Your change was saved');
  assert.equal(
    Number(
      requireResult(
        await admin.from('properties').select('price').eq('id', testProperty.id).single(),
      ).price,
    ),
    1600000,
  );
  await page.unroute(propertyReads);
  // Realtime may recover first and remove the retry banner; the toolbar refresh
  // remains available in both cases and must also recover the current snapshot.
  await page.getByRole('button', { name: 'Refresh workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry refresh', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: `Edit ${propertyTitle}`, exact: true }).click();
  await modal().getByLabel('Price (AED)').fill('1700000');
  requireResult(
    await admin.from('properties').update({ price: 1800000 }).eq('id', testProperty.id),
  );
  await modal().getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal().getByRole('alert')).toContainText('has changed', { timeout: 30000 });
  await modal().getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.reload();
  await page.getByLabel('Search properties').fill(propertyTitle);
  await page.getByRole('button', { name: `Delete ${propertyTitle}`, exact: true }).click();
  await modal().getByLabel('Type property title to confirm').fill(propertyTitle);
  await modal().getByRole('button', { name: 'Delete property', exact: true }).click();
  await expect(modal()).toHaveCount(0, { timeout: 30000 });
  assert.equal(
    requireResult(await admin.from('properties').select('id').eq('id', testProperty.id)).length,
    0,
  );
  assert.equal(
    requireResult(
      await admin.from('property_events').select('id').eq('property_id', testProperty.id),
    ).length,
    3,
  );
  console.log(
    'Property add/edit/delete icons, concurrent edit protection and retained audit history passed.',
  );

  await page.goto('/admin/leads');
  await page.getByLabel('Search leads').fill(customerEmail);
  await page.getByRole('button', { name: 'Select page', exact: true }).click();
  await page.getByRole('button', { name: 'Assign selected', exact: true }).click();
  await modal().getByLabel('Assign to agent').selectOption(agentId);
  await modal().getByRole('button', { name: 'Assign leads', exact: true }).click();
  await expect(modal()).toHaveCount(0, { timeout: 30000 });
  assert.equal(
    requireResult(await admin.from('leads').select('assigned_agent_id').eq('id', lead.id).single())
      .assigned_agent_id,
    agentId,
  );

  await page.goto('/admin/reports');
  await page.getByLabel('Report agent').selectOption(agentId);
  await expect(page.getByText(/matching leads. Dates filter/)).toContainText('1 matching leads');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report', exact: true }).click();
  const download = await downloadEvent;
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  assert.ok(Buffer.concat(chunks).toString('utf8').includes(customerEmail));
  console.log('Hosted bulk assignment, filtered report and CSV download passed.');
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
  await logout();
  await login(users[0]);
  await page.goto(`/admin/agents/${agentId}`);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await modal().getByLabel('Status', { exact: true }).selectOption('INACTIVE');
  await save();
  await logout();
  await page.getByLabel('Email', { exact: true }).fill(users[1].email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('no active CRM profile');
  const inactiveClient = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    requireResult(
      await inactiveClient.auth.signInWithPassword({ email: users[1].email, password }),
    );
    assert.equal(requireResult(await inactiveClient.from('leads').select('id')).length, 0);
    assert.match(
      (await inactiveClient.rpc('crm_command', { command: 'readNotifications', payload: {} })).error
        ?.message || '',
      /inactive/,
    );
  } finally {
    await inactiveClient.auth.signOut();
  }
  assert.deepEqual(problems, []);
  console.log('Inactive agent browser login and direct API access restrictions passed.');
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
  await clean(() => admin.from('properties').delete().eq('title', propertyTitle));
  await clean(() => admin.from('agents').delete().eq('email', directoryEmail));
  for (const user of users) {
    await clean(() => admin.from('agent_events').delete().eq('actor_id', user.id));
    await clean(() => admin.from('property_events').delete().eq('actor_id', user.id));
    await clean(() => admin.auth.admin.deleteUser(user.id));
  }
  if (agentCreated) await clean(() => admin.from('agents').delete().eq('id', agentId));
  if (cleanupErrors.length)
    throw new Error(`Test cleanup needs attention (${runId}): ${cleanupErrors.join('; ')}`);
  console.log('Temporary acceptance-test accounts and records removed.');
}
