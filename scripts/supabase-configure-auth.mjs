import { projectRef } from './supabase-admin.mjs';

if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('Set SUPABASE_ACCESS_TOKEN.');
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = {
  Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};
const read = await fetch(endpoint, { headers });
if (!read.ok) throw new Error(`Could not read Auth configuration (${read.status}).`);
const current = await read.json();
const redirect = new URL(
  process.env.SUPABASE_AUTH_REDIRECT || 'http://localhost:5173/reset-password',
);
const allow = new Set((current.uri_allow_list || '').split(',').filter(Boolean));
allow.add(redirect.href);
const settings = { uri_allow_list: [...allow].join(','), disable_signup: true };
if (process.env.SUPABASE_SITE_URL)
  settings.site_url = new URL(process.env.SUPABASE_SITE_URL).origin;
else if (!current.site_url || current.site_url === 'http://localhost:3000')
  settings.site_url = redirect.origin;
const result = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify(settings) });
if (!result.ok) throw new Error(`Could not update Auth configuration (${result.status}).`);
console.log(`Password setup redirect configured: ${redirect.href}; public signup disabled.`);
console.log(`Site URL: ${settings.site_url || current.site_url}`);
