begin;
-- Import preserves IDs. Matching records change only when an admin explicitly enables overwriteExisting.
create function public.import_crm_data(payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare row jsonb; n integer:=0; counts jsonb:='{}';
begin
  if not app_private.is_admin() and coalesce(auth.role(),'')<>'service_role' then raise exception 'Administrator access required.' using errcode='42501'; end if;
  if octet_length(payload::text)>10000000 then raise exception 'Import is too large. Split it into smaller batches.'; end if;
  for row in select value from jsonb_array_elements(coalesce(payload->'agents','[]')) loop
    insert into public.agents(id,name,email,phone,avatar,specialization,locations,languages,status) values(row->>'id',row->>'name',row->>'email',row->>'phone',row->>'avatar',row->>'specialization',array(select jsonb_array_elements_text(row->'locations')),array(select jsonb_array_elements_text(row->'languages')),coalesce(row->>'status','ACTIVE')) on conflict(id) do update set name=excluded.name,email=excluded.email,phone=excluded.phone,avatar=excluded.avatar,specialization=excluded.specialization,locations=excluded.locations,languages=excluded.languages,status=excluded.status where coalesce((payload->>'overwriteExisting')::boolean,false);
  end loop;
  for row in select value from jsonb_array_elements(coalesce(payload->'properties','[]')) loop
    insert into public.properties(id,slug,title,category,purpose,location,location_slug,city,price,currency,bedrooms,bathrooms,area,area_unit,featured,off_plan,created_at,tenure,furnished,reference,images,coordinates,description,amenities,agent,status) values((row->>'id')::bigint,row->>'slug',row->>'title',row->>'category',row->>'purpose',row->>'location',row->>'locationSlug',coalesce(row->>'city','Dubai'),(row->>'price')::numeric,coalesce(row->>'currency','AED'),(row->>'bedrooms')::integer,(row->>'bathrooms')::integer,(row->>'area')::numeric,coalesce(row->>'areaUnit','sq ft'),coalesce((row->>'featured')::boolean,false),coalesce((row->>'offPlan')::boolean,false),coalesce((row->>'createdAt')::timestamptz,now()),row->>'tenure',row->>'furnished',row->>'reference',array(select jsonb_array_elements_text(row->'images')),coalesce(row->'coordinates','{}'),row->>'description',array(select jsonb_array_elements_text(row->'amenities')),coalesce(row->'agent','{}'),coalesce(row->>'status','ACTIVE')) on conflict(id) do update set slug=excluded.slug,title=excluded.title,category=excluded.category,purpose=excluded.purpose,location=excluded.location,location_slug=excluded.location_slug,city=excluded.city,price=excluded.price,currency=excluded.currency,bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,area=excluded.area,area_unit=excluded.area_unit,featured=excluded.featured,off_plan=excluded.off_plan,created_at=excluded.created_at,tenure=excluded.tenure,furnished=excluded.furnished,reference=excluded.reference,images=excluded.images,coordinates=excluded.coordinates,description=excluded.description,amenities=excluded.amenities,agent=excluded.agent,status=excluded.status where coalesce((payload->>'overwriteExisting')::boolean,false);
  end loop;
  perform setval(pg_get_serial_sequence('public.properties','id'),greatest(1,(select coalesce(max(id),1) from public.properties)),true);
  for row in select value from jsonb_array_elements(coalesce(payload->'leads','[]')) loop
    insert into public.leads(id,customer_name,customer_email,customer_phone,customer_country,property_id,source,purpose,budget_min,budget_max,preferred_location,preferred_contact,status,priority,assigned_agent_id,assigned_at,next_follow_up,created_at,updated_at,final_property_id,deal_value,closing_date,deal_notes,lost_reason,lost_notes) values(row->>'id',row#>>'{customer,name}',row#>>'{customer,email}',row#>>'{customer,phone}',row#>>'{customer,country}',nullif(row->>'propertyId','')::bigint,row->>'source',coalesce(row->>'purpose','buy'),coalesce((row#>>'{budget,min}')::numeric,0),coalesce((row#>>'{budget,max}')::numeric,0),coalesce(row->>'preferredLocation',''),coalesce(row->>'preferredContact','Call'),row->>'status',row->>'priority',row->>'assignedAgentId',(row->>'assignedAt')::timestamptz,(row->>'nextFollowUp')::timestamptz,(row->>'createdAt')::timestamptz,(row->>'updatedAt')::timestamptz,(row#>>'{deal,propertyId}')::bigint,(row#>>'{deal,value}')::numeric,(row#>>'{deal,closingDate}')::timestamptz,row#>>'{deal,notes}',row->>'lostReason',row->>'lostNotes') on conflict(id) do update set customer_name=excluded.customer_name,customer_email=excluded.customer_email,customer_phone=excluded.customer_phone,customer_country=excluded.customer_country,property_id=excluded.property_id,source=excluded.source,purpose=excluded.purpose,budget_min=excluded.budget_min,budget_max=excluded.budget_max,preferred_location=excluded.preferred_location,preferred_contact=excluded.preferred_contact,status=excluded.status,priority=excluded.priority,assigned_agent_id=excluded.assigned_agent_id,assigned_at=excluded.assigned_at,next_follow_up=excluded.next_follow_up,created_at=excluded.created_at,updated_at=excluded.updated_at,final_property_id=excluded.final_property_id,deal_value=excluded.deal_value,closing_date=excluded.closing_date,deal_notes=excluded.deal_notes,lost_reason=excluded.lost_reason,lost_notes=excluded.lost_notes where coalesce((payload->>'overwriteExisting')::boolean,false);
  end loop;
  for row in select value from jsonb_array_elements(coalesce(payload->'tasks','[]')) loop
    insert into public.tasks(id,lead_id,agent_id,title,type,due_date,priority,status,notes,is_follow_up) values(row->>'id',row->>'leadId',row->>'agentId',row->>'title',row->>'type',(row->>'dueDate')::timestamptz,row->>'priority',case when row->>'status'='OVERDUE' then 'PENDING' else row->>'status' end,coalesce(row->>'notes',''),coalesce((row->>'isFollowUp')::boolean,false)) on conflict(id) do update set lead_id=excluded.lead_id,agent_id=excluded.agent_id,title=excluded.title,type=excluded.type,due_date=excluded.due_date,priority=excluded.priority,status=excluded.status,notes=excluded.notes,is_follow_up=excluded.is_follow_up where coalesce((payload->>'overwriteExisting')::boolean,false);
  end loop;
  for row in select value from jsonb_array_elements(coalesce(payload->'viewings','[]')) loop
    insert into public.viewings(id,lead_id,property_id,agent_id,date,meeting_location,notes,status,outcome,outcome_notes,completed_at) values(row->>'id',row->>'leadId',(row->>'propertyId')::bigint,row->>'agentId',(row->>'date')::timestamptz,row->>'meetingLocation',coalesce(row->>'notes',''),row->>'status',row->>'outcome',row->>'outcomeNotes',(row->>'completedAt')::timestamptz) on conflict(id) do update set lead_id=excluded.lead_id,property_id=excluded.property_id,agent_id=excluded.agent_id,date=excluded.date,meeting_location=excluded.meeting_location,notes=excluded.notes,status=excluded.status,outcome=excluded.outcome,outcome_notes=excluded.outcome_notes,completed_at=excluded.completed_at where coalesce((payload->>'overwriteExisting')::boolean,false);
  end loop;
  for row in select value from jsonb_array_elements(coalesce(payload->'activities','[]')) loop
    insert into public.lead_activities(id,lead_id,type,message,author,created_at) values(row->>'id',row->>'leadId',row->>'type',row->>'message',row->>'author',(row->>'createdAt')::timestamptz) on conflict do nothing;
  end loop;
  for row in select value from jsonb_array_elements(coalesce(payload->'notes','[]')) loop
    insert into public.lead_notes(id,lead_id,content,author,created_at) values(row->>'id',row->>'leadId',row->>'content',row->>'author',(row->>'createdAt')::timestamptz) on conflict do nothing;
  end loop;
  for row in select value from jsonb_array_elements(coalesce(payload->'notifications','[]')) loop
    insert into public.notifications(id,lead_id,agent_id,message,created_at) values(row->>'id',row->>'leadId',row->>'agentId',row->>'message',(row->>'createdAt')::timestamptz) on conflict do nothing;
  end loop;
  if payload ? 'settings' then
    insert into public.crm_settings(id,company,email,phone,default_view) values(1,coalesce(payload#>>'{settings,company}','Dubai House'),coalesce(payload#>>'{settings,email}','hello@dubaihouse.demo'),coalesce(payload#>>'{settings,phone}','+971 4 555 0100'),coalesce(payload#>>'{settings,defaultView}','table')) on conflict(id) do update set company=excluded.company,email=excluded.email,phone=excluded.phone,default_view=excluded.default_view where coalesce((payload->>'overwriteExisting')::boolean,false);
  end if;
  for row in select value from jsonb_array_elements(coalesce(payload->'newsletter','[]')) loop
    perform public.subscribe_newsletter(row #>> '{}');
  end loop;
  return jsonb_build_object('leads',(select count(*) from public.leads),'properties',(select count(*) from public.properties),'agents',(select count(*) from public.agents),'tasks',(select count(*) from public.tasks),'viewings',(select count(*) from public.viewings));
end $$;

create function public.visitor_favorites(visitor_token text, property_id bigint default null, initial_ids bigint[] default '{}') returns bigint[] language plpgsql security definer set search_path = '' as $$
declare token_key text; ids bigint[];
begin
  if visitor_token !~ '^[a-f0-9]{64}$' or visitor_token is null then raise exception 'Invalid visitor session.'; end if;
  token_key:=encode(sha256(convert_to(visitor_token,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtext(token_key));
  select favorites into ids from public.visitor_preferences where token_hash=token_key;
  if not found then
    select coalesce(array_agg(distinct p.id),'{}') into ids from public.properties p where p.id=any(initial_ids) and p.status='ACTIVE';
    insert into public.visitor_preferences(token_hash,favorites) values(token_key,ids);
  end if;
  if property_id is not null then
    if not exists(select 1 from public.properties where id=property_id and status='ACTIVE') then raise exception 'Property is unavailable.'; end if;
    if property_id=any(ids) then ids:=array_remove(ids,property_id); else ids:=array_append(ids,property_id); end if;
    if cardinality(ids)>500 then raise exception 'You can save up to 500 properties.'; end if;
    update public.visitor_preferences set favorites=ids,updated_at=now() where token_hash=token_key;
  end if;
  return ids;
end $$;
create function public.subscribe_newsletter(email_address text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if email_address is null or length(email_address)>254 or email_address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
  insert into public.newsletter_subscriptions(email) values(lower(btrim(email_address))) on conflict do nothing;
end $$;

revoke all on function public.import_crm_data(jsonb),public.visitor_favorites(text,bigint,bigint[]),public.subscribe_newsletter(text) from public,anon,authenticated;
grant execute on function public.import_crm_data(jsonb) to authenticated,service_role;
grant execute on function public.visitor_favorites(text,bigint,bigint[]),public.subscribe_newsletter(text) to anon,authenticated;

do $$ declare item text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach item in array array['properties','agents','leads','tasks','viewings','lead_activities','lead_notes','notifications','crm_settings'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=item) then execute format('alter publication supabase_realtime add table public.%I',item); end if;
    end loop;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
