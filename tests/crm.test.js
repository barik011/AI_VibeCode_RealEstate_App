import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/repositories/seed.js';
import { applyCommand } from '../src/services/crmService.js';
import { taskStatus } from '../src/features/crm/constants.js';
const admin = { id: 'profile-admin', role: 'ADMIN', name: 'Demo Admin' };
const agent = { id: 'profile-agent', role: 'AGENT', name: 'Sarah Ahmed', agentId: 'agent-1' };
const future = () => new Date(Date.now() + 3 * 86400000).toISOString();
const inquiry = {
  name: 'Workflow Visitor',
  email: 'workflow@example.com',
  phone: '+971501234567',
  country: 'UAE',
  propertyId: 1,
  message: 'Please arrange a private viewing.',
  budgetMax: 30000000,
};
test('public inquiry through assignment, communication, follow-up, viewing and won deal is consistent', () => {
  const data = createSeed();
  const lead = applyCommand(data, 'inquiry', inquiry, null);
  assert.equal(lead.status, 'NEW');
  assert.equal(data.leads.length, 41);
  assert.throws(
    () =>
      applyCommand(
        data,
        'createViewing',
        { leadId: lead.id, propertyId: 1, date: future(), meetingLocation: 'Lobby' },
        admin,
      ),
    /Assign an agent/,
  );
  applyCommand(data, 'assign', { id: lead.id, agentId: agent.agentId }, admin);
  assert.equal(lead.status, 'ASSIGNED');
  applyCommand(
    data,
    'communication',
    { id: lead.id, type: 'Call', content: 'Discussed budget and shortlist.' },
    agent,
  );
  assert.equal(lead.status, 'CONTACTED');
  applyCommand(data, 'note', { id: lead.id, content: 'Prefers a sea view.' }, agent);
  const task = applyCommand(
    data,
    'createTask',
    { leadId: lead.id, title: 'Follow up', dueDate: future(), isFollowUp: true },
    agent,
  );
  assert.equal(lead.status, 'FOLLOW_UP');
  assert.equal(lead.nextFollowUp, task.dueDate);
  applyCommand(data, 'updateTask', { id: task.id, status: 'COMPLETED' }, agent);
  assert.equal(lead.nextFollowUp, null);
  assert.equal(taskStatus(task), 'COMPLETED');
  data.viewings = [];
  const viewing = applyCommand(
    data,
    'createViewing',
    { leadId: lead.id, propertyId: 1, date: future(), meetingLocation: 'Main lobby' },
    agent,
  );
  assert.equal(lead.status, 'VIEWING_SCHEDULED');
  assert.throws(
    () =>
      applyCommand(
        data,
        'updateViewing',
        { id: viewing.id, action: 'complete', outcome: 'Interested', notes: 'Ready to negotiate.' },
        agent,
      ),
    /after its scheduled time/,
  );
  viewing.date = new Date(Date.now() - 60000).toISOString();
  applyCommand(
    data,
    'updateViewing',
    { id: viewing.id, action: 'complete', outcome: 'Interested', notes: 'Ready to negotiate.' },
    agent,
  );
  assert.equal(lead.status, 'NEGOTIATION');
  assert.equal(viewing.status, 'COMPLETED');
  assert.throws(
    () =>
      applyCommand(
        data,
        'won',
        { id: lead.id, propertyId: 1, value: 28000000, closingDate: new Date().toISOString() },
        agent,
      ),
    /Confirm/,
  );
  applyCommand(
    data,
    'won',
    {
      id: lead.id,
      confirmed: true,
      propertyId: 1,
      value: 28000000,
      closingDate: new Date().toISOString(),
    },
    agent,
  );
  assert.equal(lead.status, 'WON');
  assert.equal(lead.deal.value, 28000000);
  for (const type of [
    'LEAD_CREATED',
    'AGENT_ASSIGNED',
    'CALL_LOGGED',
    'NOTE_ADDED',
    'FOLLOW_UP_CREATED',
    'VIEWING_CREATED',
    'VIEWING_COMPLETED',
    'WON',
  ])
    assert.ok(
      data.activities.some((a) => a.leadId === lead.id && a.type === type),
      type,
    );
});
test('permissions, reassignment, lost reasons and reopening', () => {
  const data = createSeed();
  const lead = applyCommand(data, 'inquiry', inquiry, null);
  assert.throws(
    () => applyCommand(data, 'note', { id: lead.id, content: 'Private' }, agent),
    /not assigned/,
  );
  assert.throws(
    () => applyCommand(data, 'assign', { id: lead.id, agentId: agent.agentId }, agent),
    /not assigned|Administrator/,
  );
  applyCommand(data, 'assign', { id: lead.id, agentId: 'agent-1' }, admin);
  const task = applyCommand(
    data,
    'createTask',
    { leadId: lead.id, title: 'Outstanding', dueDate: future() },
    agent,
  );
  applyCommand(data, 'assign', { id: lead.id, agentId: 'agent-2' }, admin);
  assert.equal(task.agentId, 'agent-2');
  assert.throws(
    () => applyCommand(data, 'updateTask', { id: task.id, status: 'COMPLETED' }, agent),
    /not assigned/,
  );
  assert.throws(
    () => applyCommand(data, 'lost', { id: lead.id, reason: '' }, admin),
    /lost reason/,
  );
  applyCommand(
    data,
    'lost',
    { id: lead.id, reason: 'No Response', notes: 'Three attempts.' },
    admin,
  );
  assert.equal(task.status, 'CANCELLED');
  assert.equal(lead.lostReason, 'No Response');
  assert.throws(
    () =>
      applyCommand(
        data,
        'createTask',
        { leadId: lead.id, title: 'Closed', dueDate: future() },
        admin,
      ),
    /closed/,
  );
  applyCommand(data, 'status', { id: lead.id, status: 'FOLLOW_UP' }, admin);
  assert.equal(lead.status, 'FOLLOW_UP');
  assert.equal(lead.lostReason, undefined);
});
test('validation rejects invalid transitions, dates, property images and deal values', () => {
  const data = createSeed();
  const lead = data.leads.find((l) => l.status === 'ASSIGNED');
  assert.throws(
    () => applyCommand(data, 'status', { id: lead.id, status: 'WON' }, admin),
    /dedicated/,
  );
  assert.throws(
    () =>
      applyCommand(
        data,
        'createTask',
        { leadId: lead.id, title: 'Past', dueDate: '2000-01-01' },
        admin,
      ),
    /future/,
  );
  assert.throws(
    () =>
      applyCommand(
        data,
        'won',
        {
          id: lead.id,
          confirmed: true,
          propertyId: 1,
          value: 0,
          closingDate: new Date().toISOString(),
        },
        admin,
      ),
    /greater than zero/,
  );
  assert.throws(
    () =>
      applyCommand(
        data,
        'saveProperty',
        { ...data.properties[0], images: ['javascript:alert(1)'] },
        admin,
      ),
    /image URL/,
  );
  const completed = { status: 'COMPLETED', dueDate: '2000-01-01' };
  assert.equal(taskStatus(completed), 'COMPLETED');
});
test('not interested viewing remains follow-up until explicit lost choice', () => {
  const data = createSeed();
  const lead = data.leads.find((l) => l.status === 'ASSIGNED');
  data.viewings = [];
  const v = applyCommand(
    data,
    'createViewing',
    { leadId: lead.id, propertyId: lead.propertyId, date: future(), meetingLocation: 'Lobby' },
    admin,
  );
  v.date = new Date(Date.now() - 1000).toISOString();
  applyCommand(
    data,
    'updateViewing',
    {
      id: v.id,
      action: 'complete',
      outcome: 'Not Interested',
      notes: 'Try a different community.',
    },
    admin,
  );
  assert.equal(lead.status, 'FOLLOW_UP');
  assert.equal(lead.lostReason, undefined);
});
