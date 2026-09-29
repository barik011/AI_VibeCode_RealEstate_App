import properties from '../data/properties.json' with { type: 'json' };
import agents from '../data/agents.json' with { type: 'json' };
import leads from '../data/leads.json' with { type: 'json' };
import tasks from '../data/tasks.json' with { type: 'json' };
import viewings from '../data/viewings.json' with { type: 'json' };
import activities from '../data/activities.json' with { type: 'json' };
export function createSeed(now = new Date()) {
  const at = (offset, hour = 11) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const data = structuredClone({ properties, agents, leads, tasks, viewings, activities });
  data.properties.forEach((p) => {
    p.status = 'ACTIVE';
  });
  data.leads.forEach((l) => {
    l.createdAt = at(l.createdOffset);
    l.updatedAt = at(l.updatedOffset);
    l.assignedAt = l.assignedAgentId ? at(l.assignedOffset) : null;
    if (l.deal) l.deal.closingDate = at(l.deal.closingOffset);
  });
  data.tasks.forEach((t) => {
    t.dueDate = at(t.dueOffset, 15);
  });
  data.viewings.forEach((v) => {
    v.date = at(v.dateOffset, 16);
  });
  data.activities.forEach((a) => {
    a.createdAt = at(a.offset);
  });
  data.leads.forEach((l) => {
    l.nextFollowUp =
      data.tasks
        .filter((t) => t.leadId === l.id && t.status !== 'COMPLETED')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate || null;
  });
  return {
    ...data,
    notes: [],
    notifications: [],
    settings: {
      company: 'Dubai House',
      email: 'hello@dubaihouse.demo',
      phone: '+971 4 555 0100',
      defaultView: 'table',
    },
    version: 1,
  };
}
