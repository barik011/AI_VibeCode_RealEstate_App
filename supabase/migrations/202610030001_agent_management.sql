begin;

-- Keep team history after an unused agent is deleted. Only administrators read it.
create table public.agent_events (
  id text primary key default ('AE-' || gen_random_uuid()::text),
  agent_id text not null,
  type text not null check (type in ('CREATED','UPDATED','DELETED')),
  message text not null,
  author text not null,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
create index agent_events_created on public.agent_events(created_at desc);
alter table public.agent_events enable row level security;
create policy agent_events_read on public.agent_events for select to authenticated
  using ((select app_private.is_admin()));
revoke all on public.agent_events from public, anon, authenticated;
grant select on public.agent_events to authenticated;
grant all on public.agent_events to service_role;
create unique index agents_email_case_insensitive on public.agents(lower(btrim(email)));

-- Deactivation revokes data access even while an existing auth session is valid.
create or replace function app_private.agent_id() returns text
language sql stable security definer set search_path = '' as $$
  select p.agent_id from public.profiles p join public.agents a on a.id=p.agent_id
  where p.id=auth.uid() and p.role='AGENT' and a.status='ACTIVE';
$$;
create or replace function app_private.has_profile() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.is_admin() or app_private.agent_id() is not null;
$$;

-- Retain the tested lead workflows behind a private, non-callable implementation.
alter function public.crm_command(text,jsonb) set schema app_private;
alter function app_private.crm_command(text,jsonb) rename to crm_command_base;
revoke all on function app_private.crm_command_base(text,jsonb) from public, anon, authenticated;

create function public.crm_command(command text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles;
  target public.agents;
  agent_key text;
  next_name text;
  next_email text;
  next_phone text;
  next_specialization text;
  next_languages text[];
  next_locations text[];
  next_status text;
  lead_key text;
  batch_count integer := 0;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
  if actor.role='AGENT' then
    perform 1 from public.agents where id=actor.agent_id and status='ACTIVE' for share;
    if not found then
      raise exception 'Your agent account is inactive. Contact your administrator.' using errcode='42501';
    end if;
  end if;

  if command in ('createAgent','deleteAgent','bulkAssign','assign') and actor.role<>'ADMIN' then
    raise exception 'Administrator access is required.' using errcode='42501';
  end if;

  if command in ('assign','bulkAssign') then
    -- All assignment entry points lock the agent before leads, serializing deactivation.
    select * into target from public.agents where id=payload->>'agentId' for update;
    if target.id is null or target.status<>'ACTIVE' then raise exception 'Select an active agent.'; end if;
    if command='bulkAssign' then
      if jsonb_typeof(payload->'ids') is distinct from 'array' then raise exception 'Select between 1 and 100 leads.'; end if;
      if jsonb_array_length(payload->'ids') not between 1 and 100 then raise exception 'Select between 1 and 100 leads.'; end if;
      for lead_key in select distinct value from jsonb_array_elements_text(payload->'ids') order by value loop
        perform app_private.crm_command_base('assign',jsonb_build_object('id',lead_key,'agentId',target.id));
        batch_count := batch_count+1;
      end loop;
      return jsonb_build_object('count',batch_count);
    end if;
  end if;

  if command in ('createAgent','saveAgent','deleteAgent') then
    if command<>'createAgent' then
      select * into target from public.agents where id=payload->>'id' for update;
      if target.id is null then raise exception 'Agent was not found.'; end if;
      if actor.role<>'ADMIN' and actor.agent_id is distinct from target.id then
        raise exception 'Agent access denied.' using errcode='42501';
      end if;
    end if;
    if command='deleteAgent' then
      if payload->>'confirmName' is distinct from target.name then raise exception 'Type the agent name to confirm deletion.'; end if;
      if exists(select 1 from public.profiles where agent_id=target.id)
        or exists(select 1 from public.leads where assigned_agent_id=target.id)
        or exists(select 1 from public.tasks where agent_id=target.id)
        or exists(select 1 from public.viewings where agent_id=target.id)
        or exists(select 1 from public.notifications where agent_id=target.id) then
        raise exception 'This agent has linked CRM records or a login account. Reassign open work and deactivate the agent instead.';
      end if;
      delete from public.agents where id=target.id;
      insert into public.agent_events(agent_id,type,message,author,actor_id)
        values(target.id,'DELETED','Deleted agent '||target.name||'.',actor.name,actor.id);
      return jsonb_build_object('id',target.id);
    end if;

    next_name := app_private.require_text(payload->>'name','Name');
    next_email := lower(app_private.require_text(coalesce(target.email,payload->>'email'),'Email'));
    next_phone := app_private.require_text(payload->>'phone','Phone');
    next_specialization := app_private.require_text(payload->>'specialization','Specialization');
    if length(next_name)>200 or length(next_specialization)>200 or length(next_email)>254 then raise exception 'Agent profile fields are too long.'; end if;
    if next_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
    if next_phone !~ '^[+0-9 ()-]{7,20}$' then raise exception 'Enter a valid phone number.'; end if;
    if length(coalesce(payload->>'languages',''))>1000 or length(coalesce(payload->>'locations',''))>1000 then raise exception 'Languages and locations must be 1000 characters or fewer.'; end if;
    next_languages := array(select distinct btrim(value) from regexp_split_to_table(app_private.require_text(payload->>'languages','Languages'),',') value where btrim(value)<>'');
    next_locations := array(select distinct btrim(value) from regexp_split_to_table(app_private.require_text(coalesce(payload->>'locations',array_to_string(target.locations,',')),'Locations'),',') value where btrim(value)<>'');
    if cardinality(next_languages)=0 or cardinality(next_locations)=0 then raise exception 'Languages and locations are required.'; end if;
    next_status := case when actor.role='ADMIN' then coalesce(payload->>'status',target.status,'ACTIVE') else target.status end;
    if next_status not in ('ACTIVE','INACTIVE') then raise exception 'Choose a valid agent status.'; end if;
    if exists(select 1 from public.agents a where lower(btrim(a.email))=next_email and a.id is distinct from target.id) then raise exception 'An agent with this email already exists.'; end if;
    if next_status='INACTIVE' and (
      exists(select 1 from public.leads where assigned_agent_id=target.id and status not in ('WON','LOST')) or
      exists(select 1 from public.tasks where agent_id=target.id and status not in ('COMPLETED','CANCELLED')) or
      exists(select 1 from public.viewings where agent_id=target.id and status='SCHEDULED')
    ) then raise exception 'Reassign all open leads, tasks and scheduled viewings before deactivating this agent.'; end if;

    agent_key := coalesce(target.id,'agent-'||gen_random_uuid()::text);
    if command='createAgent' then
      insert into public.agents(id,name,email,phone,specialization,languages,locations,status)
        values(agent_key,next_name,next_email,next_phone,next_specialization,next_languages,next_locations,next_status);
    else
      update public.agents set name=next_name,phone=next_phone,specialization=next_specialization,languages=next_languages,locations=next_locations,status=next_status where id=agent_key;
      update public.profiles set name=next_name where agent_id=agent_key;
    end if;
    insert into public.agent_events(agent_id,type,message,author,actor_id)
      values(agent_key,case when command='createAgent' then 'CREATED' else 'UPDATED' end,
        case when command='createAgent' then 'Created' else 'Updated' end||' agent '||next_name||' ('||next_status||').',actor.name,actor.id);
    return jsonb_build_object('id',agent_key);
  end if;

  if command='status' and payload->>'status'='FOLLOW_UP' then
    select a.* into target from public.leads l join public.agents a on a.id=l.assigned_agent_id
      where l.id=coalesce(payload->>'leadId',payload->>'id') for share of a;
    if target.status='INACTIVE' then raise exception 'Reactivate the responsible agent before reopening this lead.'; end if;
  end if;
  return app_private.crm_command_base(command,payload);
end;
$$;
revoke all on function public.crm_command(text,jsonb) from public, anon;
grant execute on function public.crm_command(text,jsonb) to authenticated;

-- Realtime is optional in local SQL tests and enabled only when the publication exists.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.agent_events;
  end if;
end $$;
commit;
