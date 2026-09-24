create function public.dashboard_metrics(cid uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare today date:=(now() at time zone 'America/Fortaleza')::date; result jsonb; begin
 if not private.staff(cid) then raise exception 'Sem permissão'; end if;
 select jsonb_build_object(
 'today_count',(select count(*) from public.appointments where company_id=cid and (scheduled_at at time zone 'America/Fortaleza')::date=today and status<>'cancelled'),
 'today_completed',(select count(*) from public.appointments where company_id=cid and (scheduled_at at time zone 'America/Fortaleza')::date=today and status='completed'),
 'today_progress',(select count(*) from public.appointments where company_id=cid and (scheduled_at at time zone 'America/Fortaleza')::date=today and status='in_progress'),
 'open_orders',(select count(*) from public.work_orders where company_id=cid and status not in ('completed','cancelled')),
 'pending_quotes',(select count(*) from public.quotes where company_id=cid and status in ('sent','viewed')),
 'pending_value',(select coalesce(sum(total),0) from public.quotes where company_id=cid and status in ('sent','viewed')),
 'revenue',(select coalesce(sum(paid_amount),0) from public.payments where company_id=cid and status='paid' and date_trunc('month',paid_at at time zone 'America/Fortaleza')=date_trunc('month',today::timestamp)),
 'receivable',(select coalesce(sum(amount-paid_amount),0) from public.payments where company_id=cid and status in ('pending','partially_paid')),
 'overdue',(select coalesce(sum(amount-paid_amount),0) from public.payments where company_id=cid and status in ('pending','partially_paid') and due_date<today),
 'reactivate',(select count(*) from public.clients c where c.company_id=cid and c.status='active' and exists(select 1 from public.work_orders w where w.company_id=cid and w.client_id=c.id and w.status='completed') and not exists(select 1 from public.work_orders w where w.company_id=cid and w.client_id=c.id and w.status='completed' and w.completed_at>now()-interval '180 days')),
 'conversion',(select case when count(*) filter(where sent_at is not null)=0 then 0 else round(100.0*count(*) filter(where status='approved')/count(*) filter(where sent_at is not null),1) end from public.quotes where company_id=cid)
 ) into result;
 return result;
end $$;
create function public.report_metrics(cid uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not private.staff(cid) then raise exception 'Sem permissão'; end if;
 return jsonb_build_object(
 'revenue',(select coalesce(sum(paid_amount),0) from public.payments where company_id=cid and status='paid'),
 'paid_orders',(select count(distinct work_order_id) from public.payments where company_id=cid and status='paid'),
 'completed',(select count(*) from public.work_orders where company_id=cid and status='completed'),
 'repeat_clients',(select count(*) from (select client_id from public.work_orders where company_id=cid and status='completed' group by client_id having count(*)>1) c),
 'months',coalesce((select jsonb_agg(r order by r.month_key) from (select to_char(paid_at at time zone 'America/Fortaleza','YYYY-MM') as month_key,sum(paid_amount) revenue from public.payments where company_id=cid and status='paid' and paid_at>=now()-interval '12 months' group by 1) r),'[]'),
 'services',coalesce((select jsonb_agg(r) from (select s.name,count(*) quantity,sum(w.total) value from public.work_orders w join public.services s on s.id=w.service_id and s.company_id=w.company_id where w.company_id=cid and w.status='completed' group by s.name order by count(*) desc limit 10) r),'[]'),
 'team',coalesce((select jsonb_agg(r) from (select m.name,count(*) quantity from public.work_orders w join public.company_members m on m.id=w.responsible_id and m.company_id=w.company_id where w.company_id=cid and w.status='completed' group by m.id,m.name order by count(*) desc limit 30) r),'[]')
 );
end $$;
create function private.notify_event() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_table_name='leads' and tg_op='INSERT' then insert into public.notifications(company_id,title,type) values(new.company_id,'Novo lead: '||new.name,'new_lead');
 elsif tg_table_name='payments' and new.status='paid' then
 if tg_op='INSERT' or old.status is distinct from new.status then insert into public.notifications(company_id,title,type) values(new.company_id,'Pagamento recebido','payment_received'); end if;
 end if; return new;
end $$;
create trigger lead_notification after insert on public.leads for each row execute function private.notify_event();
create trigger payment_notification after insert or update on public.payments for each row execute function private.notify_event();
-- Polymorphic values cannot reference records from other tenants.
create function private.validate_custom_value() returns trigger language plpgsql security definer set search_path='' as $$
declare definition public.custom_fields; target_table text; exists_in_company boolean; begin
 select * into definition from public.custom_fields where id=new.field_id and company_id=new.company_id;
 target_table:=case definition.entity_type when 'client' then 'clients' when 'asset' then 'customer_assets' when 'work_order' then 'work_orders' when 'lead' then 'leads' end;
 if target_table is null then raise exception 'Campo inválido'; end if;
 execute format('select exists(select 1 from public.%I where company_id=$1 and id=$2)',target_table) into exists_in_company using new.company_id,new.entity_id;
 if not exists_in_company then raise exception 'Entidade inválida'; end if;
 if definition.type in ('number','currency') and jsonb_typeof(new.value)<>'number' or definition.type='checkbox' and jsonb_typeof(new.value)<>'boolean' or definition.type in ('text','textarea','date','select') and jsonb_typeof(new.value)<>'string' then raise exception 'Tipo de campo inválido'; end if;
 if definition.type='select' and not definition.options @> jsonb_build_array(new.value) then raise exception 'Opção inválida'; end if;
 return new;
end $$;
create trigger validate_custom_value before insert or update on public.custom_field_values for each row execute function private.validate_custom_value();
-- Do not accept an unapproved quote through direct PostgREST writes either.
create function private.validate_appointment() returns trigger language plpgsql set search_path='' as $$ begin
 if new.quote_id is not null and not exists(select 1 from public.quotes where company_id=new.company_id and id=new.quote_id and client_id=new.client_id and status='approved') then raise exception 'Orçamento não aprovado'; end if;
 if tg_op='UPDATE' and (old.status in ('completed','cancelled') and new is distinct from old) then raise exception 'Agendamento encerrado'; end if;
 return new;
end $$;
create trigger validate_appointment before insert or update on public.appointments for each row execute function private.validate_appointment();
revoke execute on function public.dashboard_metrics(uuid),public.report_metrics(uuid) from public,anon;
grant execute on function public.dashboard_metrics(uuid),public.report_metrics(uuid) to authenticated;

