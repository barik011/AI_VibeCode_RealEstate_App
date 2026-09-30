import { admin } from './supabase-admin.mjs';
const [email,role='ADMIN',name='Administrator',agentId]=process.argv.slice(2);
if(!admin || !email || !['ADMIN','AGENT'].includes(role) || (role==='AGENT' && !agentId)) throw new Error('Usage: node scripts/supabase-invite.mjs EMAIL ADMIN|AGENT NAME [AGENT_ID]');
const redirectTo=process.env.SUPABASE_AUTH_REDIRECT || 'http://localhost:5173/reset-password';
const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{name}});
if(error) throw new Error(error.message);
const result=await admin.from('profiles').insert({id:data.user.id,name,role,agent_id:agentId || null});
if(result.error) throw new Error(`Invitation sent but profile could not be created: ${result.error.message}. Provision the invited user's profile before sign-in.`);
console.log(`Invitation sent and ${role} profile created for ${email}.`);
