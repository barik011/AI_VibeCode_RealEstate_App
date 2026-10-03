import { requireSupabase, backendError } from './client.js';
import { supabaseAuth } from './auth.js';
import { fromRow, propertyFromRow, leadFromRow, emptySnapshot } from './mappers.js';
const listeners = new Set();
const statusListeners = new Set();
let syncStatus = { refreshing: false, error: '', lastSyncedAt: null, live: true };
let committedRefreshWarning = '';
const setSyncStatus = (update) => {
  syncStatus = { ...syncStatus, ...update };
  statusListeners.forEach((listener) => listener(syncStatus));
};
let channel;
let timer;
let pollTimer;
let retryRefresh;
let revision = 0;
async function rows(table) {
  if (['agent_events', 'property_events'].includes(table)) {
    const { data, error } = await requireSupabase()
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
      .limit(100);
    if (error) throw backendError(error);
    return data;
  }
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await requireSupabase()
      .from(table)
      .select('*')
      .order('id')
      .range(offset, offset + 999);
    if (error) throw backendError(error);
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
export const supabaseCRM = {
  getSyncStatus: () => syncStatus,
  subscribeStatus(listener) {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
  async getSnapshot() {
    const snapshot = emptySnapshot();
    const user = supabaseAuth.getSession();
    snapshot.properties = (await rows('properties')).map(propertyFromRow);
    if (!user) return snapshot;
    const names = [
      'agents',
      'agent_events',
      'property_events',
      'leads',
      'tasks',
      'viewings',
      'lead_activities',
      'lead_notes',
      'notifications',
      'crm_settings',
    ];
    const results = await Promise.all(names.map(rows));
    if (supabaseAuth.getSession()?.id !== user.id) return this.getSnapshot();
    names.forEach((name, i) => {
      if (name === 'crm_settings') snapshot.settings = results[i][0] ? fromRow(results[i][0]) : {};
      else {
        const key =
          {
            lead_activities: 'activities',
            lead_notes: 'notes',
            agent_events: 'agentEvents',
            property_events: 'propertyEvents',
          }[name] || name;
        snapshot[key] = results[i].map(name === 'leads' ? leadFromRow : fromRow);
      }
    });
    return snapshot;
  },
  async refresh() {
    const ticket = ++revision;
    setSyncStatus({ refreshing: true });
    try {
      const data = await this.getSnapshot();
      if (ticket === revision) {
        listeners.forEach((listener) => listener(data));
        committedRefreshWarning = '';
        setSyncStatus({ refreshing: false, error: '', lastSyncedAt: new Date().toISOString() });
      }
      return data;
    } catch (error) {
      if (ticket === revision)
        setSyncStatus({
          refreshing: false,
          error:
            committedRefreshWarning ||
            `Workspace refresh failed. Displayed records may be out of date. ${error.message}`,
        });
      throw error;
    }
  },
  async execute(command, payload = {}) {
    payload = { ...payload };
    for (const key of ['dueDate', 'date', 'closingDate'])
      if (payload[key]) payload[key] = new Date(payload[key]).toISOString();
    const { data, error } = await requireSupabase().rpc(
      command === 'inquiry' ? 'submit_inquiry' : 'crm_command',
      command === 'inquiry' ? { payload } : { command, payload },
    );
    if (error) throw backendError(error);
    // The mutation is already committed. A failed refresh must not invite a
    // duplicate submission; realtime/navigation can retry the read separately.
    try {
      if (command === 'saveAgent') await supabaseAuth.initialize();
      const snapshot = await this.refresh();
      return snapshot.leads.find((l) => l.id === data?.id) || data;
    } catch (error) {
      committedRefreshWarning = `Your change was saved, but the workspace could not refresh. Do not submit it again. ${error.message}`;
      setSyncStatus({
        error: committedRefreshWarning,
      });
      return data;
    }
  },
  subscribe(listener) {
    listeners.add(listener);
    if (!channel) {
      channel = requireSupabase().channel('crm-updates');
      for (const table of [
        'properties',
        'leads',
        'agents',
        'agent_events',
        'property_events',
        'tasks',
        'viewings',
        'lead_activities',
        'lead_notes',
        'notifications',
        'crm_settings',
      ])
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => this.refresh().catch(() => {}), 150);
        });
      channel.subscribe((status) => {
        setSyncStatus({ live: status === 'SUBSCRIBED' });
      });
      retryRefresh = () => {
        if (
          !syncStatus.refreshing &&
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        )
          this.refresh().catch(() => {});
      };
      pollTimer = setInterval(retryRefresh, 60000);
      globalThis.addEventListener?.('online', retryRefresh);
      globalThis.addEventListener?.('focus', retryRefresh);
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size && channel) {
        requireSupabase().removeChannel(channel);
        channel = null;
        clearTimeout(timer);
        clearInterval(pollTimer);
        globalThis.removeEventListener?.('online', retryRefresh);
        globalThis.removeEventListener?.('focus', retryRefresh);
      }
    };
  },
  async reset() {
    throw new Error('Reset Demo Data is disabled for the connected database.');
  },
  async importLocal(snapshot) {
    const { data, error } = await requireSupabase().rpc('import_crm_data', { payload: snapshot });
    if (error) throw backendError(error);
    try {
      await this.refresh();
    } catch (error) {
      committedRefreshWarning = `Import completed, but the workspace could not refresh. Do not import again. ${error.message}`;
      setSyncStatus({
        error: committedRefreshWarning,
      });
    }
    return data;
  },
};
