# WayTI Control

Aplicação web para gestão de demanda de TI com foco em follow-ups de projetos, contratos, custos, compras e implantações.

## Stack
- Frontend: TypeScript + React + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + MongoDB (Mongoose)

## Credenciais de demo
- E-mail: `admin@admin.com`
- Senha: `admin123`

## Estrutura
- `client/` interface web
- `server/` API + MongoDB

## Como rodar (necessita Node.js)
1. `cd client`
2. `npm install`
3. `cp .env.example .env`
3. `npm run dev`

Em outro terminal:
1. `cd server`
2. `npm install`
3. `cp .env.example .env`
4. `npm run dev`

## Observações
- O frontend exige a API online para carregar dados.
- A API já possui endpoints e modelos Mongoose para integrar com MongoDB.
- Para produção, substitua o login local por autenticação server-side.

## Endpoints principais
- `POST /api/auth/login`
- `GET /api/demands`
- `POST /api/demands`
- `PATCH /api/demands/:id`
- `POST /api/demands/:id/contact`
- `POST /api/demands/:id/escalate`
- `GET /api/external-parties`
- `GET /api/tickets`
- `GET /api/reports/summary`
- `GET /api/reports/executive`
- `GET /api/vault`

## Funcionalidades adicionadas
- Criação e edição de demandas pelo frontend.
- CRUD básico de follow-ups com reagendamento e conclusão.
- Exportação de relatórios em CSV e PDF (via impressão).
- Filtros e busca por status, tipo e palavra-chave.
- Detalhes da demanda com linha do tempo.
- Auditoria básica de alterações (API + interface).
- Painel executivo com gráficos de orçamento e top demandas.
- Workflow de aprovação com status, aprovador e notas.
- Auditoria com filtros por ator e ação.
- Workflow multi-etapas com SLA configurável.
- Notificações simuladas (e-mail/Slack) ao mudar status.
- Evolucao mensal de gastos no dashboard.
- Cofre de senhas com criptografia AES-256-GCM e auditoria.

## Workflow multi-etapas
- Formato sugerido no campo de etapas: `Etapa|Responsavel|SLA`, separados por vírgula.
- Exemplo: `Comite Tecnico|Marina|3, Financeiro|Fernanda|4`

## Migracao de datas
- O modelo agora usa `Date` para `lastUpdate`, `followUps.dueDate` e `audits.at`.
- Rode **uma vez**:
  1. `cd server`
  2. `npm run migrate:dates`

## Cofre de senhas
- Configure `VAULT_MASTER_KEY` no `.env` do servidor (32 bytes em base64 ou 64 hex).
