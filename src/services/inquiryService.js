import { leadRepository } from '../repositories/index.js';
import { storage } from '../utils/storage.js';
import { isSupabase } from './supabase/client.js';
export const inquiryService = {
  async submit(data, property) {
    const lead = await leadRepository.createInquiry({ ...data, propertyId: property?.id });
    if(isSupabase) return lead;
    // Preserve the original public-demo inquiry archive for compatibility.
    const previous = storage.get('inquiries', []);
    storage.set('inquiries', [
      ...(Array.isArray(previous) ? previous : []),
      { ...data, property: property?.slug || null, leadId: lead.id, createdAt: lead.createdAt },
    ]);
    return lead;
  },
};
