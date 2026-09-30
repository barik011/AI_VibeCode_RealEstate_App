import { createSlice, createSelector } from '@reduxjs/toolkit';
import { authService } from '../../services/authService.js';
import { crmService } from '../../services/crmService.js';
import { storage } from '../../utils/storage.js';
import { canAccessLead, canAccessWork, isAdmin, taskStatus, dateKey } from './constants.js';
const empty = {
  leads: [],
  properties: [],
  agents: [],
  tasks: [],
  viewings: [],
  notes: [],
  activities: [],
  notifications: [],
  settings: {},
};
export const authSlice = createSlice({
  name: 'auth',
  initialState: { user: authService.getSession(), loading: true, error: null },
  reducers: {
    sessionChanged: (state, { payload }) => {
      state.user = payload;
      state.loading = false;
      state.error = null;
    },
    authFailed: (state, { payload }) => {
      state.user = null;
      state.loading = false;
      state.error = payload;
    },
  },
});
export const crmSlice = createSlice({
  name: 'crm',
  initialState: { ...empty, loading: true, error: null },
  reducers: {
    snapshotReceived: (state, { payload }) => ({ ...payload, loading: false, error: null }),
    sessionReset: () => ({ ...empty, loading: true, error: null }),
    loadFailed: (state, { payload }) => {
      state.loading = false;
      state.error = payload;
    },
  },
});
export const uiSlice = createSlice({
  name: 'crmUi',
  initialState: { collapsed: storage.get('crm-sidebar', false) },
  reducers: {
    sidebarToggled: (state) => {
      state.collapsed = !state.collapsed;
    },
  },
});
export const { sessionChanged } = authSlice.actions;
export const { sidebarToggled } = uiSlice.actions;
export async function initializeCRM(store) {
  crmService.subscribe((snapshot) => store.dispatch(crmSlice.actions.snapshotReceived(snapshot)));
  let sessionRevision = 0;
  const refreshForUser = async (user) => {
    const ticket = ++sessionRevision;
    store.dispatch(sessionChanged(user));
    store.dispatch(crmSlice.actions.sessionReset());
    try {
      const snapshot = await crmService.getSnapshot();
      if (ticket === sessionRevision) store.dispatch(crmSlice.actions.snapshotReceived(snapshot));
    } catch (error) {
      if (ticket === sessionRevision) store.dispatch(crmSlice.actions.loadFailed(error.message));
    }
  };
  authService.subscribe?.(refreshForUser);
  try {
    await authService.initialize?.();
    await refreshForUser(authService.getSession());
  } catch (error) {
    store.dispatch(authSlice.actions.authFailed(error.message));
    store.dispatch(crmSlice.actions.loadFailed(error.message));
  }
  let previous;
  store.subscribe(() => {
    const collapsed = store.getState().crmUi.collapsed;
    if (collapsed !== previous) {
      previous = collapsed;
      storage.set('crm-sidebar', collapsed);
    }
  });
}
export const selectUser = (state) => state.auth.user;
export const selectCRM = (state) => state.crm;
export const selectWorkspace = createSelector([selectCRM, selectUser], (data, user) => {
  const leads = data.leads.filter((lead) => canAccessLead(user, lead));
  const ids = new Set(leads.map((lead) => lead.id));
  return {
    ...data,
    leads,
    tasks: data.tasks.filter((t) => ids.has(t.leadId) && canAccessWork(user, t)),
    viewings: data.viewings.filter((v) => ids.has(v.leadId) && canAccessWork(user, v)),
    agents: data.agents.filter((a) => isAdmin(user) || a.id === user?.agentId),
    notes: data.notes.filter((n) => ids.has(n.leadId)),
    activities: data.activities.filter((a) => ids.has(a.leadId)),
    notifications: data.notifications.filter(
      (n) => isAdmin(user) || (n.agentId === user?.agentId && ids.has(n.leadId)),
    ),
  };
});
export const selectAssignedLeads = (state) => selectWorkspace(state).leads;
export const selectNewLeads = createSelector([selectAssignedLeads], (leads) =>
  leads.filter((l) => l.status === 'NEW'),
);
export const selectLeadById = (state, id) => selectWorkspace(state).leads.find((l) => l.id === id);
export const selectUpcomingViewings = createSelector([selectWorkspace], (data) =>
  data.viewings
    .filter((v) => v.status === 'SCHEDULED')
    .sort((a, b) => a.date.localeCompare(b.date)),
);
export const selectOverdueTasks = (state) =>
  selectWorkspace(state).tasks.filter((t) => taskStatus(t) === 'OVERDUE');
export const selectDueAlerts = (data, user) =>
  data.tasks
    .filter(
      (t) =>
        taskStatus(t) === 'OVERDUE' ||
        (dateKey(t.dueDate) === dateKey() && !['COMPLETED', 'CANCELLED'].includes(t.status)),
    )
    .map((t) => ({
      id: `due-${t.id}-${t.dueDate}`,
      leadId: t.leadId,
      agentId: t.agentId,
      message: `${taskStatus(t) === 'OVERDUE' ? 'Overdue' : 'Due today'}: ${t.title}`,
      createdAt: t.dueDate,
      readBy: data.notifications.find((n) => n.id === `due-${t.id}-${t.dueDate}`)?.readBy || [],
    }))
    .filter((n) => !n.readBy.includes(user.id));
