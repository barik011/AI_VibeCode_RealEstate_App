import { writeFileSync } from 'node:fs';
import { admin } from './supabase-admin.mjs';

const [email, name = 'Administrator'] = process.argv.slice(2);
if (!admin || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Usage: node scripts/supabase-provision-admin.mjs EMAIL [NAME]');
}
let existing;
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(error.message);
  existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing || data.users.length < 1000) break;
}
// generateLink creates the account/link without sending an email.
const { data, error } = await admin.auth.admin.generateLink({
  type: existing?.email_confirmed_at ? 'recovery' : 'invite',
  email,
  options: {
    redirectTo: process.env.SUPABASE_AUTH_REDIRECT || 'http://localhost:5173/reset-password',
    data: { name },
  },
});
if (error) throw new Error(error.message);
const profile = await admin
  .from('profiles')
  .upsert({ id: data.user.id, name, role: 'ADMIN', agent_id: null }, { onConflict: 'id' });
if (profile.error)
  throw new Error(`Account created but CRM profile failed: ${profile.error.message}`);
// .env files are excluded from Git, Vite's file server and the browser bundle.
writeFileSync(
  '.env.admin-setup.local',
  `ADMIN_EMAIL=${email}\nPASSWORD_SETUP_URL=${data.properties.action_link}\n`,
);
console.log(
  `Administrator provisioned for ${email}. Password setup link saved in .env.admin-setup.local. No email sent.`,
);
