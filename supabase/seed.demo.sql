-- DEVELOPMENT ONLY. Create and confirm a dedicated Auth user first.
-- In SQL Editor, run: select set_config('serviceos.demo_user_id', 'AUTH-USER-UUID', false);
-- Then execute this file. It refuses an account already linked to a company.
begin;
do $$
declare uid uuid:=nullif(current_setting('serviceos.demo_user_id',true),'')::uuid;
 cid uuid; clients uuid[]:='{}'; members uuid[]:='{}'; services uuid[]:='{}';
 client uuid; member uuid; service uuid; address uuid; asset uuid; quote uuid; appointment uuid; work_order uuid; template uuid; i integer;
 names text[]:=array['Ana Exemplo','Bruno Demonstração','Carla Fictícia','Oficina Horizonte Demo','Condomínio Jardim Demo','Diego Exemplo','Escola Modelo Demo','Elisa Fictícia','Mercado Central Demo','Fabiana Exemplo'];
 catalog text[]:=array['Manutenção de climatização','Instalação elétrica','Limpeza de piscina','Instalação de câmeras','Inspeção solar','Reparo hidráulico','Limpeza profissional','Controle de pragas','Manutenção de portão','Visita técnica'];
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Defina serviceos.demo_user_id com um usuário Auth exclusivo para demonstração'; end if;
 if exists(select 1 from public.company_members where user_id=uid) then raise exception 'O seed exige uma conta sem empresa. Não mistura demonstração com dados existentes.'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 cid:=public.onboard_company(jsonb_build_object('name','Demo ServiceOS','phone','85900000000','city','Fortaleza','state','CE','business_type','Serviços diversos — demonstração','team_size','2-5','services','[]'::jsonb));
 select id into member from public.company_members where user_id=uid;
 members:=array_append(members,member);
 for i in 2..5 loop
 member:=public.save_member(cid,null,jsonb_build_object('name','Técnico Demo '||i,'email','tecnico'||i||'@example.test','role','technician','phone','8590000000'||i));members:=array_append(members,member);
 end loop;
 insert into public.checklist_templates(company_id,name) values(cid,'Checklist de atendimento — demonstração') returning id into template;
 insert into public.checklist_template_items(company_id,template_id,label,position) values(cid,template,'Inspeção visual',1),(cid,template,'Verificar segurança',2),(cid,template,'Teste final',3);
 for i in 1..10 loop
 insert into public.services(company_id,name,category,base_price,duration_minutes) values(cid,catalog[i],'Demonstração',100+i*25,60) returning id into service;services:=array_append(services,service);
 insert into public.clients(company_id,name,phone,type,source,notes) values(cid,names[i],'859000000'||lpad(i::text,2,'0'),case when i in (4,5,7,9) then 'business' else 'residential' end,'Seed de desenvolvimento','Registro fictício de demonstração') returning id into client;clients:=array_append(clients,client);
 insert into public.client_addresses(company_id,client_id,street,number,district,city,state,postal_code) values(cid,client,'Rua de Demonstração',i::text,'Bairro Exemplo','Fortaleza','CE','60000000') returning id into address;
 insert into public.customer_assets(company_id,client_id,address_id,name,category,metadata) values(cid,client,address,'Ativo demonstrativo '||i,catalog[i],jsonb_build_object('demonstracao',true)) returning id into asset;
 quote:=public.save_quote(cid,null,jsonb_build_object('client_id',client,'address_id',address,'asset_id',asset,'valid_until',current_date+30,'discount',0,'notes','Proposta fictícia de demonstração'),jsonb_build_array(jsonb_build_object('service_id',service,'description',catalog[i],'quantity',1,'unit_price',100+i*25)));
 perform public.quote_status(cid,quote,'sent');
 if i<=7 then
 perform public.quote_status(cid,quote,'approved');
 insert into public.appointments(company_id,client_id,address_id,service_id,responsible_id,quote_id,scheduled_at,duration_minutes) values(cid,client,address,service,members[1+(i%5)],quote,((current_date+(case when i<=5 then 0 else 1 end))::text||' '||(8+i)::text||':00:00-03')::timestamptz,60) returning id into appointment;
 work_order:=public.create_work_order(cid,jsonb_build_object('client_id',client,'address_id',address,'asset_id',asset,'service_id',service,'responsible_id',members[1+(i%5)],'appointment_id',appointment,'template_id',template,'scheduled_at',((current_date::text)||' '||(8+i)::text||':00:00-03'),'total',100+i*25,'problem','Atendimento de demonstração'));
 if i<=3 then
 perform public.update_order(cid,work_order,'in_progress','Diagnóstico de demonstração','','');
 update public.work_order_checklists set completed=true where work_order_id=work_order;
 perform public.update_order(cid,work_order,'completed','Diagnóstico de demonstração','Serviço fictício concluído','');
 insert into public.payments(company_id,client_id,work_order_id,amount,paid_amount,method,status,due_date,paid_at) values(cid,client,work_order,100+i*25,100+i*25,'pix','paid',current_date,now());
 elsif i=4 then perform public.update_order(cid,work_order,'in_progress','','','');
 end if;
 insert into public.recurring_services(company_id,client_id,asset_id,service_id,responsible_id,frequency,next_date) values(cid,client,asset,service,members[1+(i%5)],case when i=3 then 'weekly' else 'monthly' end,current_date+i);
 end if;
 insert into public.leads(company_id,name,phone,source,service_id,responsible_id,estimated_value,status,next_action,notes) values(cid,'Lead de demonstração '||i,'859100000'||lpad(i::text,2,'0'),'Indicação',service,members[1],100+i*25,(array['new','contacted','qualified','quote','won','lost'])[1+(i%6)],current_date,'Pessoa fictícia');
 end loop;
 insert into public.follow_ups(company_id,entity_type,scheduled_for,responsible_id,notes) values(cid,'custom',current_date,members[1],'Ligar para um cliente de demonstração');
end $$;
commit;
