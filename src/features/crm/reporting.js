import { dateKey, TERMINAL } from './constants.js';

export function followUpState(lead, now = new Date()) {
  if (TERMINAL.includes(lead.status)) return '';
  if (!lead.nextFollowUp) return 'unscheduled';
  if (new Date(lead.nextFollowUp) < now) return 'overdue';
  return dateKey(lead.nextFollowUp) === dateKey(now) ? 'today' : 'upcoming';
}

export function filterReport(data, { from = '', to = '', agent = '' }) {
  const leads = data.leads.filter(
    (lead) =>
      (!from || dateKey(lead.createdAt) >= from) &&
      (!to || dateKey(lead.createdAt) <= to) &&
      (!agent ||
        lead.assignedAgentId === agent ||
        (agent === 'unassigned' && !lead.assignedAgentId)),
  );
  const ids = new Set(leads.map((lead) => lead.id));
  return {
    ...data,
    leads,
    agents: agent ? data.agents.filter((row) => row.id === agent) : data.agents,
    tasks: data.tasks.filter((task) => ids.has(task.leadId)),
    viewings: data.viewings.filter((viewing) => ids.has(viewing.leadId)),
  };
}

export function toCsv(rows) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = String(cell ?? '');
            // Quote delimiters and neutralize spreadsheet formulas in user-supplied text.
            if (typeof cell !== 'number' && /^(?:\s*[=+@-]|[\t\r\n])/.test(value))
              value = `'${value}`;
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(','),
      )
      .join('\r\n')
  );
}

export function leadExportRows(leads, agents) {
  return [
    [
      'Lead ID',
      'Customer',
      'Email',
      'Phone',
      'Agent',
      'Status',
      'Priority',
      'Source',
      'Created',
      'Next follow-up',
      'Maximum budget (AED)',
      'Won value (AED)',
    ],
    ...leads.map((lead) => [
      lead.id,
      lead.customer.name,
      lead.customer.email,
      lead.customer.phone,
      agents.find((agent) => agent.id === lead.assignedAgentId)?.name || 'Unassigned',
      lead.status,
      lead.priority,
      lead.source,
      lead.createdAt,
      lead.nextFollowUp,
      lead.budget.max || 0,
      lead.deal?.value || 0,
    ]),
  ];
}

export function downloadCsv(name, rows) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
