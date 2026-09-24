import { z } from 'zod';
export type Field = {
  key: string;
  label: string;
  type?:
    | 'text'
    | 'email'
    | 'tel'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'textarea'
    | 'select'
    | 'checkbox';
  required?: boolean;
  options?: readonly string[];
  relation?: string;
  min?: number;
  step?: string;
};
export type Module = {
  title: string;
  singular: string;
  description: string;
  table: string;
  fields: Field[];
  columns: string[];
  search: string[];
  status?: string[];
};
const f = (
  key: string,
  label: string,
  type: Field['type'] = 'text',
  required = false,
  extra: Partial<Field> = {},
): Field => ({ key, label, type, required, ...extra });
const client = f('client_id', 'Cliente', 'select', true, { relation: 'clients' });
const service = f('service_id', 'Serviço', 'select', true, { relation: 'services' });
const responsible = f('responsible_id', 'Responsável', 'select', true, { relation: 'team' });
const address = f('address_id', 'Endereço', 'select', false, { relation: 'addresses' });
const asset = f('asset_id', 'Ativo', 'select', false, { relation: 'assets' });
const notes = f('notes', 'Observações', 'textarea');
export const modules: Record<string, Module> = {
  clients: {
    title: 'Clientes',
    singular: 'cliente',
    description: 'Relacionamentos que fazem seu negócio crescer.',
    table: 'clients',
    search: ['name', 'phone', 'document'],
    columns: ['name', 'phone', 'type', 'status'],
    fields: [
      f('name', 'Nome', 'text', true),
      f('phone', 'Telefone', 'tel', true),
      f('email', 'E-mail', 'email'),
      f('document', 'CPF / CNPJ'),
      f('type', 'Tipo', 'select', true, { options: ['residential', 'business'] }),
      f('source', 'Origem'),
      f('status', 'Status', 'select', true, { options: ['active', 'inactive'] }),
      notes,
    ],
    status: ['active', 'inactive'],
  },
  addresses: {
    title: 'Endereços',
    singular: 'endereço',
    description: 'Todos os locais atendidos por sua empresa.',
    table: 'client_addresses',
    search: ['street', 'city'],
    columns: ['label', 'street', 'number', 'city', 'state'],
    fields: [
      client,
      f('label', 'Identificação', 'text', true),
      f('postal_code', 'CEP'),
      f('street', 'Rua', 'text', true),
      f('number', 'Número', 'text', true),
      f('complement', 'Complemento'),
      f('district', 'Bairro'),
      f('city', 'Cidade', 'text', true),
      f('state', 'UF', 'text', true),
    ],
  },
  assets: {
    title: 'Ativos',
    singular: 'ativo',
    description: 'Equipamentos, instalações e outros itens dos seus clientes.',
    table: 'customer_assets',
    search: ['name', 'serial_number'],
    columns: ['name', 'category', 'brand', 'model'],
    fields: [
      client,
      address,
      f('name', 'Nome', 'text', true),
      f('category', 'Categoria', 'text', true),
      f('brand', 'Marca'),
      f('model', 'Modelo'),
      f('serial_number', 'Número de série'),
      f('location', 'Localização'),
      f('installed_at', 'Instalado em', 'date'),
      notes,
      f('metadata', 'Características adicionais (JSON)', 'textarea'),
    ],
  },
  services: {
    title: 'Serviços',
    singular: 'serviço',
    description: 'Seu catálogo, organizado para vender e executar melhor.',
    table: 'services',
    search: ['name', 'category'],
    columns: ['name', 'category', 'base_price', 'duration_minutes', 'active'],
    fields: [
      f('name', 'Nome', 'text', true),
      f('category', 'Categoria'),
      f('description', 'Descrição', 'textarea'),
      f('base_price', 'Preço base (R$)', 'number', true, { min: 0, step: '0.01' }),
      f('duration_minutes', 'Duração em minutos', 'number', true, { min: 5 }),
      f('active', 'Ativo', 'checkbox'),
    ],
  },
  leads: {
    title: 'Leads',
    singular: 'lead',
    description: 'Da primeira conversa à próxima oportunidade.',
    table: 'leads',
    search: ['name', 'phone'],
    columns: ['name', 'phone', 'estimated_value', 'status', 'next_action'],
    status: ['new', 'contacted', 'qualified', 'quote', 'won', 'lost'],
    fields: [
      f('name', 'Nome', 'text', true),
      f('phone', 'Telefone', 'tel', true),
      f('source', 'Origem'),
      { ...service, required: false },
      { ...responsible, required: false },
      f('estimated_value', 'Valor estimado (R$)', 'number', true, { min: 0, step: '0.01' }),
      f('status', 'Etapa', 'select', true, {
        options: ['new', 'contacted', 'qualified', 'quote', 'won', 'lost'],
      }),
      f('next_action', 'Próxima ação', 'date'),
      notes,
    ],
  },
  quotes: {
    title: 'Orçamentos',
    singular: 'orçamento',
    description: 'Propostas claras. Negócios bem encaminhados.',
    table: 'quotes',
    search: ['number'],
    columns: ['number', 'client_id', 'total', 'valid_until', 'status'],
    status: ['draft', 'sent', 'viewed', 'approved', 'rejected', 'expired'],
    fields: [
      client,
      address,
      asset,
      f('valid_until', 'Válido até', 'date', true),
      f('discount', 'Desconto (R$)', 'number', true, { min: 0, step: '0.01' }),
      notes,
    ],
  },
  calendar: {
    title: 'Agenda',
    singular: 'agendamento',
    description: 'Cada compromisso no lugar certo.',
    table: 'appointments',
    search: [],
    columns: ['scheduled_at', 'client_id', 'service_id', 'responsible_id', 'status'],
    status: ['pending', 'confirmed', 'on_the_way', 'in_progress', 'completed', 'cancelled'],
    fields: [
      client,
      address,
      service,
      responsible,
      f('quote_id', 'Orçamento aprovado', 'select', false, { relation: 'quotes' }),
      f('scheduled_at', 'Data e horário (Fortaleza)', 'datetime-local', true),
      f('duration_minutes', 'Duração em minutos', 'number', true, { min: 5 }),
      f('status', 'Status', 'select', true, { options: ['pending', 'confirmed', 'cancelled'] }),
      notes,
    ],
  },
  'work-orders': {
    title: 'Ordens de serviço',
    singular: 'ordem de serviço',
    description: 'Acompanhe cada etapa da execução.',
    table: 'work_orders',
    search: ['number'],
    columns: ['number', 'client_id', 'service_id', 'scheduled_at', 'total', 'status'],
    status: ['open', 'assigned', 'on_the_way', 'in_progress', 'paused', 'completed', 'cancelled'],
    fields: [
      client,
      address,
      asset,
      service,
      responsible,
      f('appointment_id', 'Agendamento', 'select', false, { relation: 'calendar' }),
      f('template_id', 'Checklist', 'select', false, { relation: 'checklists' }),
      f('scheduled_at', 'Data e horário (Fortaleza)', 'datetime-local', true),
      f('problem', 'Problema informado', 'textarea'),
      f('total', 'Valor (R$)', 'number', true, { min: 0, step: '0.01' }),
    ],
  },
  payments: {
    title: 'Pagamentos',
    singular: 'pagamento',
    description: 'Recebimentos e vencimentos, sem perder o controle.',
    table: 'payments',
    search: ['external_reference'],
    columns: ['client_id', 'amount', 'paid_amount', 'method', 'due_date', 'status'],
    status: ['pending', 'partially_paid', 'paid', 'refunded', 'cancelled'],
    fields: [
      client,
      f('work_order_id', 'Ordem de serviço', 'select', true, { relation: 'work-orders' }),
      f('amount', 'Valor total (R$)', 'number', true, { min: 0.01, step: '0.01' }),
      f('paid_amount', 'Valor recebido (R$)', 'number', true, { min: 0, step: '0.01' }),
      f('method', 'Forma de pagamento', 'select', true, {
        options: ['pix', 'cash', 'card', 'transfer', 'boleto', 'other'],
      }),
      f('status', 'Status', 'select', true, {
        options: ['pending', 'partially_paid', 'paid', 'refunded', 'cancelled'],
      }),
      f('due_date', 'Vencimento', 'date', true),
      f('paid_at', 'Recebido em (Fortaleza)', 'datetime-local'),
      f('external_reference', 'Referência externa'),
    ],
  },
  recurring: {
    title: 'Recorrências',
    singular: 'recorrência',
    description: 'Transforme um bom atendimento em uma relação duradoura.',
    table: 'recurring_services',
    search: [],
    columns: ['client_id', 'service_id', 'frequency', 'next_date', 'active'],
    fields: [
      client,
      asset,
      service,
      responsible,
      f('frequency', 'Frequência', 'select', true, {
        options: [
          'weekly',
          'fortnightly',
          'monthly',
          'quarterly',
          'semiannual',
          'annual',
          'custom',
        ],
      }),
      f('interval_value', 'Intervalo personalizado (dias)', 'number', true, { min: 1 }),
      f('next_date', 'Próxima visita', 'date', true),
      f('active', 'Ativa', 'checkbox'),
    ],
  },
  team: {
    title: 'Equipe',
    singular: 'membro',
    description: 'As pessoas que fazem sua operação acontecer.',
    table: 'company_members',
    search: ['name', 'email'],
    columns: ['name', 'email', 'phone', 'role', 'active'],
    fields: [
      f('name', 'Nome', 'text', true),
      f('email', 'E-mail de acesso', 'email', true),
      f('phone', 'Telefone', 'tel'),
      f('role', 'Permissão', 'select', true, { options: ['technician', 'attendant', 'admin'] }),
      f('active', 'Ativo', 'checkbox'),
    ],
  },
  'follow-ups': {
    title: 'Follow-ups',
    singular: 'follow-up',
    description: 'Nenhuma oportunidade esquecida.',
    table: 'follow_ups',
    search: ['notes'],
    columns: ['notes', 'entity_type', 'scheduled_for', 'status'],
    fields: [
      f('entity_type', 'Tipo', 'select', true, {
        options: ['lead', 'quote', 'payment', 'maintenance', 'customer', 'custom'],
      }),
      responsible,
      f('scheduled_for', 'Lembrar em', 'date', true),
      f('status', 'Status', 'select', true, { options: ['pending', 'completed', 'cancelled'] }),
      { ...notes, required: true },
    ],
  },
  checklists: {
    title: 'Checklists',
    singular: 'checklist',
    description: 'Padronize a qualidade de cada atendimento.',
    table: 'checklist_templates',
    search: ['name'],
    columns: ['name', 'created_at'],
    fields: [f('name', 'Nome do modelo', 'text', true)],
  },
  'custom-fields': {
    title: 'Campos personalizados',
    singular: 'campo',
    description: 'Adapte os registros ao seu tipo de serviço.',
    table: 'custom_fields',
    search: ['name'],
    columns: ['name', 'entity_type', 'type', 'required'],
    fields: [
      f('name', 'Nome', 'text', true),
      f('entity_type', 'Entidade', 'select', true, {
        options: ['client', 'asset', 'work_order', 'lead'],
      }),
      f('type', 'Tipo', 'select', true, {
        options: ['text', 'number', 'currency', 'date', 'checkbox', 'select', 'textarea'],
      }),
      f('required', 'Obrigatório', 'checkbox'),
      f('options', 'Opções (lista JSON para seleção)', 'textarea'),
    ],
  },
};
export const labels: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  residential: 'Residencial',
  business: 'Empresarial',
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  quote: 'Orçamento',
  won: 'Ganho',
  lost: 'Perdido',
  draft: 'Rascunho',
  sent: 'Enviado',
  viewed: 'Visualizado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Vencido',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  on_the_way: 'A caminho',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  open: 'Aberta',
  assigned: 'Atribuída',
  paused: 'Pausado',
  partially_paid: 'Parcial',
  paid: 'Pago',
  refunded: 'Estornado',
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
  boleto: 'Boleto',
  other: 'Outro',
  weekly: 'Semanal',
  fortnightly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
  custom: 'Personalizado',
  owner: 'Proprietário',
  admin: 'Administrador',
  attendant: 'Atendente',
  technician: 'Técnico',
  name: 'Nome',
  phone: 'Telefone',
  type: 'Tipo',
  status: 'Status',
  number: 'Número',
  client_id: 'Cliente',
  service_id: 'Serviço',
  responsible_id: 'Responsável',
  total: 'Valor',
  created_at: 'Criado em',
  paid_amount: 'Recebido',
  amount: 'Valor',
  method: 'Forma',
  due_date: 'Vencimento',
  scheduled_at: 'Data e horário',
  valid_until: 'Validade',
  base_price: 'Preço base',
  duration_minutes: 'Duração (min)',
  category: 'Categoria',
  brand: 'Marca',
  model: 'Modelo',
  label: 'Identificação',
  street: 'Rua',
  city: 'Cidade',
  state: 'UF',
  estimated_value: 'Valor estimado',
  next_action: 'Próxima ação',
  frequency: 'Frequência',
  next_date: 'Próxima visita',
  role: 'Permissão',
  notes: 'Observações',
  entity_type: 'Tipo',
  scheduled_for: 'Data',
  required: 'Obrigatório',
  client: 'Cliente',
  asset: 'Ativo',
  work_order: 'Ordem',
  lead: 'Lead',
  payment: 'Pagamento',
  maintenance: 'Manutenção',
  customer: 'Cliente',
  text: 'Texto',
  currency: 'Moeda',
  date: 'Data',
  checkbox: 'Checkbox',
  select: 'Seleção',
  textarea: 'Texto longo',
};
export type Row = { id: string; [key: string]: unknown };
export type Option = { id: string; label: string; client_id?: string; base_price?: number };
export function moduleSchema(module: Module) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of module.fields) {
    let schema: z.ZodType;
    if (field.type === 'checkbox') schema = z.boolean();
    else if (field.type === 'number')
      schema = z.coerce
        .number()
        .finite()
        .min(field.min ?? 0)
        .max(99999999)
        .refine(
          (n) =>
            field.step === '0.01'
              ? Math.abs(n * 100 - Math.round(n * 100)) < 0.00001
              : Number.isInteger(n),
          'Número inválido',
        );
    else if (field.relation) schema = z.uuid('Selecione um registro válido');
    else if (field.options) schema = z.enum(field.options as [string, ...string[]]);
    else if (field.type === 'email') schema = z.email('E-mail inválido');
    else if (field.type === 'tel')
      schema = z.string().regex(/^\+?[\d\s().-]{8,22}$/, 'Telefone inválido');
    else if (field.type === 'date') schema = z.iso.date('Data inválida');
    else if (field.type === 'datetime-local')
      schema = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Data e hora inválidas')
        .refine(
          (v) => z.iso.date().safeParse(v.slice(0, 10)).success && !Number.isNaN(Date.parse(v)),
          'Data inválida',
        )
        .transform((v) => `${v}-03:00`);
    else if (field.key === 'metadata' || field.key === 'options')
      schema = z
        .string()
        .max(10000)
        .transform((v, ctx) => {
          try {
            const parsed: unknown = JSON.parse(v || (field.key === 'options' ? '[]' : '{}'));
            if (
              field.key === 'options'
                ? !Array.isArray(parsed) || parsed.some((x) => typeof x !== 'string')
                : !parsed || Array.isArray(parsed) || typeof parsed !== 'object'
            )
              throw Error();
            return parsed;
          } catch {
            ctx.addIssue({ code: 'custom', message: 'JSON inválido' });
            return z.NEVER;
          }
        });
    else
      schema = z
        .string()
        .trim()
        .min(field.required ? 1 : 0, 'Campo obrigatório')
        .max(field.type === 'textarea' ? 5000 : 200);
    shape[field.key] =
      field.required ||
      field.type === 'checkbox' ||
      field.type === 'number' ||
      ['metadata', 'options'].includes(field.key)
        ? schema
        : z.preprocess((v) => (v === '' ? null : v), schema.nullable().optional());
  }
  return z.object(shape);
}
