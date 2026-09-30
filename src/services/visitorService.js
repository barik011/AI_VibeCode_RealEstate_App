import { storage } from '../utils/storage.js';
import { isSupabase, requireSupabase, backendError } from './supabase/client.js';
function visitorToken() {
  let token = storage.get('visitor-token', null);
  if (!/^[a-f0-9]{64}$/.test(token || '')) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, '0'),
    ).join('');
    if (!storage.set('visitor-token', token))
      throw new Error('Enable browser storage to save your favorites.');
  }
  return token;
}
export const visitorService = {
  async favorites(propertyId = null) {
    const legacy = storage.get('favorites', []);
    if (!isSupabase) return Array.isArray(legacy) ? legacy : [];
    const { data, error } = await requireSupabase().rpc('visitor_favorites', {
      visitor_token: visitorToken(),
      property_id: propertyId,
      initial_ids: Array.isArray(legacy) ? legacy.filter(Number.isInteger) : [],
    });
    if (error) throw backendError(error);
    return data;
  },
  async subscribe(email) {
    if (!isSupabase) {
      if (!storage.set('newsletter', email)) throw new Error('Browser storage is unavailable.');
      return;
    }
    const { error } = await requireSupabase().rpc('subscribe_newsletter', { email_address: email });
    if (error) throw backendError(error);
  },
};
