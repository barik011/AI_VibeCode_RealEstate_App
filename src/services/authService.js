import { storage } from '../utils/storage.js';
import { isSupabase } from './supabase/client.js';
import { supabaseAuth } from './supabase/auth.js';
import { mockDatabase } from '../repositories/mockDatabase.js';
const accounts = [
  {
    id: 'profile-admin',
    name: 'Alex Morgan',
    email: 'admin@dubaihouse.demo',
    role: 'ADMIN',
    agentId: null,
  },
  {
    id: 'profile-agent',
    name: 'Sarah Ahmed',
    email: 'agent@dubaihouse.demo',
    role: 'AGENT',
    agentId: 'agent-1',
  },
];
const sessionKey = 'dubai-bayt:session';
const mockAuthService = {
  hasAgentAccount: (agentId) => accounts.some((account) => account.agentId === agentId),
  getSession() {
    let session = storage.get('session', null);
    try {
      session ||= JSON.parse(sessionStorage.getItem(sessionKey));
    } catch {
      /* No browser session available. */
    }
    const account = accounts.find((entry) => entry.id === session?.id);
    if (
      account?.role === 'AGENT' &&
      !mockDatabase
        .read()
        .agents.some((agent) => agent.id === account.agentId && agent.status === 'ACTIVE')
    )
      return null;
    return account || null;
  },
  async signIn({ email, password, remember = false }) {
    const user = accounts.find((account) => account.email === email.trim().toLowerCase());
    if (!user || password !== 'Demo123!')
      throw new Error('Use a demo email and the password Demo123!.');
    if (
      user.role === 'AGENT' &&
      !mockDatabase
        .read()
        .agents.some((agent) => agent.id === user.agentId && agent.status === 'ACTIVE')
    )
      throw new Error('This agent account is inactive. Contact your administrator.');
    this.signOut();
    if (remember) {
      if (!storage.set('session', { id: user.id }))
        throw new Error('Unable to remember your session. Enable browser storage.');
    } else {
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify({ id: user.id }));
      } catch {
        throw new Error('Session storage is unavailable.');
      }
    }
    return user;
  },
  signOut() {
    storage.set('session', null);
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* Already signed out. */
    }
  },
  async requestPasswordReset() {
    return 'Demo accounts use Demo123!. No reset email is sent in this frontend demo.';
  },
};
export const authService = isSupabase ? supabaseAuth : mockAuthService;
