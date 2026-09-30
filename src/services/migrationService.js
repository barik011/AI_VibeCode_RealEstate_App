import { storage } from '../utils/storage.js';
import { crmService } from './crmService.js';
import { prepareLocalImport } from '../repositories/legacyMigration.js';
import { createSeed } from '../repositories/seed.js';
export const migrationService = {
  preview() {
    const snapshot = prepareLocalImport(
      storage.get('crm-v1', null),
      storage.get('inquiries', []),
      storage.get('newsletter', null),
      createSeed().properties,
    );
    if (!snapshot) return null;
    return {
      snapshot,
      counts: {
        leads: snapshot.leads.length,
        properties: snapshot.properties.length,
        agents: snapshot.agents.length,
        tasks: snapshot.tasks.length,
        viewings: snapshot.viewings.length,
        newsletter: snapshot.newsletter.length,
      },
    };
  },
  async import(overwriteExisting = false) {
    const local = this.preview();
    if (!local) throw new Error('No local CRM snapshot was found in this browser.');
    return crmService.importLocal({ ...local.snapshot, overwriteExisting });
  },
};
