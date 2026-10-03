import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/repositories/seed.js';
import { applyCommand } from '../src/services/crmService.js';

const admin = { id: 'admin', role: 'ADMIN', name: 'Administrator' };
const agent = { id: 'agent', role: 'AGENT', agentId: 'agent-1' };
const create = (data) =>
  applyCommand(
    data,
    'saveProperty',
    { ...data.properties[0], id: undefined, title: 'Lifecycle Property' },
    admin,
  );

test('property lifecycle preserves audit history and rejects stale edits and deletion', () => {
  const data = createSeed();
  const property = create(data);
  const stale = { ...property, expectedVersion: 1 };
  applyCommand(
    data,
    'setPropertyFeatured',
    { id: property.id, featured: false, expectedVersion: 1 },
    admin,
  );
  assert.equal(property.version, 2);
  assert.throws(
    () => applyCommand(data, 'saveProperty', { ...stale, title: 'Stale edit' }, admin),
    /has changed/,
  );
  assert.throws(
    () =>
      applyCommand(
        data,
        'deleteProperty',
        { id: property.id, confirmTitle: property.title, expectedVersion: 1 },
        admin,
      ),
    /has changed/,
  );
  assert.throws(
    () =>
      applyCommand(
        data,
        'deleteProperty',
        { id: property.id, confirmTitle: 'Wrong title', expectedVersion: 2 },
        admin,
      ),
    /confirm deletion/,
  );
  applyCommand(
    data,
    'deleteProperty',
    { id: property.id, confirmTitle: property.title, expectedVersion: 2 },
    admin,
  );
  assert.ok(!data.properties.some((row) => row.id === property.id));
  assert.deepEqual(
    data.propertyEvents.map((event) => event.type),
    ['DELETED', 'UPDATED', 'CREATED'],
  );
  assert.ok(
    create(data).id > property.id,
    'Deleted IDs must not be reused for a different property',
  );
});

test('linked property deletion is blocked; archive preserves leads, deals and viewing history', () => {
  const data = createSeed();
  const property = data.properties.find((row) =>
    data.leads.some((lead) => lead.propertyId === row.id),
  );
  const payload = { id: property.id, expectedVersion: 1, confirmTitle: property.title };
  const leads = structuredClone(data.leads);
  const viewings = structuredClone(data.viewings);
  assert.throws(() => applyCommand(data, 'deleteProperty', payload, admin), /linked leads/);
  for (const command of ['deleteProperty', 'archiveProperty', 'setPropertyFeatured']) {
    assert.throws(() => applyCommand(data, command, payload, agent), /Administrator/);
  }
  applyCommand(data, 'archiveProperty', payload, admin);
  assert.equal(property.status, 'INACTIVE');
  assert.equal(property.featured, false);
  assert.deepEqual(data.leads, leads);
  assert.deepEqual(data.viewings, viewings);
  assert.throws(
    () =>
      applyCommand(
        data,
        'inquiry',
        {
          name: 'Customer',
          email: 'customer@example.com',
          phone: '+971501234567',
          country: 'UAE',
          propertyId: property.id,
          message: 'Please arrange a viewing.',
        },
        null,
      ),
    /unavailable/,
  );
});

test('property updates require a version and validate input before changing data', () => {
  const data = createSeed();
  const property = data.properties[0];
  const before = structuredClone(data);
  for (const payload of [
    { ...property },
    { ...property, expectedVersion: 1, title: 'x'.repeat(201) },
    { ...property, expectedVersion: 1, images: Array(51).fill('https://example.com/image.jpg') },
    { ...property, expectedVersion: 1, bedrooms: 1.5 },
  ])
    assert.throws(() => applyCommand(data, 'saveProperty', payload, admin));
  assert.deepEqual(data, before);
});
