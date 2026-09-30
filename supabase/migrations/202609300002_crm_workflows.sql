begin;
create function app_private.require_text(value text, title text) returns text language plpgsql immutable set search_path = '' as $$
begin
  if nullif(btrim(value),'') is null then raise exception '% is required.', title; end if;
  if length(value) > 10000 then raise exception '% is too long.', title; end if;
  return btrim(value);
end $$;
create function app_private.event(lead_key text, event_type text, message_text text, actor_name text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lead_activities(lead_id,type,message,author,author_profile_id)
  values(lead_key,event_type,message_text,coalesce(actor_name,(select name from public.profiles where id=auth.uid()),'Website visitor'),(select id from public.profiles where id=auth.uid()));
  update public.leads set updated_at=now() where id=lead_key;
end $$;
create function app_private.notify(lead_key text, message_text text) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(lead_id,agent_id,message) select id,assigned_agent_id,message_text from public.leads where id=lead_key;
$$;
create function app_private.stage(lead_key text, next_status text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.leads where id=lead_key and status<>next_status) then
    update public.leads set status=next_status,updated_at=now() where id=lead_key;
    perform app_private.event(lead_key,'STATUS_CHANGED','Lead moved to ' || replace(initcap(lower(next_status)),'_',' ') || '.');
  end if;
end $$;
create function app_private.sync_follow_up(lead_key text) returns void language sql security definer set search_path = '' as $$
  update public.leads set next_follow_up=(select min(due_date) from public.tasks where lead_id=lead_key and is_follow_up and status not in ('COMPLETED','CANCELLED')) where id=lead_key;
$$;
create function app_private.close_work(lead_key text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.tasks set status='CANCELLED' where lead_id=lead_key and status not in ('COMPLETED','CANCELLED');
  update public.viewings set status='CANCELLED' where lead_id=lead_key and status='SCHEDULED';
  perform app_private.sync_follow_up(lead_key);
end $$;
create function app_private.create_lead(payload jsonb, website boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  result public.leads; prop public.properties; source_text text; budget_lo numeric := 0; budget_hi numeric := 0;
  name_text text := app_private.require_text(payload->>'name','Customer name');
  email_text text := lower(app_private.require_text(payload->>'email','Email'));
  phone_text text := app_private.require_text(payload->>'phone','Phone');
begin
  if length(name_text)<2 or email_text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or phone_text !~ '^[+0-9 ()-]{7,20}$' then raise exception 'Enter a valid name, email and phone number.'; end if;
  if nullif(payload->>'propertyId','') is not null then
    select * into prop from public.properties where id=(payload->>'propertyId')::bigint;
    if prop.id is null or (website and prop.status<>'ACTIVE') then raise exception 'Property is unavailable.'; end if;
  end if;
  if website then
    if length(app_private.require_text(payload->>'message','Message'))<10 then raise exception 'Your message must contain at least 10 characters.'; end if;
    perform pg_advisory_xact_lock(hashtext(email_text));
    if (select count(*) from public.leads where customer_email=email_text and created_at>now()-interval '1 day')>=10 then raise exception 'Too many inquiries for this email. Please try again tomorrow.'; end if;
    source_text:=case when prop.id is null then 'Contact Form' else 'Property Detail' end;
  else source_text:=coalesce(nullif(payload->>'source',''),'Other'); end if;
  case payload->>'budget'
    when 'Under 1 million' then budget_hi:=1000000;
    when '1–5 million' then budget_lo:=1000000; budget_hi:=5000000;
    when '5–15 million' then budget_lo:=5000000; budget_hi:=15000000;
    when '15 million and above' then budget_lo:=15000000;
    else budget_hi:=coalesce(nullif(payload->>'budgetMax','')::numeric,0);
  end case;
  insert into public.leads(customer_name,customer_email,customer_phone,customer_country,property_id,source,purpose,budget_min,budget_max,preferred_location,preferred_contact,priority)
  values(name_text,email_text,phone_text,app_private.require_text(payload->>'country','Country'),prop.id,source_text,
    coalesce(payload->>'purpose',payload->>'interest',prop.purpose,'buy'),budget_lo,budget_hi,coalesce(prop.location,payload->>'location',''),coalesce(payload->>'preferredContact','Call'),case when website then 'MEDIUM' else coalesce(payload->>'priority','MEDIUM') end)
  returning * into result;
  perform app_private.event(result.id,'LEAD_CREATED','Lead created from '||source_text||'.');
  if nullif(btrim(payload->>'message'),'') is not null then insert into public.lead_notes(lead_id,content,author) values(result.id,payload->>'message',name_text); end if;
  perform app_private.notify(result.id,'New inquiry from '||name_text||'.');
  return jsonb_build_object('id',result.id,'createdAt',result.created_at);
end $$;
create function public.submit_inquiry(payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if octet_length(payload::text)>24000 then raise exception 'Inquiry is too large.'; end if;
  return app_private.create_lead(payload,true);
end $$;

create function public.crm_command(command text, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles; lead public.leads; agent public.agents; task public.tasks; viewing public.viewings;
  prop public.properties; result jsonb; lead_key text; next_stage text; event_date timestamptz; strings text[]; imgs text[];
  row_key text := coalesce(payload->>'id',payload->>'leadId'); priority_value text; reason text;
begin
  select * into actor from public.profiles where id=auth.uid();
  if actor.id is null then raise exception 'Sign in with an authorized CRM account.' using errcode='42501'; end if;
  if octet_length(payload::text)>100000 then raise exception 'Request is too large.'; end if;
  if command in ('createLead','assign','saveProperty','saveSettings') and actor.role<>'ADMIN' then raise exception 'Administrator access is required.' using errcode='42501'; end if;
  if command='createLead' then return app_private.create_lead(payload,false); end if;
  if command='saveSettings' then
    insert into public.crm_settings(id,company,email,phone,default_view) values(1,app_private.require_text(payload->>'company','Company'),app_private.require_text(payload->>'email','Email'),app_private.require_text(payload->>'phone','Phone'),coalesce(payload->>'defaultView','table'))
    on conflict(id) do update set company=excluded.company,email=excluded.email,phone=excluded.phone,default_view=excluded.default_view;
    return jsonb_build_object('id',1);
  end if;
  if command='saveAgent' then
    select * into agent from public.agents where id=row_key for update;
    if agent.id is null or (actor.role<>'ADMIN' and actor.agent_id<>agent.id) then raise exception 'Agent access denied.' using errcode='42501'; end if;
    update public.agents set name=app_private.require_text(payload->>'name','Name'),phone=app_private.require_text(payload->>'phone','Phone'),specialization=app_private.require_text(payload->>'specialization','Specialization'),languages=regexp_split_to_array(app_private.require_text(payload->>'languages','Languages'),'\s*,\s*'),status=case when actor.role='ADMIN' then coalesce(payload->>'status',agent.status) else agent.status end where id=agent.id;
    update public.profiles set name=payload->>'name' where agent_id=agent.id;
    return jsonb_build_object('id',agent.id);
  end if;
  if command='saveProperty' then
    if nullif(payload->>'id','') is not null then select * into prop from public.properties where id=(payload->>'id')::bigint for update; if prop.id is null then raise exception 'Property not found.'; end if; end if;
    if jsonb_typeof(payload->'images')='array' then select array_agg(value) into imgs from jsonb_array_elements_text(payload->'images'); else imgs:=regexp_split_to_array(btrim(payload->>'images'),E'\n+'); end if;
    if coalesce(cardinality(imgs),0)=0 or exists(select 1 from unnest(imgs) i where i !~ '^https?://[^[:space:]]+$') then raise exception 'Provide valid http or https image URLs.'; end if;
    if jsonb_typeof(payload->'amenities')='array' then select array_agg(value) into strings from jsonb_array_elements_text(payload->'amenities'); else strings:=regexp_split_to_array(coalesce(payload->>'amenities',''),'\s*,\s*'); end if;
    if prop.id is null then
      prop.id:=nextval(pg_get_serial_sequence('public.properties','id'));
      prop.slug:=trim(both '-' from regexp_replace(lower(app_private.require_text(payload->>'title','Title')),'[^a-z0-9]+','-','g'))||'-'||prop.id;
    end if;
    insert into public.properties(id,slug,title,category,purpose,location,location_slug,price,bedrooms,bathrooms,area,description,images,amenities,featured,status,off_plan,reference,agent)
    values(prop.id,prop.slug,app_private.require_text(payload->>'title','Title'),app_private.require_text(payload->>'category','Category'),payload->>'purpose',app_private.require_text(payload->>'location','Location'),app_private.require_text(payload->>'locationSlug','Location reference'),(payload->>'price')::numeric,(payload->>'bedrooms')::integer,(payload->>'bathrooms')::integer,(payload->>'area')::numeric,app_private.require_text(payload->>'description','Description'),imgs,coalesce(strings,'{}'),coalesce((payload->>'featured')::boolean,false),payload->>'status',(payload->>'purpose')='off-plan',coalesce(prop.reference,'DH-'||prop.id),coalesce(prop.agent,(select jsonb_build_object('name',name,'role','Property Advisor','languages',array_to_string(languages,' · '),'image',avatar) from public.agents order by id limit 1),'{}'))
    on conflict(id) do update set title=excluded.title,category=excluded.category,purpose=excluded.purpose,location=excluded.location,location_slug=excluded.location_slug,price=excluded.price,bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,area=excluded.area,description=excluded.description,images=excluded.images,amenities=excluded.amenities,featured=excluded.featured,status=excluded.status,off_plan=excluded.off_plan,updated_at=now();
    return jsonb_build_object('id',prop.id);
  end if;
  if command='readNotifications' then
    insert into public.notifications(id,lead_id,agent_id,message,created_at)
      select 'due-'||t.id||'-'||to_char(t.due_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),t.lead_id,t.agent_id,case when t.due_date<now() then 'Overdue: ' else 'Due today: ' end||t.title,t.due_date
      from public.tasks t where app_private.can_read_lead(t.lead_id) and (actor.role='ADMIN' or t.agent_id=actor.agent_id) and t.status not in ('COMPLETED','CANCELLED') and t.due_date<now()+interval '1 day'
      on conflict(id) do update set agent_id=excluded.agent_id;
    update public.notifications n set read_by=array_append(n.read_by,actor.id::text) where (actor.role='ADMIN' or (n.agent_id=actor.agent_id and app_private.can_read_lead(n.lead_id))) and not (actor.id::text=any(n.read_by)) and (payload->>'id' is null or n.id=payload->>'id');
    return '{}';
  end if;
  if command='updateTask' then
    select * into task from public.tasks where id=row_key;
    if task.id is null then raise exception 'Task not found.'; end if;
    lead_key:=task.lead_id;
  elsif command='updateViewing' then
    select * into viewing from public.viewings where id=row_key;
    if viewing.id is null then raise exception 'Viewing not found.'; end if;
    lead_key:=viewing.lead_id;
  else lead_key:=coalesce(payload->>'leadId',payload->>'id'); end if;
  select * into lead from public.leads where id=lead_key for update;
  if lead.id is null or not app_private.can_read_lead(lead.id) then raise exception 'This lead is unavailable or not assigned to you.' using errcode='42501'; end if;
  if command in ('assign','createTask','createViewing','won','lost') and lead.status in ('WON','LOST') then raise exception 'This lead is closed. Reopen it before scheduling work.'; end if;
  case command
  when 'assign' then
    select * into agent from public.agents where id=payload->>'agentId' and status='ACTIVE';
    if agent.id is null then raise exception 'Select an active agent.'; end if;
    update public.leads set assigned_agent_id=agent.id,assigned_at=now() where id=lead.id;
    update public.tasks set agent_id=agent.id where lead_id=lead.id and status not in ('COMPLETED','CANCELLED');
    update public.viewings set agent_id=agent.id where lead_id=lead.id and status='SCHEDULED';
    if lead.status='NEW' then perform app_private.stage(lead.id,'ASSIGNED'); end if;
    perform app_private.event(lead.id,'AGENT_ASSIGNED',case when lead.assigned_agent_id is null then 'Assigned to ' else 'Reassigned to ' end||agent.name||'.');
    perform app_private.notify(lead.id,lead.customer_name||' assigned to '||agent.name||'.');
  when 'status' then
    next_stage:=payload->>'status';
    if next_stage not in ('NEW','ASSIGNED','CONTACTED','QUALIFIED','FOLLOW_UP','NEGOTIATION') then raise exception 'Use the dedicated viewing or outcome action for this stage.'; end if;
    if lead.status in ('WON','LOST') and next_stage<>'FOLLOW_UP' then raise exception 'Reopen closed leads in Follow Up.'; end if;
    if next_stage<>'NEW' and lead.assigned_agent_id is null then raise exception 'Assign an agent first.'; end if;
    if next_stage='NEW' and lead.assigned_agent_id is not null then raise exception 'Assigned leads cannot return to New.'; end if;
    if lead.status in ('WON','LOST') then update public.leads set status='FOLLOW_UP',final_property_id=null,deal_value=null,closing_date=null,deal_notes=null,lost_reason=null,lost_notes=null where id=lead.id; perform app_private.event(lead.id,'STATUS_CHANGED','Closed lead reopened in Follow Up.');
    else perform app_private.stage(lead.id,next_stage); end if;
  when 'priority' then
    update public.leads set priority=payload->>'priority' where id=lead.id;
    perform app_private.event(lead.id,'PRIORITY_CHANGED','Priority changed to '||(payload->>'priority')||'.');
  when 'note' then
    insert into public.lead_notes(lead_id,content,author,author_profile_id) values(lead.id,app_private.require_text(payload->>'content','Note'),actor.name,actor.id);
    perform app_private.event(lead.id,'NOTE_ADDED','A note was added.');
  when 'communication' then
    if payload->>'type' not in ('Call','Email','WhatsApp') then raise exception 'Choose a communication type.'; end if;
    if lead.assigned_agent_id is null then raise exception 'Assign an agent first.'; end if;
    perform app_private.event(lead.id,upper(payload->>'type')||'_LOGGED',(payload->>'type')||' logged: '||app_private.require_text(payload->>'content','Conversation notes'));
    if lead.status in ('NEW','ASSIGNED') then perform app_private.stage(lead.id,'CONTACTED'); end if;
  when 'createTask' then
    if lead.assigned_agent_id is null then raise exception 'Assign an agent before scheduling work.'; end if;
    event_date:=(payload->>'dueDate')::timestamptz;
    if event_date is null or event_date<=now() then raise exception 'Choose a future date and time.'; end if;
    insert into public.tasks(lead_id,agent_id,title,type,due_date,priority,notes,is_follow_up) values(lead.id,lead.assigned_agent_id,app_private.require_text(payload->>'title','Title'),coalesce(payload->>'type','Call'),event_date,coalesce(payload->>'priority',lead.priority),coalesce(payload->>'notes',''),coalesce((payload->>'isFollowUp')::boolean,false)) returning * into task;
    perform app_private.sync_follow_up(lead.id);
    perform app_private.event(lead.id,case when task.is_follow_up then 'FOLLOW_UP_CREATED' else 'TASK_CREATED' end,task.title||' scheduled for '||event_date||'.');
    if task.is_follow_up and lead.status not in ('VIEWING_SCHEDULED','NEGOTIATION') then perform app_private.stage(lead.id,'FOLLOW_UP'); end if;
    perform app_private.notify(lead.id,'Task scheduled for '||lead.customer_name||'.');
    return jsonb_build_object('id',task.id);
  when 'updateTask' then
    select * into task from public.tasks where id=row_key for update;
    if actor.role<>'ADMIN' and task.agent_id<>actor.agent_id then raise exception 'Task access denied.'; end if;
    if task.status in ('COMPLETED','CANCELLED') then raise exception 'This task is already closed.'; end if;
    if payload ? 'dueDate' then event_date:=(payload->>'dueDate')::timestamptz; if event_date is null or event_date<=now() then raise exception 'Choose a future date and time.'; end if; end if;
    update public.tasks set status=coalesce(payload->>'status',status),due_date=coalesce(event_date,due_date) where id=task.id;
    perform app_private.sync_follow_up(lead.id);
    perform app_private.event(lead.id,'TASK_UPDATED',task.title||': '||case when event_date is not null then 'rescheduled to '||event_date else payload->>'status' end||'.');
    return jsonb_build_object('id',task.id);
  when 'createViewing' then
    if lead.assigned_agent_id is null then raise exception 'Assign an agent before scheduling a viewing.'; end if;
    event_date:=(payload->>'date')::timestamptz;
    if event_date is null or event_date<=now() then raise exception 'Choose a future date and time.'; end if;
    perform pg_advisory_xact_lock(hashtext(lead.assigned_agent_id));
    if exists(select 1 from public.viewings where agent_id=lead.assigned_agent_id and status='SCHEDULED' and abs(extract(epoch from date-event_date))<3600) then raise exception 'This agent has a viewing within one hour.'; end if;
    select * into prop from public.properties where id=coalesce(nullif(payload->>'propertyId','')::bigint,lead.property_id);
    if prop.id is null then raise exception 'Select a property.'; end if;
    insert into public.viewings(lead_id,property_id,agent_id,date,meeting_location,notes) values(lead.id,prop.id,lead.assigned_agent_id,event_date,app_private.require_text(payload->>'meetingLocation','Meeting location'),coalesce(payload->>'notes','')) returning * into viewing;
    perform app_private.stage(lead.id,'VIEWING_SCHEDULED');
    perform app_private.event(lead.id,'VIEWING_CREATED','Viewing at '||prop.title||' scheduled for '||event_date||'.');
    perform app_private.notify(lead.id,'Viewing scheduled for '||lead.customer_name||'.');
    return jsonb_build_object('id',viewing.id);
  when 'updateViewing' then
    select * into viewing from public.viewings where id=row_key for update;
    if actor.role<>'ADMIN' and viewing.agent_id<>actor.agent_id then raise exception 'Viewing access denied.'; end if;
    if viewing.status<>'SCHEDULED' then raise exception 'This viewing is already closed.'; end if;
    if payload->>'action'='reschedule' then
      event_date:=(payload->>'date')::timestamptz;
      if event_date is null or event_date<=now() then raise exception 'Choose a future date and time.'; end if;
      perform pg_advisory_xact_lock(hashtext(viewing.agent_id));
      if exists(select 1 from public.viewings where id<>viewing.id and agent_id=viewing.agent_id and status='SCHEDULED' and abs(extract(epoch from date-event_date))<3600) then raise exception 'This agent has another viewing within one hour.'; end if;
      update public.viewings set date=event_date where id=viewing.id;
      perform app_private.event(lead.id,'VIEWING_RESCHEDULED','Viewing rescheduled to '||event_date||'.');
    elsif payload->>'action'='cancel' then
      update public.viewings set status='CANCELLED' where id=viewing.id;
      perform app_private.event(lead.id,'VIEWING_CANCELLED','Viewing cancelled.');
      if lead.status='VIEWING_SCHEDULED' and not exists(select 1 from public.viewings where lead_id=lead.id and status='SCHEDULED') then perform app_private.stage(lead.id,'FOLLOW_UP'); end if;
    elsif payload->>'action'='complete' then
      if viewing.date>now() then raise exception 'A viewing can only be completed after its scheduled time.'; end if;
      if payload->>'outcome' is null or payload->>'outcome' not in ('Interested','Very Interested','Need Follow-Up','Not Interested','Second Viewing Required') then raise exception 'Choose a viewing outcome.'; end if;
      update public.viewings set status='COMPLETED',outcome=payload->>'outcome',outcome_notes=app_private.require_text(payload->>'notes','Outcome notes'),completed_at=now() where id=viewing.id;
      perform app_private.event(lead.id,'VIEWING_COMPLETED','Viewing completed: '||(payload->>'outcome')||'. '||(payload->>'notes'));
      perform app_private.stage(lead.id,'VIEWING_COMPLETED');
      perform app_private.stage(lead.id,case when payload->>'outcome' in ('Interested','Very Interested') then 'NEGOTIATION' else 'FOLLOW_UP' end);
    else raise exception 'Choose a viewing action.'; end if;
    return jsonb_build_object('id',viewing.id);
  when 'won' then
    if coalesce((payload->>'confirmed')::boolean,false)=false then raise exception 'Confirm the final deal before closing.'; end if;
    if lead.assigned_agent_id is null then raise exception 'Assign an agent first.'; end if;
    event_date:=(payload->>'closingDate')::timestamptz;
    if event_date is null or event_date>now() then raise exception 'Choose a valid non-future closing date.'; end if;
    if coalesce((payload->>'value')::numeric,0)<=0 then raise exception 'Deal value must be greater than zero.'; end if;
    update public.leads set final_property_id=(payload->>'propertyId')::bigint,deal_value=(payload->>'value')::numeric,closing_date=event_date,deal_notes=coalesce(payload->>'notes','') where id=lead.id;
    perform app_private.stage(lead.id,'WON'); perform app_private.close_work(lead.id);
    perform app_private.event(lead.id,'WON','Deal marked as won. Outstanding work cancelled.');
    perform app_private.notify(lead.id,'Deal won: '||lead.customer_name||'.');
  when 'lost' then
    reason:=payload->>'reason';
    if reason is null or reason not in ('Budget Issue','Property Not Suitable','Bought Elsewhere','No Response','Financing Issue','Changed Plans','Other') then raise exception 'Select a lost reason.'; end if;
    if reason='Other' then perform app_private.require_text(payload->>'notes','Lost notes'); end if;
    update public.leads set lost_reason=reason,lost_notes=coalesce(payload->>'notes','') where id=lead.id;
    perform app_private.stage(lead.id,'LOST'); perform app_private.close_work(lead.id);
    perform app_private.event(lead.id,'LOST','Lead marked as lost: '||reason||'. Outstanding work cancelled.');
  else raise exception 'Unknown CRM action.';
  end case;
  return jsonb_build_object('id',lead.id);
end $$;
revoke all on function public.submit_inquiry(jsonb),public.crm_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_inquiry(jsonb) to anon,authenticated;
grant execute on function public.crm_command(text,jsonb) to authenticated;
revoke all on function app_private.require_text(text,text),app_private.event(text,text,text,text),app_private.notify(text,text),app_private.stage(text,text),app_private.sync_follow_up(text),app_private.close_work(text),app_private.create_lead(jsonb,boolean) from public,anon,authenticated;
commit;
