import { TERMINAL } from './constants.js';

export function agentImpact(data, agentId) {
  const leads = data.leads.filter((lead) => lead.assignedAgentId === agentId);
  const tasks = data.tasks.filter((task) => task.agentId === agentId);
  const viewings = data.viewings.filter((viewing) => viewing.agentId === agentId);
  const notifications = data.notifications.filter((notice) => notice.agentId === agentId);
  return {
    linked: leads.length + tasks.length + viewings.length + notifications.length,
    leads: leads.length,
    openLeads: leads.filter((lead) => !TERMINAL.includes(lead.status)).length,
    openTasks: tasks.filter((task) => !['COMPLETED', 'CANCELLED'].includes(task.status)).length,
    scheduledViewings: viewings.filter((viewing) => viewing.status === 'SCHEDULED').length,
  };
}

export function validateAgent(payload, existing, admin) {
  const text = (value, name, max = 200) => {
    const result = String(value ?? '').trim();
    if (!result) throw new Error(`${name} is required.`);
    if (result.length > max) throw new Error(`${name} must be ${max} characters or fewer.`);
    return result;
  };
  const list = (value, name) => {
    const items = [
      ...new Set(
        text(Array.isArray(value) ? value.join(',') : value, name, 1000)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    if (!items.length) throw new Error(`${name} is required.`);
    return items;
  };
  const email = text(existing?.email ?? payload.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  const phone = text(payload.phone, 'Phone', 20);
  if (!/^[+0-9\s()-]{7,20}$/.test(phone)) throw new Error('Enter a valid phone number.');
  const status = admin ? (payload.status ?? existing?.status ?? 'ACTIVE') : existing.status;
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('Choose a valid agent status.');
  return {
    name: text(payload.name, 'Name'),
    email,
    phone,
    specialization: text(payload.specialization, 'Specialization'),
    languages: list(payload.languages, 'Languages'),
    locations: list(payload.locations ?? existing?.locations, 'Locations'),
    status,
  };
}
