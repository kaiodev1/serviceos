create function public.save_custom_values(cid uuid, entity text, eid uuid, field_values jsonb) returns void language plpgsql security definer set search_path='' as $$
declare definition public.custom_fields; new_value jsonb; target_table text; valid_entity boolean; begin
 if not private.manager(cid) then raise exception 'Sem permissão'; end if;
 target_table:=case entity when 'client' then 'clients' when 'asset' then 'customer_assets' when 'work_order' then 'work_orders' when 'lead' then 'leads' end;
 if target_table is null then raise exception 'Entidade inválida'; end if;
 execute format('select exists(select 1 from public.%I where company_id=$1 and id=$2)',target_table) into valid_entity using cid,eid;
 if not valid_entity then raise exception 'Entidade inválida'; end if;
 for definition in select * from public.custom_fields where company_id=cid and entity_type=entity loop
 new_value:=field_values->definition.id::text;
 if new_value is null or new_value='null'::jsonb or new_value='""'::jsonb then
 if definition.required then raise exception 'Campo obrigatório: %',definition.name; end if;
 delete from public.custom_field_values where company_id=cid and entity_id=eid and field_id=definition.id;
 else
 if definition.type='date' then perform (new_value#>>'{}')::date; end if;
 insert into public.custom_field_values(company_id,field_id,entity_id,value) values(cid,definition.id,eid,new_value) on conflict(field_id,entity_id) do update set value=excluded.value;
 end if;
 end loop;
end $$;
create function private.validate_follow_up() returns trigger language plpgsql security definer set search_path='' as $$
declare target_table text; valid_entity boolean; begin
 if new.entity_id is null then return new; end if;
 target_table:=case new.entity_type when 'lead' then 'leads' when 'quote' then 'quotes' when 'payment' then 'payments' when 'maintenance' then 'work_orders' when 'customer' then 'clients' end;
 if target_table is null then raise exception 'Tipo de referência inválido'; end if;
 execute format('select exists(select 1 from public.%I where company_id=$1 and id=$2)',target_table) into valid_entity using new.company_id,new.entity_id;
 if not valid_entity then raise exception 'Referência inválida'; end if;
 return new;
end $$;
create trigger validate_follow_up before insert or update on public.follow_ups for each row execute function private.validate_follow_up();
revoke execute on function public.save_custom_values(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.save_custom_values(uuid,text,uuid,jsonb) to authenticated;
