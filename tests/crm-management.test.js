import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/repositories/seed.js';
import { applyCommand } from '../src/services/crmService.js';
import {
  followUpState,
  filterReport,
  toCsv,
  leadExportRows,
} from '../src/features/crm/reporting.js';

const admin = { id: 'admin', name: 'Administrator', role: 'ADMIN' };
const agent = { id: 'profile-agent', name: 'Sarah Ahmed', role: 'AGENT', agentId: 'agent-1' };
const fields = {
  name: 'New Agent',
  email: 'new@example.com',
  phone: '+971501234567',
  specialization: 'Residential',
  languages: 'English, Arabic, English',
  locations: 'Dubai Marina',
  status: 'ACTIVE',
};

test('agent lifecycle validates before mutation and retains team history after deletion', () => {
  const data = createSeed();
  assert.throws(() => applyCommand(data, 'createAgent', fields, agent), /Administrator/);
  const added = applyCommand(data, 'createAgent', fields, admin);
  assert.deepEqual(added.languages, ['English', 'Arabic']);
  assert.throws(
    () => applyCommand(data, 'createAgent', { ...fields, email: 'NEW@EXAMPLE.COM' }, admin),
    /already exists/,
  );
  const before = structuredClone(data);
  assert.throws(
    () => applyCommand(data, 'saveAgent', { ...fields, id: added.id, phone: 'invalid' }, admin),
    /phone/,
  );
  assert.deepEqual(data, before);
  assert.throws(
    () => applyCommand(data, 'saveAgent', { ...fields, id: added.id, languages: ', , ' }, admin),
    /Languages/,
  );
  assert.throws(
    () => applyCommand(data, 'saveAgent', { ...fields, id: added.id }, agent),
    /Access denied/,
  );
  applyCommand(
    data,
    'saveAgent',
    { ...fields, id: added.id, name: 'Updated Agent', status: 'INACTIVE' },
    admin,
  );
  assert.throws(
    () => applyCommand(data, 'deleteAgent', { id: added.id, confirmName: fields.name }, admin),
    /confirm/,
  );
  applyCommand(data, 'deleteAgent', { id: added.id, confirmName: 'Updated Agent' }, admin);
  assert.ok(!data.agents.some((row) => row.id === added.id));
  assert.deepEqual(
    data.agentEvents.map((event) => event.type),
    ['DELETED', 'UPDATED', 'CREATED'],
  );
});

test('linked history prevents deletion, workload prevents deactivation and inactive agents cannot mutate', () => {
  const data = createSeed();
  const existing = data.agents.find((row) => row.id === agent.agentId);
  assert.throws(
    () => applyCommand(data, 'deleteAgent', { id: existing.id, confirmName: existing.name }, admin),
    /linked CRM/,
  );
  assert.throws(
    () =>
      applyCommand(
        data,
        'saveAgent',
        { ...existing, languages: existing.languages.join(','), status: 'INACTIVE' },
        admin,
      ),
    /Reassign/,
  );
  existing.status = 'INACTIVE';
  assert.throws(
    () => applyCommand(data, 'note', { id: 'LEAD-1002', content: 'Unauthorized' }, agent),
    /inactive/,
  );
});

test('bulk assignment transfers open work, logs changes and rejects a whole invalid batch', () => {
  const data = createSeed();
  const leads = data.leads
    .filter((lead) => lead.assignedAgentId === 'agent-1' && !['WON', 'LOST'].includes(lead.status))
    .slice(0, 2);
  const ids = leads.map((lead) => lead.id);
  assert.throws(
    () => applyCommand(data, 'bulkAssign', { ids, agentId: 'agent-2' }, agent),
    /Administrator/,
  );
  const before = structuredClone(data);
  assert.throws(
    () => applyCommand(data, 'bulkAssign', { ids: [...ids, 'missing'], agentId: 'agent-2' }, admin),
    /not found/,
  );
  assert.deepEqual(data, before);
  assert.throws(
    () =>
      applyCommand(data, 'bulkAssign', { ids: Array(101).fill(ids[0]), agentId: 'agent-2' }, admin),
    /100/,
  );
  const result = applyCommand(
    data,
    'bulkAssign',
    { ids: [...ids, ids[0]], agentId: 'agent-2' },
    admin,
  );
  assert.equal(result.count, ids.length);
  assert.ok(
    data.leads
      .filter((lead) => ids.includes(lead.id))
      .every((lead) => lead.assignedAgentId === 'agent-2'),
  );
  assert.ok(
    data.tasks
      .filter(
        (task) => ids.includes(task.leadId) && !['COMPLETED', 'CANCELLED'].includes(task.status),
      )
      .every((task) => task.agentId === 'agent-2'),
  );
  assert.equal(
    data.activities.filter(
      (event) =>
        ids.includes(event.leadId) &&
        event.type === 'AGENT_ASSIGNED' &&
        event.message.startsWith('Reassigned'),
    ).length >= 2,
    true,
  );
});

test('follow-up filters distinguish overdue, due today, unscheduled and closed leads', () => {
  const now = new Date(2026, 9, 3, 12);
  const lead = { status: 'FOLLOW_UP', nextFollowUp: null };
  assert.equal(followUpState(lead, now), 'unscheduled');
  assert.equal(
    followUpState({ ...lead, nextFollowUp: new Date(2026, 9, 3, 10).toISOString() }, now),
    'overdue',
  );
  assert.equal(
    followUpState({ ...lead, nextFollowUp: new Date(2026, 9, 3, 15).toISOString() }, now),
    'today',
  );
  assert.equal(
    followUpState({ ...lead, nextFollowUp: new Date(2026, 9, 4, 15).toISOString() }, now),
    'upcoming',
  );
  assert.equal(followUpState({ ...lead, status: 'WON' }, now), '');
});

test('report filters scope related work and CSV escapes cells and formula injection', () => {
  const data = createSeed();
  const filtered = filterReport(data, { agent: 'agent-1' });
  assert.ok(filtered.leads.every((lead) => lead.assignedAgentId === 'agent-1'));
  assert.ok(
    filtered.viewings.every((viewing) => filtered.leads.some((lead) => lead.id === viewing.leadId)),
  );
  assert.equal(filterReport(data, { from: '2099-01-01' }).leads.length, 0);
  const csv = toCsv([
    ['Name', 'Value'],
    ['=HYPERLINK("url")', '+971501234567'],
    ['a,b\nc', 123],
  ]);
  assert.ok(csv.includes('"\'=HYPERLINK(""url"")"'));
  assert.ok(csv.includes('"\'+971501234567"'));
  assert.ok(csv.includes('"a,b\nc"'));
  assert.equal(leadExportRows(filtered.leads, data.agents).length, filtered.leads.length + 1);
});
