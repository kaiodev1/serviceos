-- ServiceOS. Apply using the Supabase SQL editor or CLI migrations.
create extension if not exists pgcrypto;
create type public.member_role as enum ('owner','admin','attendant','technician');
create table public.companies (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160), phone text not null,
 document text, city text not null, state text not null, business_type text not null, team_size text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null, created_at timestamptz not null default now());
create table public.company_members (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), user_id uuid unique references auth.users(id),
 name text not null, email text not null, phone text, role public.member_role not null default 'technician', active boolean not null default true,
 color text not null default '#0284c7', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), unique(company_id,email)
);
create unique index one_owner_per_company on public.company_members(company_id) where role='owner';
create table public.clients (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null,
 phone text not null, email text, document text, type text not null default 'residential' check(type in ('residential','business')),
 source text, notes text, status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id)
);
create table public.client_addresses (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid not null,
 label text not null default 'Principal', postal_code text, street text not null, number text not null, complement text, district text, city text not null, state text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), unique(company_id,client_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id)
);
create table public.customer_assets (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid not null, address_id uuid,
 name text not null, category text not null, brand text, model text, serial_number text, location text, installed_at date, notes text, metadata jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), unique(company_id,client_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,client_id,address_id) references public.client_addresses(company_id,client_id,id)
);
create table public.service_categories (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null, unique(company_id,id), unique(company_id,name));
create table public.services (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null, category text, description text,
 base_price numeric(12,2) not null default 0 check(base_price>=0), duration_minutes integer not null default 60 check(duration_minutes between 5 and 1440), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null, phone text not null, source text,
 service_id uuid, responsible_id uuid, client_id uuid, estimated_value numeric(12,2) not null default 0 check(estimated_value>=0), next_action date, notes text,
 status text not null default 'new' check(status in ('new','contacted','qualified','quote','won','lost')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id),
 foreign key(company_id,service_id) references public.services(company_id,id), foreign key(company_id,responsible_id) references public.company_members(company_id,id), foreign key(company_id,client_id) references public.clients(company_id,id)
);
create table public.quotes (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), number bigint generated always as identity,
 client_id uuid not null, address_id uuid, asset_id uuid, status text not null default 'draft' check(status in ('draft','sent','viewed','approved','rejected','expired')),
 discount numeric(12,2) not null default 0 check(discount>=0), subtotal numeric(12,2) not null default 0 check(subtotal>=0), total numeric(12,2) not null default 0 check(total>=0),
 valid_until date not null, notes text, sent_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), unique(company_id,client_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,client_id,address_id) references public.client_addresses(company_id,client_id,id), foreign key(company_id,client_id,asset_id) references public.customer_assets(company_id,client_id,id)
);
create table public.quote_items (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), quote_id uuid not null, service_id uuid, description text not null,
 quantity numeric(10,2) not null check(quantity>0), unit_price numeric(12,2) not null check(unit_price>=0),
 foreign key(company_id,quote_id) references public.quotes(company_id,id) on delete cascade, foreign key(company_id,service_id) references public.services(company_id,id)
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid not null, address_id uuid, service_id uuid not null, responsible_id uuid not null, quote_id uuid,
 scheduled_at timestamptz not null, duration_minutes integer not null default 60 check(duration_minutes between 5 and 1440),
 status text not null default 'pending' check(status in ('pending','confirmed','on_the_way','in_progress','completed','cancelled')), notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), unique(company_id,client_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,client_id,address_id) references public.client_addresses(company_id,client_id,id),
 foreign key(company_id,service_id) references public.services(company_id,id), foreign key(company_id,responsible_id) references public.company_members(company_id,id), foreign key(company_id,client_id,quote_id) references public.quotes(company_id,client_id,id)
);
create table public.checklist_templates (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null, created_at timestamptz not null default now(), unique(company_id,id));
create table public.checklist_template_items (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), template_id uuid not null, label text not null, position integer not null default 0, foreign key(company_id,template_id) references public.checklist_templates(company_id,id) on delete cascade);
create table public.work_orders (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), number bigint generated always as identity,
 client_id uuid not null, address_id uuid, asset_id uuid, service_id uuid not null, responsible_id uuid not null, appointment_id uuid unique, template_id uuid,
 scheduled_at timestamptz not null, status text not null default 'open' check(status in ('open','assigned','on_the_way','in_progress','paused','completed','cancelled')),
 problem text, diagnosis text, performed_service text, notes text, total numeric(12,2) not null default 0 check(total>=0), completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), unique(company_id,client_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,client_id,address_id) references public.client_addresses(company_id,client_id,id), foreign key(company_id,client_id,asset_id) references public.customer_assets(company_id,client_id,id),
 foreign key(company_id,service_id) references public.services(company_id,id), foreign key(company_id,responsible_id) references public.company_members(company_id,id), foreign key(company_id,client_id,appointment_id) references public.appointments(company_id,client_id,id), foreign key(company_id,template_id) references public.checklist_templates(company_id,id)
);
create table public.work_order_items (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), work_order_id uuid not null, description text not null, quantity numeric(10,2) not null check(quantity>0), unit_price numeric(12,2) not null check(unit_price>=0), foreign key(company_id,work_order_id) references public.work_orders(company_id,id));
create table public.work_order_checklists (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), work_order_id uuid not null, label text not null, completed boolean not null default false, updated_at timestamptz not null default now(), foreign key(company_id,work_order_id) references public.work_orders(company_id,id));
create table public.work_order_files (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), work_order_id uuid not null, type text not null check(type in ('before','during','after','document')), file_path text not null unique, mime_type text not null, uploaded_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), foreign key(company_id,work_order_id) references public.work_orders(company_id,id));
create table public.payments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid not null, work_order_id uuid not null,
 amount numeric(12,2) not null check(amount>0), paid_amount numeric(12,2) not null default 0 check(paid_amount>=0 and paid_amount<=amount),
 method text not null check(method in ('cash','pix','card','transfer','boleto','other')), status text not null default 'pending' check(status in ('pending','partially_paid','paid','refunded','cancelled')),
 due_date date not null, paid_at timestamptz, external_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id),
 check ((status='paid' and paid_amount=amount and paid_at is not null) or (status='partially_paid' and paid_amount>0 and paid_amount<amount) or (status in ('pending','refunded','cancelled') and paid_amount=0)),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,client_id,work_order_id) references public.work_orders(company_id,client_id,id)
);
create table public.recurring_services (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid not null, asset_id uuid, service_id uuid not null, responsible_id uuid not null,
 frequency text not null check(frequency in ('weekly','fortnightly','monthly','quarterly','semiannual','annual','custom')), interval_value integer not null default 1 check(interval_value between 1 and 3650), next_date date not null, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,client_id,asset_id) references public.customer_assets(company_id,client_id,id), foreign key(company_id,service_id) references public.services(company_id,id), foreign key(company_id,responsible_id) references public.company_members(company_id,id)
);
create table public.follow_ups (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), entity_type text not null check(entity_type in ('lead','quote','payment','maintenance','customer','custom')), entity_id uuid, scheduled_for date not null, responsible_id uuid not null, status text not null default 'pending' check(status in ('pending','completed','cancelled')), notes text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), foreign key(company_id,responsible_id) references public.company_members(company_id,id));
create table public.notifications (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), user_id uuid references auth.users(id), title text not null, type text not null, read_at timestamptz, created_at timestamptz not null default now());
create table public.activity_logs (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), user_id uuid references auth.users(id), entity_type text not null, entity_id uuid not null, action text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create table public.custom_fields (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null, entity_type text not null check(entity_type in ('client','asset','work_order','lead')), type text not null check(type in ('text','number','currency','date','checkbox','select','textarea')), options jsonb not null default '[]', required boolean not null default false, unique(company_id,id));
create table public.custom_field_values (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), field_id uuid not null, entity_id uuid not null, value jsonb not null, unique(field_id,entity_id), foreign key(company_id,field_id) references public.custom_fields(company_id,id));
create table public.conversations (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid, phone text not null, created_at timestamptz not null default now(), unique(company_id,id), foreign key(company_id,client_id) references public.clients(company_id,id));
create table public.messages (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), conversation_id uuid not null, direction text not null check(direction in ('inbound','outbound')), type text not null, content text not null, provider_message_id text, status text not null, created_at timestamptz not null default now(), foreign key(company_id,conversation_id) references public.conversations(company_id,id));
create table public.automation_rules (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null, trigger text not null, conditions jsonb not null default '{}', actions jsonb not null default '[]', active boolean not null default false, unique(company_id,id));
create table public.automation_runs (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), rule_id uuid not null, status text not null, created_at timestamptz not null default now(), foreign key(company_id,rule_id) references public.automation_rules(company_id,id));

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.role(cid uuid) returns public.member_role language sql stable security definer set search_path='' as $$ select role from public.company_members where company_id=cid and user_id=auth.uid() and active $$;
create function private.member_id(cid uuid) returns uuid language sql stable security definer set search_path='' as $$ select id from public.company_members where company_id=cid and user_id=auth.uid() and active $$;
create function private.staff(cid uuid) returns boolean language sql stable security definer set search_path='' as $$ select coalesce(private.role(cid) in ('owner','admin','attendant'),false) $$;
create function private.manager(cid uuid) returns boolean language sql stable security definer set search_path='' as $$ select coalesce(private.role(cid) in ('owner','admin'),false) $$;
create function private.order_access(cid uuid, oid uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.work_orders where company_id=cid and id=oid and (private.staff(cid) or responsible_id=private.member_id(cid))) $$;
create function private.client_access(cid uuid, client uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.staff(cid) or exists(select 1 from public.work_orders where company_id=cid and client_id=client and responsible_id=private.member_id(cid)) or exists(select 1 from public.appointments where company_id=cid and client_id=client and responsible_id=private.member_id(cid)) $$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

alter table public.companies enable row level security;
create policy company_read on public.companies for select to authenticated using(private.role(id) is not null);
create policy company_update on public.companies for update to authenticated using(private.manager(id)) with check(private.manager(id));
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
alter table public.company_members enable row level security;
create policy member_read on public.company_members for select to authenticated using(private.role(company_id) is not null);
-- Membership writes are only exposed by narrowly scoped RPCs below.

do $$ declare t text; begin
 foreach t in array array['clients','client_addresses','customer_assets','service_categories','services','leads','quotes','quote_items','appointments','checklist_templates','checklist_template_items','work_orders','work_order_items','work_order_checklists','work_order_files','payments','recurring_services','follow_ups','notifications','activity_logs','custom_fields','custom_field_values','conversations','messages','automation_rules','automation_runs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create index on public.%I(company_id)',t);
 if t not in ('notifications','activity_logs') then
 execute format('create policy staff_read on public.%I for select to authenticated using(private.staff(company_id))',t);
 end if;
 end loop;
 foreach t in array array['clients','client_addresses','customer_assets','leads','appointments','follow_ups'] loop
 execute format('create policy staff_insert on public.%I for insert to authenticated with check(private.staff(company_id))',t);
 execute format('create policy staff_update on public.%I for update to authenticated using(private.staff(company_id)) with check(private.staff(company_id))',t);
 execute format('create policy manager_delete on public.%I for delete to authenticated using(private.manager(company_id))',t);
 end loop;
 foreach t in array array['services','service_categories','checklist_templates','checklist_template_items','payments','recurring_services','custom_fields','custom_field_values'] loop
 execute format('create policy manager_write on public.%I for all to authenticated using(private.manager(company_id)) with check(private.manager(company_id))',t);
 end loop;
end $$;
create policy technician_clients on public.clients for select to authenticated using(private.client_access(company_id,id));
create policy technician_addresses on public.client_addresses for select to authenticated using(private.client_access(company_id,client_id));
create policy technician_assets on public.customer_assets for select to authenticated using(private.client_access(company_id,client_id));
create policy member_services on public.services for select to authenticated using(private.role(company_id) is not null);
create policy assigned_appointments on public.appointments for select to authenticated using(responsible_id=private.member_id(company_id));
create policy assigned_orders on public.work_orders for select to authenticated using(responsible_id=private.member_id(company_id));
create policy assigned_checklists on public.work_order_checklists for select to authenticated using(private.order_access(company_id,work_order_id));
create policy assigned_files on public.work_order_files for select to authenticated using(private.order_access(company_id,work_order_id));
create policy assigned_materials on public.work_order_items for select to authenticated using(private.order_access(company_id,work_order_id));
create policy files_insert on public.work_order_files for insert to authenticated with check(private.order_access(company_id,work_order_id) and uploaded_by=auth.uid() and file_path like company_id::text||'/'||work_order_id::text||'/%');
create policy notification_read on public.notifications for select to authenticated using(private.role(company_id) is not null and (user_id=auth.uid() or (user_id is null and private.staff(company_id))));
create policy activity_read on public.activity_logs for select to authenticated using(private.staff(company_id) or (entity_type='work_orders' and private.order_access(company_id,entity_id)));

create index on public.clients(company_id,phone);
create index on public.work_orders(company_id,responsible_id,scheduled_at);
create index on public.appointments(company_id,responsible_id,scheduled_at);
create index on public.quotes(company_id,status,created_at);
create index on public.payments(company_id,status,due_date);
create index on public.recurring_services(company_id,next_date) where active;
create index on public.follow_ups(company_id,scheduled_for) where status='pending';
create index on public.activity_logs(company_id,entity_type,entity_id,created_at desc);

create function private.audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.activity_logs(company_id,user_id,entity_type,entity_id,action,metadata) values(new.company_id,auth.uid(),tg_table_name,new.id,lower(tg_op),case when tg_op='UPDATE' then jsonb_build_object('status',to_jsonb(new)->>'status','previous_status',to_jsonb(old)->>'status') else '{}'::jsonb end);
 return new;
end $$;
create function private.touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['clients','leads','quotes','appointments','work_orders','payments','recurring_services','follow_ups'] loop
 execute format('create trigger audit after insert or update on public.%I for each row execute function private.audit()',t);
 end loop;
 foreach t in array array['companies','company_members','clients','client_addresses','customer_assets','services','leads','quotes','appointments','work_orders','payments','recurring_services','follow_ups'] loop
 execute format('create trigger touch before update on public.%I for each row execute function private.touch()',t);
 end loop;
end $$;

-- Default grants do not replace RLS; no anonymous access to operational tables.
revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;
