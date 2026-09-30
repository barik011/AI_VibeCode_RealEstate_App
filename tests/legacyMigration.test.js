import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/repositories/seed.js';
import { mergeLegacyInquiries, prepareLocalImport } from '../src/repositories/legacyMigration.js';
test('legacy inquiry migration preserves dates, property references and messages without duplicates', () => {
  const seed = createSeed();
  const archive = [
    {
      name: 'Legacy Visitor',
      email: 'legacy@example.com',
      phone: '+971501234567',
      country: 'UAE',
      property: 'palm-jumeirah-villa',
      createdAt: '2026-09-20T10:00:00Z',
      message: 'A sea view please.',
      budget: '1–5 million',
    },
  ];
  const migrated = mergeLegacyInquiries(seed, archive, seed.properties);
  assert.equal(migrated.leads.length, 41);
  assert.equal(seed.leads.length, 40);
  const lead = migrated.leads.at(-1);
  assert.equal(lead.propertyId, 1);
  assert.equal(lead.budget.max, 5000000);
  assert.equal(lead.createdAt, '2026-09-20T10:00:00.000Z');
  assert.equal(migrated.notes.at(-1).content, 'A sea view please.');
  assert.equal(mergeLegacyInquiries(migrated, archive, seed.properties).leads.length, 41);
});

test('standalone archives can migrate without creating demo CRM records', () => {
  const archive = [
    {
      name: 'Visitor',
      email: 'visitor@example.com',
      phone: '+971501234567',
      message: 'Please call me.',
    },
  ];
  const migrated = prepareLocalImport(
    null,
    archive,
    ' Subscriber@Example.com ',
    createSeed().properties,
  );
  assert.equal(migrated.leads.length, 1);
  assert.equal(migrated.properties.length, 0);
  assert.equal(migrated.agents.length, 0);
  assert.deepEqual(migrated.newsletter, ['subscriber@example.com']);
  assert.equal(prepareLocalImport(null, [], null, []), null);
  assert.equal(prepareLocalImport(null, [null, {}], 'invalid', []), null);
});

test('inquiries already linked to CRM leads are not imported twice', () => {
  const seed = createSeed();
  const lead = seed.leads[0];
  const archive = [{ ...lead.customer, leadId: lead.id, message: 'Already captured' }];
  const migrated = prepareLocalImport(seed, archive, null, seed.properties);
  assert.equal(migrated.leads.length, seed.leads.length);
  assert.equal(migrated.notes.length, seed.notes.length);
});
