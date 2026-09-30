import { readFileSync } from 'node:fs';
import { createSeed } from '../src/repositories/seed.js';
import { admin } from './supabase-admin.mjs';
if(!admin) throw new Error('Set SUPABASE_SECRET_KEY in .env.supabase.local.');
const {data,error}=await admin.rpc('import_crm_data',{payload:createSeed()});
if(error) throw new Error(error.message);
console.log('CRM records available:',data);
for(const [kind,file] of Object.entries({locations:'locations',categories:'categories',articles:'blog',testimonials:'testimonials',site:'site'})) {
  const content=JSON.parse(readFileSync(`src/data/${file}.json`,'utf8'));
  const {error}=await admin.from('public_content').upsert({kind,data:content},{onConflict:'kind',ignoreDuplicates:true});
  if(error) throw new Error(error.message);
  console.log(`Seeded public content: ${kind}`);
}
