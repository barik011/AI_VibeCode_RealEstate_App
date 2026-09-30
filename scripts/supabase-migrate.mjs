import { readdirSync,readFileSync } from 'node:fs';
import { sql,projectRef } from './supabase-admin.mjs';
const versions=await sql("select tablename from pg_tables where schemaname='public'");
console.log(`Checking migrations for ${projectRef}; ${versions.length} public tables found.`);
await sql('create schema if not exists app_private; create table if not exists app_private.schema_migrations(version text primary key, applied_at timestamptz not null default now());');
const applied=new Set((await sql('select version from app_private.schema_migrations')).map((r) => r.version));
for(const file of readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort()) {
  if(applied.has(file)) {console.log(`Already applied: ${file}`);continue;}
  const contents=readFileSync(`supabase/migrations/${file}`,'utf8').replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'');
  await sql(`begin;\n${contents}\ninsert into app_private.schema_migrations(version) values ('${file.replaceAll("'","''")}');\ncommit;`);
  console.log(`Applied: ${file}`);
}
