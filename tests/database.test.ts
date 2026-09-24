import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const ids = {
  a: '11111111-1111-4111-8111-111111111111',
  b: '22222222-2222-4222-8222-222222222222',
  tech: '33333333-3333-4333-8333-333333333333',
  attendant: '44444444-4444-4444-8444-444444444444',
};
let db: PGlite,
  cidA: string,
  cidB: string,
  clientA: string,
  clientB: string,
  serviceA: string,
  memberA: string,
  techMember: string,
  orderId: string;
async function asUser(id: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
async function scalar<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<Record<string, T>>(sql, params);
  return Object.values(result.rows[0])[0];
}
async function rpc<T>(name: string, args: unknown[]): Promise<T> {
  return scalar<T>(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')})`, args);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,owner_id text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
    grant execute on function storage.foldername(text) to authenticated;`);
  for (const file of [
    '202609240001_core.sql',
    '202609240002_workflows.sql',
    '202609240003_storage.sql',
    '202609240004_insights.sql',
    '202609240005_custom_values.sql',
  ]) {
    const sql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
  }
  for (const [key, id] of Object.entries(ids))
    await db.query(
      'insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',
      [id, `${key}@example.test`, JSON.stringify({ name: key })],
    );
  const company = (name: string) =>
    JSON.stringify({
      name,
      phone: '85999999999',
      city: 'Fortaleza',
      state: 'CE',
      business_type: 'Serviços',
      team_size: '2-5',
      services: ['Manutenção'],
    });
  await asUser(ids.a);
  cidA = await rpc('onboard_company', [company('Empresa A')]);
  clientA = await scalar(
    'insert into public.clients(company_id,name,phone) values($1,$2,$3) returning id',
    [cidA, 'Cliente A', '85999999999'],
  );
  serviceA = await scalar('select id from public.services where company_id=$1', [cidA]);
  memberA = await scalar('select id from public.company_members where user_id=$1', [ids.a]);
  techMember = await rpc('save_member', [
    cidA,
    null,
    JSON.stringify({ name: 'Técnico', email: 'tech@example.test', role: 'technician' }),
  ]);
  await rpc('save_member', [
    cidA,
    null,
    JSON.stringify({ name: 'Atendente', email: 'attendant@example.test', role: 'attendant' }),
  ]);
  await asUser(ids.tech);
  expect(await rpc('accept_invitation', [])).toBe(true);
  await asUser(ids.attendant);
  await rpc('accept_invitation', []);
  await asUser(ids.b);
  cidB = await rpc('onboard_company', [company('Empresa B')]);
  clientB = await scalar(
    'insert into public.clients(company_id,name,phone) values($1,$2,$3) returning id',
    [cidB, 'Cliente B', '85988888888'],
  );
});
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL real: RLS e fluxos transacionais', () => {
  it('isola leitura, inclusão, alteração e exclusão entre empresas', async () => {
    await asUser(ids.a);
    expect(
      await scalar<number>('select count(*)::int from public.clients where id=$1', [clientB]),
    ).toBe(0);
    await expect(
      db.query('insert into public.clients(company_id,name,phone) values($1,$2,$3)', [
        cidB,
        'Ataque',
        '85999999999',
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query('update public.clients set name=$1 where id=$2 returning id', [
          'Ataque',
          clientB,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('delete from public.clients where id=$1 returning id', [clientB])).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        'insert into public.client_addresses(company_id,client_id,street,number,city,state) values($1,$2,$3,$4,$5,$6)',
        [cidA, clientB, 'Rua', '1', 'Fortaleza', 'CE'],
      ),
    ).rejects.toThrow();
  });
  it('não permite escalada de privilégios nem falsificação de auditoria', async () => {
    await asUser(ids.tech);
    expect(
      (
        await db.query(
          "update public.company_members set role='owner' where user_id=$1 returning id",
          [ids.tech],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      rpc('save_member', [
        cidA,
        null,
        JSON.stringify({ name: 'X', email: 'x@example.test', role: 'admin' }),
      ]),
    ).rejects.toThrow('Sem permissão');
    await expect(
      db.query(
        "insert into public.activity_logs(company_id,user_id,entity_type,entity_id,action) values($1,$2,'clients',$3,'insert')",
        [cidA, ids.a, clientA],
      ),
    ).rejects.toThrow();
    await asUser(ids.attendant);
    await expect(
      db.query('insert into public.services(company_id,name) values($1,$2)', [cidA, 'Bloqueado']),
    ).rejects.toThrow();
  });
  it('cria e edita proposta atomicamente, soma itens, protege status e cliente', async () => {
    await asUser(ids.a);
    const payload = { client_id: clientA, valid_until: '2030-12-31', discount: 5 };
    const items = [{ description: 'Visita', service_id: serviceA, quantity: 2, unit_price: 75.1 }];
    const qid = await rpc<string>('save_quote', [
      cidA,
      null,
      JSON.stringify(payload),
      JSON.stringify(items),
    ]);
    expect(Number(await scalar('select total from public.quotes where id=$1', [qid]))).toBe(145.2);
    await rpc('save_quote', [
      cidA,
      qid,
      JSON.stringify({ ...payload, discount: 10 }),
      JSON.stringify(items),
    ]);
    expect(Number(await scalar('select total from public.quotes where id=$1', [qid]))).toBe(140.2);
    await expect(rpc('quote_status', [cidA, qid, 'approved'])).rejects.toThrow();
    await rpc('quote_status', [cidA, qid, 'sent']);
    await rpc('quote_status', [cidA, qid, 'approved']);
    await expect(
      rpc('save_quote', [cidA, qid, JSON.stringify(payload), JSON.stringify(items)]),
    ).rejects.toThrow();
    const before = await scalar<number>('select count(*)::int from public.quotes');
    await expect(
      rpc('save_quote', [
        cidA,
        null,
        JSON.stringify({ ...payload, client_id: clientB }),
        JSON.stringify(items),
      ]),
    ).rejects.toThrow();
    expect(await scalar<number>('select count(*)::int from public.quotes')).toBe(before);
    await asUser(ids.b);
    await expect(rpc('quote_status', [cidA, qid, 'rejected'])).rejects.toThrow('Sem permissão');
  });
  it('copia checklist, restringe técnico à sua ordem e exige execução completa', async () => {
    await asUser(ids.a);
    const tid = await scalar<string>(
      "insert into public.checklist_templates(company_id,name) values($1,'Segurança') returning id",
      [cidA],
    );
    await db.query(
      "insert into public.checklist_template_items(company_id,template_id,label) values($1,$2,'Teste final')",
      [cidA, tid],
    );
    orderId = await rpc('create_work_order', [
      cidA,
      JSON.stringify({
        client_id: clientA,
        service_id: serviceA,
        responsible_id: techMember,
        scheduled_at: '2026-09-24T10:00:00-03:00',
        template_id: tid,
        total: 100,
      }),
    ]);
    const other = await rpc<string>('create_work_order', [
      cidA,
      JSON.stringify({
        client_id: clientA,
        service_id: serviceA,
        responsible_id: memberA,
        scheduled_at: '2026-09-24T10:00:00-03:00',
        total: 100,
      }),
    ]);
    const checklist = await scalar<string>(
      'select id from public.work_order_checklists where work_order_id=$1',
      [orderId],
    );
    await asUser(ids.tech);
    expect(await scalar<number>('select count(*)::int from public.work_orders')).toBe(1);
    await expect(rpc('update_order', [cidA, other, 'in_progress', '', '', ''])).rejects.toThrow(
      'Sem permissão',
    );
    expect(
      (await db.query('update public.work_orders set total=0 where id=$1 returning id', [orderId]))
        .rows,
    ).toHaveLength(0);
    await rpc('update_order', [cidA, orderId, 'in_progress', 'Inspeção', '', '']);
    await expect(
      rpc('update_order', [cidA, orderId, 'completed', 'Inspeção', 'Serviço executado', '']),
    ).rejects.toThrow('checklist');
    await rpc('check_order_item', [cidA, checklist, true]);
    await rpc('update_order', [cidA, orderId, 'completed', 'Inspeção', 'Serviço executado', '']);
    await expect(rpc('check_order_item', [cidA, checklist, false])).rejects.toThrow('encerrada');
    await expect(rpc('update_order', [cidA, orderId, 'in_progress', '', '', ''])).rejects.toThrow(
      'encerrada',
    );
  });
  it('valida pagamentos e calcula receita sem misturar empresas', async () => {
    await asUser(ids.a);
    await expect(
      db.query(
        "insert into public.payments(company_id,client_id,work_order_id,amount,paid_amount,method,status,due_date) values($1,$2,$3,100,50,'pix','paid','2026-09-24')",
        [cidA, clientA, orderId],
      ),
    ).rejects.toThrow();
    await db.query(
      "insert into public.payments(company_id,client_id,work_order_id,amount,paid_amount,method,status,due_date,paid_at) values($1,$2,$3,100,100,'pix','paid','2026-09-24',now())",
      [cidA, clientA, orderId],
    );
    const report = await rpc<{ revenue: number; paid_orders: number }>('report_metrics', [cidA]);
    expect(Number(report.revenue)).toBe(100);
    expect(report.paid_orders).toBe(1);
    await asUser(ids.b);
    await expect(rpc('report_metrics', [cidA])).rejects.toThrow('Sem permissão');
  });
  it('gera recorrência e avança a data em uma única transação', async () => {
    await asUser(ids.a);
    const rid = await scalar<string>(
      "insert into public.recurring_services(company_id,client_id,service_id,responsible_id,frequency,next_date) values($1,$2,$3,$4,'monthly','2026-01-31') returning id",
      [cidA, clientA, serviceA, techMember],
    );
    const aid = await rpc<string>('generate_recurring', [cidA, rid]);
    expect(aid).toBeTruthy();
    expect(
      String(
        await scalar('select next_date::text from public.recurring_services where id=$1', [rid]),
      ),
    ).toBe('2026-02-28');
    await asUser(ids.b);
    await expect(rpc('generate_recurring', [cidA, rid])).rejects.toThrow('Sem permissão');
  });
  it('bloqueia campos personalizados apontando para outra empresa', async () => {
    await asUser(ids.a);
    const fid = await scalar<string>(
      "insert into public.custom_fields(company_id,name,entity_type,type) values($1,'Patrimônio','client','text') returning id",
      [cidA],
    );
    await expect(
      db.query(
        'insert into public.custom_field_values(company_id,field_id,entity_id,value) values($1,$2,$3,\'"x"\')',
        [cidA, fid, clientB],
      ),
    ).rejects.toThrow('Entidade inválida');
  });
  it('salva e limpa valores personalizados com validação transacional', async () => {
    await asUser(ids.a);
    const field = await scalar<string>(
      "insert into public.custom_fields(company_id,name,entity_type,type,required) values($1,'Volume','client','number',true) returning id",
      [cidA],
    );
    await rpc('save_custom_values', [cidA, 'client', clientA, JSON.stringify({ [field]: 12 })]);
    expect(
      Number(
        await scalar(
          'select value from public.custom_field_values where field_id=$1 and entity_id=$2',
          [field, clientA],
        ),
      ),
    ).toBe(12);
    await expect(rpc('save_custom_values', [cidA, 'client', clientA, '{}'])).rejects.toThrow(
      'obrigatório',
    );
    await expect(
      rpc('save_custom_values', [cidA, 'client', clientB, JSON.stringify({ [field]: 15 })]),
    ).rejects.toThrow('Entidade inválida');
    await expect(
      rpc('save_custom_values', [cidA, 'client', clientA, JSON.stringify({ [field]: 'texto' })]),
    ).rejects.toThrow('Tipo');
  });
  it('isola caminhos e leituras de arquivos privados', async () => {
    await asUser(ids.a);
    const path = `${cidA}/${orderId}/foto-teste`;
    await db.query(
      "insert into storage.objects(bucket_id,name,owner_id) values('work-order-files',$1,$2)",
      [path, ids.a],
    );
    expect(await scalar<number>('select count(*)::int from storage.objects')).toBe(0);
    await db.query(
      "insert into public.work_order_files(company_id,work_order_id,type,file_path,mime_type) values($1,$2,'after',$3,'image/jpeg')",
      [cidA, orderId, path],
    );
    expect(await scalar<number>('select count(*)::int from storage.objects')).toBe(1);
    await asUser(ids.b);
    expect(await scalar<number>('select count(*)::int from storage.objects')).toBe(0);
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name,owner_id) values('work-order-files',$1,$2)",
        [`${cidA}/${orderId}/intruso`, ids.b],
      ),
    ).rejects.toThrow();
    await asUser(ids.tech);
    expect(await scalar<number>('select count(*)::int from storage.objects')).toBe(1);
  });
  it('rejeita vínculo de follow-up externo à empresa', async () => {
    await asUser(ids.a);
    await expect(
      db.query(
        "insert into public.follow_ups(company_id,entity_type,entity_id,scheduled_for,responsible_id,notes) values($1,'customer',$2,current_date,$3,'Teste')",
        [cidA, clientB, memberA],
      ),
    ).rejects.toThrow('Referência inválida');
  });
  it('executa o seed separado com dez clientes e cinco membros', async () => {
    await db.exec('reset role');
    const uid = '55555555-5555-4555-8555-555555555555';
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,'demo@example.test',now())",
      [uid],
    );
    await db.query("select set_config('serviceos.demo_user_id',$1,false)", [uid]);
    await db.exec(await readFile(new URL('../supabase/seed.demo.sql', import.meta.url), 'utf8'));
    const company = await scalar<string>(
      'select company_id from public.company_members where user_id=$1',
      [uid],
    );
    expect(
      await scalar<number>('select count(*)::int from public.clients where company_id=$1', [
        company,
      ]),
    ).toBe(10);
    expect(
      await scalar<number>('select count(*)::int from public.company_members where company_id=$1', [
        company,
      ]),
    ).toBe(5);
    expect(
      await scalar<number>('select count(*)::int from public.services where company_id=$1', [
        company,
      ]),
    ).toBe(10);
  });
});
