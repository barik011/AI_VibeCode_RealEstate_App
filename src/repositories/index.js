import { crmService } from '../services/crmService.js';
import { authService } from '../services/authService.js';
import { canAccessLead, canAccessWork, isAdmin } from '../features/crm/constants.js';
const repository = (collection, scope = () => true) => ({
  async getAll() {
    const data = await crmService.getSnapshot();
    const user = authService.getSession();
    return data[collection].filter((row) => scope(user, row));
  },
  async getById(id) {
    return (await this.getAll()).find((row) => String(row.id) === String(id));
  },
});
export const leadRepository = {
  ...repository('leads', canAccessLead),
  create: (data) => crmService.execute('createLead', data),
  createInquiry: (data) => crmService.execute('inquiry', data),
  assign: (id, agentId) => crmService.execute('assign', { id, agentId }),
  updateStatus: (id, status) => crmService.execute('status', { id, status }),
  addNote: (id, content) => crmService.execute('note', { id, content }),
};
export const propertyRepository = {
  ...repository('properties', (user, p) => isAdmin(user) || p.status === 'ACTIVE'),
  save: (data) => crmService.execute('saveProperty', data),
};
export const agentRepository = {
  ...repository('agents', (user, a) => isAdmin(user) || user?.agentId === a.id),
  save: (data) => crmService.execute('saveAgent', data),
};
export const taskRepository = {
  ...repository('tasks', canAccessWork),
  create: (data) => crmService.execute('createTask', data),
  update: (id, data) => crmService.execute('updateTask', { ...data, id }),
};
export const viewingRepository = {
  ...repository('viewings', canAccessWork),
  create: (data) => crmService.execute('createViewing', data),
  update: (id, data) => crmService.execute('updateViewing', { ...data, id }),
};
