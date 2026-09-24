create function public.onboard_company(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; uid uuid:=auth.uid(); initial_service text; begin
 if uid is null or exists(select 1 from public.company_members where user_id=uid) then raise exception 'Conta inválida ou já vinculada a uma empresa'; end if;
 if length(payload->>'name') not between 2 and 160 or coalesce(payload->>'city','')='' or coalesce(payload->>'state','')='' then raise exception 'Dados da empresa inválidos'; end if;
 insert into public.companies(name,phone,document,city,state,business_type,team_size) values(payload->>'name',payload->>'phone',payload->>'document',payload->>'city',payload->>'state',payload->>'business_type',payload->>'team_size') returning id into cid;
 insert into public.company_members(company_id,user_id,name,email,role) select cid,uid,coalesce(raw_user_meta_data->>'name',email),email,'owner' from auth.users where id=uid;
 for initial_service in select jsonb_array_elements_text(coalesce(payload->'services','[]')) loop
 if length(trim(initial_service))>0 then insert into public.services(company_id,name) values(cid,trim(initial_service)); end if;
 end loop;
 return cid;
end $$;

-- A pending member is an explicit invitation. Only the verified email owner can claim it.
create function public.save_member(cid uuid, member_id uuid, payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; desired public.member_role:=(payload->>'role')::public.member_role; begin
 if not private.manager(cid) then raise exception 'Sem permissão'; end if;
 if desired='owner' or exists(select 1 from public.company_members where id=member_id and company_id=cid and role='owner') then raise exception 'O proprietário não pode ser alterado'; end if;
 if private.role(cid)='admin' and (desired='admin' or exists(select 1 from public.company_members where id=member_id and company_id=cid and role='admin')) then raise exception 'Somente o proprietário gerencia administradores'; end if;
 if member_id is null then
 insert into public.company_members(company_id,name,email,phone,role) values(cid,payload->>'name',lower(payload->>'email'),payload->>'phone',desired) returning id into result;
 else
 update public.company_members set name=payload->>'name',phone=payload->>'phone',role=desired,active=coalesce((payload->>'active')::boolean,true) where id=member_id and company_id=cid returning id into result;
 end if;
 if result is null then raise exception 'Membro não encontrado'; end if;
 return result;
end $$;
create function public.accept_invitation() returns boolean language plpgsql security definer set search_path='' as $$
declare email_address text; invitation uuid; begin
 select lower(email) into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if email_address is null then return false; end if;
 if exists(select 1 from public.company_members where user_id=auth.uid()) then return true; end if;
 select id into invitation from public.company_members where lower(email)=email_address and user_id is null and active order by created_at limit 1 for update;
 if invitation is null then return false; end if;
 update public.company_members set user_id=auth.uid() where id=invitation;
 return true;
end $$;

create function public.save_quote(cid uuid, quote_id uuid, payload jsonb, items jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare qid uuid; item jsonb; v_subtotal numeric(12,2):=0; v_discount numeric(12,2):=coalesce((payload->>'discount')::numeric,0); begin
 if not private.staff(cid) then raise exception 'Sem permissão'; end if;
 if jsonb_array_length(items) not between 1 and 100 then raise exception 'Informe de 1 a 100 itens'; end if;
 for item in select * from jsonb_array_elements(items) loop
 if (item->>'quantity')::numeric<=0 or (item->>'unit_price')::numeric<0 or round((item->>'quantity')::numeric,2)<>(item->>'quantity')::numeric or round((item->>'unit_price')::numeric,2)<>(item->>'unit_price')::numeric then raise exception 'Item inválido'; end if;
 v_subtotal:=v_subtotal+round((item->>'quantity')::numeric*(item->>'unit_price')::numeric,2);
 end loop;
 if v_discount<0 or v_discount>v_subtotal then raise exception 'Desconto inválido'; end if;
 if quote_id is null then
 insert into public.quotes(company_id,client_id,address_id,asset_id,discount,subtotal,total,valid_until,notes) values(cid,(payload->>'client_id')::uuid,nullif(payload->>'address_id','')::uuid,nullif(payload->>'asset_id','')::uuid,v_discount,v_subtotal,v_subtotal-v_discount,(payload->>'valid_until')::date,payload->>'notes') returning id into qid;
 else
 perform 1 from public.quotes where id=quote_id and company_id=cid and status='draft' for update;
 if not found then raise exception 'Somente rascunhos podem ser editados'; end if;
 update public.quotes set client_id=(payload->>'client_id')::uuid,address_id=nullif(payload->>'address_id','')::uuid,asset_id=nullif(payload->>'asset_id','')::uuid,discount=v_discount,subtotal=v_subtotal,total=v_subtotal-v_discount,valid_until=(payload->>'valid_until')::date,notes=payload->>'notes' where id=quote_id and company_id=cid returning id into qid;
 delete from public.quote_items where company_id=cid and quote_items.quote_id=qid;
 end if;
 for item in select * from jsonb_array_elements(items) loop
 insert into public.quote_items(company_id,quote_id,service_id,description,quantity,unit_price) values(cid,qid,nullif(item->>'service_id','')::uuid,item->>'description',(item->>'quantity')::numeric,(item->>'unit_price')::numeric);
 end loop;
 return qid;
end $$;
create function public.quote_status(cid uuid, qid uuid, next_status text) returns void language plpgsql security definer set search_path='' as $$
declare current_status text; begin
 if not private.staff(cid) then raise exception 'Sem permissão'; end if;
 select status into current_status from public.quotes where id=qid and company_id=cid for update;
 if not ((current_status='draft' and next_status='sent') or (current_status in ('sent','viewed') and next_status in ('approved','rejected','expired'))) then raise exception 'Transição de orçamento inválida'; end if;
 if next_status='approved' and exists(select 1 from public.quotes where id=qid and valid_until<current_date) then raise exception 'Orçamento vencido'; end if;
 update public.quotes set status=next_status,sent_at=case when next_status='sent' then now() else sent_at end where id=qid and company_id=cid;
 if next_status='approved' then insert into public.notifications(company_id,title,type) values(cid,'Orçamento aprovado','quote_approved'); end if;
end $$;
create function public.convert_lead(cid uuid, lid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare lead public.leads; client uuid; begin
 if not private.staff(cid) then raise exception 'Sem permissão'; end if;
 select * into lead from public.leads where id=lid and company_id=cid for update;
 if not found or lead.status<>'won' then raise exception 'Marque o lead como ganho antes de converter'; end if;
 if lead.client_id is not null then return lead.client_id; end if;
 insert into public.clients(company_id,name,phone,source,notes) values(cid,lead.name,lead.phone,lead.source,lead.notes) returning id into client;
 update public.leads set client_id=client where id=lid;
 return client;
end $$;
create function public.create_work_order(cid uuid, payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare oid uuid; template uuid:=nullif(payload->>'template_id','')::uuid; appointment public.appointments; begin
 if not private.staff(cid) then raise exception 'Sem permissão'; end if;
 if nullif(payload->>'appointment_id','') is not null then
 select * into appointment from public.appointments where id=(payload->>'appointment_id')::uuid and company_id=cid for update;
 if not found or appointment.status in ('completed','cancelled') then raise exception 'Agendamento indisponível'; end if;
 if appointment.client_id<>(payload->>'client_id')::uuid or appointment.service_id<>(payload->>'service_id')::uuid or appointment.responsible_id<>(payload->>'responsible_id')::uuid then raise exception 'Dados diferentes do agendamento'; end if;
 end if;
 insert into public.work_orders(company_id,client_id,address_id,asset_id,service_id,responsible_id,appointment_id,template_id,scheduled_at,problem,total)
 values(cid,(payload->>'client_id')::uuid,nullif(payload->>'address_id','')::uuid,nullif(payload->>'asset_id','')::uuid,(payload->>'service_id')::uuid,(payload->>'responsible_id')::uuid,nullif(payload->>'appointment_id','')::uuid,template,(payload->>'scheduled_at')::timestamptz,payload->>'problem',coalesce((payload->>'total')::numeric,0)) returning id into oid;
 insert into public.work_order_checklists(company_id,work_order_id,label) select cid,oid,label from public.checklist_template_items where company_id=cid and template_id=template order by position;
 return oid;
end $$;
create function public.update_order(cid uuid, oid uuid, next_status text, diagnosis text, performed_service text, notes text) returns void language plpgsql security definer set search_path='' as $$
declare current_status text; appointment uuid; begin
 if not private.order_access(cid,oid) then raise exception 'Sem permissão'; end if;
 select status,appointment_id into current_status,appointment from public.work_orders where company_id=cid and id=oid for update;
 if current_status in ('completed','cancelled') then raise exception 'Ordem encerrada'; end if;
 if next_status<>current_status and not (
 (current_status in ('open','assigned') and next_status in ('on_the_way','in_progress','cancelled')) or
 (current_status='on_the_way' and next_status in ('in_progress','cancelled')) or
 (current_status='in_progress' and next_status in ('paused','completed','cancelled')) or
 (current_status='paused' and next_status in ('in_progress','cancelled'))) then raise exception 'Transição de ordem inválida'; end if;
 if next_status='cancelled' and not private.staff(cid) then raise exception 'Somente a administração pode cancelar'; end if;
 if next_status='completed' and (coalesce(trim(performed_service),'')='' or exists(select 1 from public.work_order_checklists where company_id=cid and work_order_id=oid and not completed)) then raise exception 'Descreva o serviço e conclua o checklist'; end if;
 update public.work_orders set status=next_status,diagnosis=update_order.diagnosis,performed_service=update_order.performed_service,notes=update_order.notes,completed_at=case when next_status='completed' then now() else null end where id=oid and company_id=cid;
 if next_status in ('on_the_way','in_progress','completed','cancelled') then update public.appointments set status=next_status where id=appointment and company_id=cid; end if;
end $$;
create function public.check_order_item(cid uuid, item_id uuid, checked boolean) returns void language plpgsql security definer set search_path='' as $$
declare oid uuid; begin
 select work_order_id into oid from public.work_order_checklists where id=item_id and company_id=cid;
 if not private.order_access(cid,oid) then raise exception 'Sem permissão'; end if;
 perform 1 from public.work_orders where id=oid and company_id=cid and status not in ('completed','cancelled') for update;
 if not found then raise exception 'Ordem encerrada'; end if;
 update public.work_order_checklists set completed=checked,updated_at=now() where id=item_id and company_id=cid;
end $$;
create function public.generate_recurring(cid uuid, rid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare recurrence public.recurring_services; aid uuid; duration integer; begin
 if not private.manager(cid) then raise exception 'Sem permissão'; end if;
 select * into recurrence from public.recurring_services where company_id=cid and id=rid and active for update;
 if not found then raise exception 'Recorrência não encontrada'; end if;
 select duration_minutes into duration from public.services where id=recurrence.service_id and company_id=cid;
 insert into public.appointments(company_id,client_id,service_id,responsible_id,scheduled_at,duration_minutes,notes) values(cid,recurrence.client_id,recurrence.service_id,recurrence.responsible_id,(recurrence.next_date::text||' 09:00:00-03')::timestamptz,duration,'Gerado a partir de recorrência') returning id into aid;
 update public.recurring_services set next_date=recurrence.next_date+case recurrence.frequency when 'weekly' then interval '7 days' when 'fortnightly' then interval '14 days' when 'monthly' then interval '1 month' when 'quarterly' then interval '3 months' when 'semiannual' then interval '6 months' when 'annual' then interval '1 year' else make_interval(days=>recurrence.interval_value) end where id=rid;
 return aid;
end $$;
create function public.read_notifications(cid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 update public.notifications set read_at=now() where company_id=cid and private.role(cid) is not null and (user_id=auth.uid() or (user_id is null and private.staff(cid))) and read_at is null;
end $$;

-- RPCs are private to authenticated users; each independently authorizes the caller.
revoke execute on all functions in schema public from public,anon;
grant execute on function public.onboard_company(jsonb),public.save_member(uuid,uuid,jsonb),public.accept_invitation(),public.save_quote(uuid,uuid,jsonb,jsonb),public.quote_status(uuid,uuid,text),public.convert_lead(uuid,uuid),public.create_work_order(uuid,jsonb),public.update_order(uuid,uuid,text,text,text,text),public.check_order_item(uuid,uuid,boolean),public.generate_recurring(uuid,uuid),public.read_notifications(uuid) to authenticated;
