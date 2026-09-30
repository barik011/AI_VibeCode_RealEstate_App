import { requireSupabase, backendError } from './client.js';
let current = null;
let authSubscription;
let sequence = 0;
const listeners = new Set();
async function profileFor(session) {
  if (!session?.user) return null;
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id,name,role,agent_id')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) throw backendError(error);
  return data
    ? {
        id: data.id,
        name: data.name,
        email: session.user.email,
        role: data.role,
        agentId: data.agent_id,
      }
    : null;
}
async function loadSession(session) {
  const ticket = ++sequence;
  const user = await profileFor(session);
  if (ticket === sequence) {
    current = user;
    listeners.forEach((listener) => listener(current));
  }
  return user;
}
export const supabaseAuth = {
  getSession: () => current,
  async initialize() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw backendError(error);
    await loadSession(data.session);
    if (!authSubscription)
      authSubscription = client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return;
        // Never await a Supabase call inside the auth callback (client lock).
        setTimeout(
          () =>
            loadSession(session).catch(() => {
              current = null;
              listeners.forEach((listener) => listener(null));
            }),
          0,
        );
      }).data.subscription;
    return current;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async signIn({ email, password }) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw backendError(error);
    const user = await loadSession(data.session);
    if (!user) {
      await this.signOut();
      throw new Error('This account has no CRM profile. Ask your administrator to grant access.');
    }
    return user;
  },
  async signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw backendError(error);
    current = null;
    ++sequence;
    listeners.forEach((listener) => listener(null));
  },
  async requestPasswordReset(email) {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw backendError(error);
    return 'If this email has an account, a password reset link will be sent. Check your inbox.';
  },
  async updatePassword(password) {
    const { error } = await requireSupabase().auth.updateUser({ password });
    if (error) throw backendError(error);
  },
};
