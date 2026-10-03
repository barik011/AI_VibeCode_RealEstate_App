begin;

alter table public.properties add column version bigint not null default 1 check(version > 0);
create index if not exists leads_property_id on public.leads(property_id) where property_id is not null;
create index if not exists leads_final_property_id on public.leads(final_property_id) where final_property_id is not null;
create index if not exists viewings_property_id on public.viewings(property_id);
create function app_private.bump_property_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;
create trigger properties_version before update on public.properties
  for each row execute function app_private.bump_property_version();

-- Audit entries deliberately retain the property ID after deletion.
create table public.property_events (
  id text primary key default ('PE-' || gen_random_uuid()::text),
  property_id bigint not null,
  type text not null check(type in ('CREATED','UPDATED','ARCHIVED','DELETED')),
  message text not null,
  author text not null,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
create index property_events_created on public.property_events(created_at desc);
alter table public.property_events enable row level security;
create policy property_events_read on public.property_events for select to authenticated
  using ((select app_private.is_admin()));
revoke all on public.property_events from public, anon, authenticated;
grant select on public.property_events to authenticated;
grant all on public.property_events to service_role;

alter function public.crm_command(text,jsonb) set schema app_private;
alter function app_private.crm_command(text,jsonb) rename to crm_command_team;
revoke all on function app_private.crm_command_team(text,jsonb) from public, anon, authenticated;

create function public.crm_command(command text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles;
  target public.properties;
  result jsonb;
  event_type text;
  event_message text;
  field_name text;
  max_length integer;
  items text[];
begin
  if command not in ('saveProperty','deleteProperty','archiveProperty','setPropertyFeatured') then
    return app_private.crm_command_team(command,payload);
  end if;
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null or actor.role<>'ADMIN' then
    raise exception 'Administrator access is required.' using errcode='42501';
  end if;
  if octet_length(payload::text)>100000 then raise exception 'Request is too large.'; end if;
  if nullif(payload->>'id','') is not null then
    select * into target from public.properties where id=(payload->>'id')::bigint for update;
    if target.id is null then raise exception 'Property not found.'; end if;
    if coalesce(payload->>'expectedVersion','') <> target.version::text then
      raise exception 'This property has changed since you opened it. Close this dialog, refresh the workspace and review the latest record before trying again.' using errcode='40001';
    end if;
  elsif command<>'saveProperty' then
    raise exception 'Select a property.';
  end if;

  if command='deleteProperty' then
    if (payload->>'confirmTitle') is distinct from target.title then
      raise exception 'Type the property title to confirm deletion.';
    end if;
    -- Row lock plus foreign keys protect against a concurrent new inquiry/viewing.
    if exists(select 1 from public.leads where property_id=target.id or final_property_id=target.id)
      or exists(select 1 from public.viewings where property_id=target.id) then
      raise exception 'This property has linked leads, deals or viewings. Archive it to preserve CRM history.';
    end if;
    delete from public.properties where id=target.id;
    event_type := 'DELETED';
    event_message := 'Deleted property '||target.title||'.';
  elsif command='archiveProperty' then
    update public.properties set status='INACTIVE',featured=false where id=target.id;
    event_type := 'ARCHIVED';
    event_message := 'Archived property '||target.title||'.';
  elsif command='setPropertyFeatured' then
    if jsonb_typeof(payload->'featured') is distinct from 'boolean' then raise exception 'Choose a valid featured value.'; end if;
    update public.properties set featured=(payload->>'featured')::boolean where id=target.id;
    event_type := 'UPDATED';
    event_message := 'Updated featured selection for property '||target.title||'.';
  else
    for field_name,max_length in select * from (values ('title',200),('category',100),('location',200),('locationSlug',200),('description',10000)) limits loop
      if length(btrim(payload->>field_name))>max_length then raise exception '% must be % characters or fewer.',field_name,max_length; end if;
    end loop;
    foreach field_name in array array['images','amenities'] loop
      if jsonb_typeof(payload->field_name)='array' then
        select array_agg(value) into items from jsonb_array_elements_text(payload->field_name);
      else
        items := string_to_array(coalesce(payload->>field_name,''),case when field_name='images' then E'\n' else ',' end);
      end if;
      if cardinality(items)>50 or exists(select 1 from unnest(items) item where length(item)>2000) then
        raise exception '% accepts up to 50 entries of 2000 characters each.',field_name;
      end if;
    end loop;
    foreach field_name in array array['bedrooms','bathrooms'] loop
      if coalesce(payload->>field_name,'') !~ '^\d+$' then raise exception '% must be a non-negative whole number.',field_name; end if;
    end loop;
    event_type := case when target.id is null then 'CREATED' else 'UPDATED' end;
    result := app_private.crm_command_team(command,payload);
    select * into target from public.properties where id=(result->>'id')::bigint;
    event_message := case when event_type='CREATED' then 'Created' else 'Updated' end || ' property '||target.title||' ('||target.status||').';
  end if;
  insert into public.property_events(property_id,type,message,author,actor_id)
    values(target.id,event_type,event_message,actor.name,actor.id);
  return jsonb_build_object('id',target.id);
end;
$$;
revoke all on function public.crm_command(text,jsonb) from public,anon;
grant execute on function public.crm_command(text,jsonb) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.property_events;
  end if;
end $$;

commit;
