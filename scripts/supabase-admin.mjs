import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
if(existsSync('.env.supabase.local')) process.loadEnvFile('.env.supabase.local');
export const projectRef=process.env.SUPABASE_PROJECT_REF || 'oflrgmjcdnavzegqwtuq';
export const url=process.env.SUPABASE_URL;
if(!url || new URL(url).hostname!==`${projectRef}.supabase.co`) throw new Error('Supabase URL and project reference do not match.');
export const admin = process.env.SUPABASE_SECRET_KEY ? createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}) : null;
export async function sql(query) {
  if(!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('Add SUPABASE_ACCESS_TOKEN (a personal access token) to .env.supabase.local to apply database migrations.');
  const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
  const body=await response.json();
  if(!response.ok) throw new Error(`Database query failed (${response.status}): ${body.message || body.error || 'See Supabase project status.'}`);
  return body;
}
