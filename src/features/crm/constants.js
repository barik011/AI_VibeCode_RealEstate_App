export const STAGES = [
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'QUALIFIED',
  'FOLLOW_UP',
  'VIEWING_SCHEDULED',
  'VIEWING_COMPLETED',
  'NEGOTIATION',
  'WON',
  'LOST',
];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const SOURCES = [
  'Website Inquiry',
  'Property Detail',
  'Contact Form',
  'WhatsApp',
  'Phone',
  'Referral',
  'Walk-In',
  'Social Media',
  'Other',
];
export const LOST_REASONS = [
  'Budget Issue',
  'Property Not Suitable',
  'Bought Elsewhere',
  'No Response',
  'Financing Issue',
  'Changed Plans',
  'Other',
];
export const VIEWING_OUTCOMES = [
  'Interested',
  'Very Interested',
  'Need Follow-Up',
  'Not Interested',
  'Second Viewing Required',
];
export const CONTACT_TYPES = ['Call', 'Email', 'WhatsApp', 'Meeting'];
export const TERMINAL = ['WON', 'LOST'];
export const label = (value = '') =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const money = (value = 0) =>
  new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(value);
export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
export const dateKey = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const taskStatus = (task) =>
  ['COMPLETED', 'CANCELLED'].includes(task.status)
    ? task.status
    : new Date(task.dueDate) < new Date()
      ? 'OVERDUE'
      : task.status;
export const homeFor = (user) => (user?.role === 'ADMIN' ? '/admin/dashboard' : '/agent/dashboard');
export const isAdmin = (user) => user?.role === 'ADMIN';
export const canAccessLead = (user, lead) =>
  Boolean(user && lead && (isAdmin(user) || lead.assignedAgentId === user.agentId));
export const canAccessWork = (user, record) =>
  Boolean(user && (isAdmin(user) || record.agentId === user.agentId));
