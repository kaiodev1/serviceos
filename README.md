# ServiceOS

**Sua operação. Em um só lugar.** Gestão multiempresa para prestadores de serviços, com dados persistidos em PostgreSQL/Supabase. A aplicação não usa um backend simulado nem carrega dados fictícios automaticamente.

## Requisitos

- Node.js 22 ou superior e npm.
- Um projeto Supabase, ou Supabase CLI com Docker para desenvolvimento local.
- Confirmação de e-mail habilitada no Supabase Auth.

## Instalação e desenvolvimento

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
# Preencha .env.local e aplique as migrations abaixo.
npm.cmd run dev
```

Abra http://localhost:3000. No Windows, `npm.cmd` evita a restrição de execução de `npm.ps1`. Nos demais sistemas use `npm` normalmente. Sem configuração, a aplicação exibe uma tela de instalação em `/setup`.

### Se o projeto não iniciar no Windows

Se aparecer **`'next' não é reconhecido`**, as dependências estão ausentes ou incompletas. Pare o servidor com `Ctrl+C` no terminal em que ele está aberto e execute, na pasta do projeto:

```powershell
npm.cmd ci
npm.cmd run dev
```

Aguarde o primeiro comando terminar antes de iniciar o segundo. Se `npm.cmd ci` informar `EPERM` em um arquivo `.node`, feche os servidores deste projeto e tente novamente: um processo pode estar mantendo o arquivo em uso. Não reinstale dependências enquanto `next dev` estiver executando.

Para desenvolvimento, use `npm.cmd run dev`. O comando `npm.cmd start` exige um build prévio com `npm.cmd run build`. Preencha as variáveis no `.env.local`; `.env.example` é apenas o modelo.

## Variáveis de ambiente

| Variável                        | Uso                                                       |
| ------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do projeto Supabase                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do projeto, sujeita a RLS              |
| `NEXT_PUBLIC_SITE_URL`          | Origem da aplicação, inicialmente `http://localhost:3000` |

Nenhuma service role key é necessária no servidor web. Não coloque segredos em variáveis `NEXT_PUBLIC_*`. Configure as variáveis antes do build de produção.

## Supabase e migrations

Execute os arquivos de `supabase/migrations` em ordem no SQL Editor de um projeto novo, ou aplique-os com `supabase db push` depois de vincular um projeto com a CLI:

1. `202609240001_core.sql`: tabelas, índices, isolamento por empresa, perfis, permissões e auditoria.
2. `202609240002_workflows.sql`: onboarding, vínculo de membros, orçamentos, conversão de leads, criação/execução de OS e recorrência.
3. `202609240003_storage.sql`: bucket privado e políticas dos arquivos.
4. `202609240004_insights.sql`: métricas, relatórios, notificações e validação de referências.
5. `202609240005_custom_values.sql`: gravação transacional dos campos personalizados e validação dos vínculos de follow-up.

No painel Auth, configure Site URL e Redirect URLs para a origem da aplicação e `/auth/callback`. Em produção configure SMTP e os controles de autenticação do projeto. O fluxo usa confirmação PKCE com cookies, conforme a [documentação de SSR do Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client). A renovação dos tokens usa a convenção [Proxy do Next.js](https://nextjs.org/docs/app/getting-started/proxy).

### Primeiro acesso

1. Crie uma conta em `/register`, confirme o e-mail e entre.
2. Complete as quatro etapas do onboarding.
3. Em Equipe, cadastre o nome, e-mail e perfil do funcionário.
4. Compartilhe o endereço `/register` com o funcionário. Ao cadastrar e confirmar o mesmo e-mail, ele assume o vínculo pendente criado pela empresa. Não há envio automático de convite.
5. Cadastre cliente, endereço, ativo e serviço. Crie um checklist em Configurações → Checklists e adicione seus itens.
6. Crie um orçamento com os itens, marque-o como enviado e aprove. “Marcar como enviado” registra o status; não envia e-mail ou WhatsApp.
7. No orçamento aprovado, crie um agendamento, atribua o responsável e gere a OS. Escolha o checklist na criação da ordem.
8. O técnico acessa `/field`, inicia o serviço, preenche o checklist, descreve o trabalho e anexa fotos.
9. Finalize a OS. O administrador registra o pagamento manual e cria a recorrência.
10. Em uma recorrência, “Gerar próxima visita” cria um agendamento e avança a próxima data, atomicamente.

Um usuário pertence a uma empresa neste MVP. O proprietário administra os perfis; administradores não podem promover outros administradores ou alterar o proprietário. Técnicos não podem editar preço, cliente, responsável ou permissões.

## Seed de desenvolvimento

O seed é **opt-in**, separado das migrations e desabilitado no Supabase CLI. Use um projeto de desenvolvimento.

Crie e confirme um usuário Auth exclusivo para demonstração, sem empresa. No SQL Editor, execute:

```sql
select set_config('serviceos.demo_user_id', 'UUID-DO-USUARIO-DEMO', false);
-- Execute em seguida o conteúdo de supabase/seed.demo.sql na mesma sessão.
```

O seed recusa usuários já vinculados. Cria **Demo ServiceOS**, dez clientes, cinco membros, dez serviços de diferentes áreas, endereços, ativos, leads, propostas, agenda, OS, checklist, pagamentos, recorrências e follow-up. As contas dos outros quatro membros são vínculos pendentes fictícios, sem senhas. Não cria arquivos falsos no Storage.

## Funcionalidades deste ciclo

- Autenticação por e-mail/senha e onboarding transacional.
- Sidebar responsiva, pesquisa global, ações rápidas e notificações.
- Cadastros editáveis, busca, filtros, paginação e estados de carregamento/erro/vazio.
- Clientes, vários endereços, ativos genéricos com metadata JSON, catálogo e equipe.
- Leads em lista/pipeline e conversão idempotente em cliente. A etapa é alterada pelo formulário de edição.
- Propostas com itens dinâmicos, cálculos em centavos no cliente e `numeric` no banco, desconto, aprovação, duplicação e impressão.
- Agenda diária, semanal, mensal e lista, com filtros de responsável, serviço e status.
- Criação atômica de OS/checklist, transições protegidas, atendimento mobile e arquivos privados com links temporários.
- Registro manual de pagamentos, recorrências por calendário e follow-ups.
- Campos personalizados tipados, editáveis por administradores nas entidades correspondentes.
- Dashboard e relatórios agregados no banco, sem depender da paginação da interface.
- Auditoria automática e notificações de novos leads, aprovações e pagamentos.

## Limites e próximos incrementos

Este é um primeiro ciclo funcional, não uma declaração de prontidão para produção. É necessário validar login, callbacks, RLS via API e Storage no projeto Supabase escolhido antes de disponibilizá-lo a usuários.

- WhatsApp, IA e gateway financeiro têm somente interfaces de integração. Nenhum provedor está ativo.
- Assinaturas, cobrança SaaS, envio de convites, recuperação de senha e geração de PDF no servidor não foram implementados. A proposta pode ser impressa pelo navegador.
- Recorrências são geradas por ação explícita. Não há scheduler, motor de automação, mensagens automáticas ou alertas periódicos de vencimentos.
- O pipeline permite editar a etapa; não há drag-and-drop. Não há bloqueio automático de conflitos de agenda.
- Agenda limitada a 500 registros por período; seletores a 200 opções; abas do cliente a 50 registros recentes. Listas principais são paginadas em 25 registros. Pesquisa incremental nos seletores é uma evolução necessária para bases maiores.
- Campos personalizados obrigatórios são validados ao salvar sua seção, não impedem o cadastro inicial da entidade. A seção é administrativa; técnicos usam checklist e observações.
- Materiais, categorias normalizadas, conversas e automações têm tabelas preparadas, mas não interfaces completas.
- Horários operacionais usam `America/Fortaleza` / UTC−03. Não há configuração de fuso por empresa neste ciclo.
- Prefira inativar/cancelar registros. Exclusão definitiva e transferência de propriedade não são expostas na interface.

## Arquitetura resumida

Next.js App Router, React, TypeScript strict, Tailwind CSS, componentes locais reutilizáveis, Lucide, React Hook Form e Zod. Server Components fazem leituras; Server Actions validam mutações. Fluxos atômicos e autorização crítica ficam em funções PostgreSQL. O servidor usa somente a identidade do usuário, nunca uma chave que ignora RLS.

Chaves compostas `(company_id, id)` impedem relações entre empresas, inclusive endereços e ativos pertencentes a clientes diferentes. Funções `SECURITY DEFINER` têm `search_path` fechado e autorização explícita. Técnicos recebem apenas ordens atribuídas, agenda e dados dos clientes necessários ao atendimento. Arquivos ficam em bucket privado com limite de 6 MB, validação de formato e links assinados de cinco minutos.

```text
src/app/                 Rotas, layouts e Server Components
src/components/          Interface, formulários e documentos
src/features/            Definições de módulos, validação, dados e ações
src/lib/supabase/        Cliente SSR
src/lib/permissions/     Permissões na aplicação
src/lib/ai/              Contrato de interpretação, sem execução automática
src/lib/integrations/    Contratos WhatsApp e pagamentos
supabase/migrations/    Banco, RLS e fluxos
tests/                   Domínio e integração PostgreSQL
```

## Scripts e qualidade

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd start
```

Com `npm run dev` aberto e sem variáveis do Supabase, `npm run test:smoke` verifica a tela de configuração, o redirecionamento de rotas protegidas e o layout desktop/mobile no navegador. No Windows usa o Microsoft Edge instalado; em outros sistemas instale o Chromium com `npx playwright install chromium`. Capturas ficam em `artifacts/`, ignorada pelo controle de versão. `npm run format` formata o código.

Os testes de banco usam PostgreSQL WASM (PGlite), aplicam as migrations e exercitam RLS com roles autenticadas e diferentes usuários: acesso cruzado, escalada de privilégio, transações de orçamento, execução/checklist, pagamentos, recorrências, campos personalizados e seed. A suíte monta apenas os contratos mínimos de `auth.uid()` e das tabelas Storage para testar as políticas SQL; não substitui uma integração com os serviços Auth e Storage reais. Essa integração precisa ser validada no Supabase escolhido. O `package-lock.json` fixa a instalação reproduzível.

## Build

Configure as variáveis de ambiente, execute `npm run build` e `npm start`. Em hospedagem, use HTTPS, configure as URLs autorizadas do Auth e aplique as migrations antes de iniciar a aplicação. Nenhum deploy é feito automaticamente por este repositório.
