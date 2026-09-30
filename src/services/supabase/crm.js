import { requireSupabase, backendError } from './client.js';
import { supabaseAuth } from './auth.js';
import { fromRow, propertyFromRow, leadFromRow, emptySnapshot } from './mappers.js';
const listeners = new Set();
let channel;
let timer;
let revision = 0;
async function rows(table) {
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
  async getSnapshot() {
    const snapshot = emptySnapshot();
    const user = supabaseAuth.getSession();
    snapshot.properties = (await rows('properties')).map(propertyFromRow);
    if (!user) return snapshot;
    const names = [
      'agents',
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
        const key = { lead_activities: 'activities', lead_notes: 'notes' }[name] || name;
        snapshot[key] = results[i].map(name === 'leads' ? leadFromRow : fromRow);
      }
    });
    return snapshot;
  },
  async refresh() {
    const ticket = ++revision;
    const data = await this.getSnapshot();
    if (ticket === revision) listeners.forEach((listener) => listener(data));
    return data;
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
    if (command === 'saveAgent') await supabaseAuth.initialize();
    try {
      const snapshot = await this.refresh();
      return snapshot.leads.find((l) => l.id === data?.id) || data;
    } catch {
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
      channel.subscribe();
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size && channel) {
        requireSupabase().removeChannel(channel);
        channel = null;
        clearTimeout(timer);
      }
    };
  },
  async reset() {
    throw new Error('Reset Demo Data is disabled for the connected database.');
  },
  async importLocal(snapshot) {
    const { data, error } = await requireSupabase().rpc('import_crm_data', { payload: snapshot });
    if (error) throw backendError(error);
    await this.refresh();
    return data;
  },
};
