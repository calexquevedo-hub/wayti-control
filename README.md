# WayTI

Plataforma full stack para operação de TI com gestão de demandas, chamados, ativos, contratos, automações e controle de acesso por perfil (ACL).

## Módulos principais

- Demandas: Kanban, Sprint, dashboard executivo, modal completo e histórico.
- Chamados: dashboard operacional (Lista/Kanban), detalhe do chamado e workflow por rota dinâmica.
- Ativos (ITAM): cadastro, checkout/checkin, baixa, histórico, termo PDF e upload de termo assinado.
- Contratos: gestão de fornecedores, valores, vigências e alertas.
- Configurações: hub central por seções (Demandas, Acesso, Chamado, Canais/E-mail).
- Governança: auditoria, ACL por perfil, cofre de senhas, relatórios.

## Arquitetura

- Frontend: React + TypeScript + Vite + Tailwind + Radix UI
- Backend: Node.js + Express + TypeScript + Mongoose
- Banco: MongoDB
- Deploy local/prod simplificado: Docker Compose

## Estado Atual de Produção

- Frontend em produção: **Vercel**
- Backend/API em produção: **Render**
- Banco de dados em produção: **MongoDB Atlas**
- Fluxo de deploy: push na `main` dispara build/deploy automático de frontend e backend

## Estrutura do Repositório

- `client/`: interface web
- `server/`: API e regras de negócio
- `docker-compose.yml`: orquestra app + Mongo
- `Dockerfile`: build multi-stage (frontend + backend)

## Pré-requisitos

- Node.js 20+ para frontend
- Node.js 18.x para backend (alinhado ao `server/package.json`)
- Docker Desktop (opcional, recomendado para ambiente completo)

## Execução Local (sem Docker)

### 1) Backend

```bash
cd server
npm install
cp .env.example .env
npm run build
npm run dev
```

### 2) Frontend

```bash
cd client
npm install
npm run build
npm run dev
```

A aplicação frontend aponta para a API via `VITE_API_URL`.

## Rotas de referência (frontend)

- `/` → Visão Geral
- `/inbox` → Follow-up Inbox
- `/demandas` → Board de Demandas
- `/sprints` → War Room / Sprints
- `/operacao/chamados` → Dashboard de Chamados
- `/operacao/chamados/:id` → Detalhe de Chamado
- `/ativos` → Gestão de Ativos
- `/contratos` → Gestão de Contratos
- `/relatorios` → Relatórios
- `/configuracoes` → Hub de Configurações

## Execução com Docker

```bash
docker compose up --build -d
```

Validação:

```bash
docker compose ps
curl -i http://localhost:3000/health
```

Resposta esperada:

```json
{"status":"ok"}
```

## Deploy (Vercel + Render + Atlas)

### Frontend (Vercel)

1. Conectar o repositório GitHub na Vercel.
2. Definir raiz do projeto como `client`.
3. Configurar variáveis de ambiente:
   - `VITE_API_URL` = URL pública da API no Render.
4. Garantir rewrite SPA (arquivo `client/vercel.json`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Backend (Render)

1. Criar Web Service apontando para a pasta `server`.
2. Build command:

```bash
npm ci --include=dev && npm run build
```

3. Start command:

```bash
npm run start
```

4. Variáveis obrigatórias:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` (URL do frontend para CORS)
   - demais variáveis usadas por IMAP/SMTP quando habilitadas

### Banco (MongoDB Atlas)

1. Criar cluster e usuário de aplicação.
2. Liberar IPs necessários (produção e desenvolvimento).
3. Usar `MONGO_URI` com credenciais de aplicação.

## Scripts Principais

### Backend (`server/package.json`)

- `npm run dev`: sobe API em modo desenvolvimento
- `npm run build`: compila TypeScript
- `npm run start`: roda build compilado
- `npm run seed`: cria perfis ACL padrão e migra usuários
- `npm run migrate:dates`: migração de campos de data
- `npm run migrate:ids`: migração de IDs sequenciais de demandas

### Frontend (`client/package.json`)

- `npm run dev`: Vite em desenvolvimento
- `npm run build`: build de produção
- `npm run preview`: preview local do build

## Segurança e Controle de Acesso

O sistema usa ACL por perfil (`Profile`) com permissões granulares por módulo:
- `tickets`, `demands`, `assets`, `contracts`: `view/create/edit/delete`
- `users`: `view/manage`
- `reports`: `view`
- `settings`: `manage`

Perfis padrão de sistema:
- `Administrador`
- `Técnico`
- `Solicitante`

Regras de proteção implementadas:
- Perfil `Administrador` protegido contra alteração de permissões críticas
- Perfis de sistema não podem ser excluídos
- Perfil em uso por usuários não pode ser excluído
- Endpoints críticos protegidos por autenticação JWT
- CORS configurado por ambiente (`CLIENT_URL`)

## Auditoria de Dependências

Auditorias recentes (npm audit) em `client` e `server`:
- `0 vulnerabilities`

## Checklist de Publicação

1. Rodar build local:

```bash
cd server && npm run build
cd ../client && npm run build
```

2. Validar migrações necessárias (ex.: IDs sequenciais):

```bash
cd server
npm run migrate:ids
```

3. Commit e push na `main`:

```bash
git add .
git commit -m "chore: release"
git push origin main
```

4. Acompanhar deploy:
- Vercel: build do frontend concluído sem erros.
- Render: build/start da API e healthcheck em `200`.

5. Smoke test em produção:
- Login e permissões por perfil.
- Demandas (Kanban, Sprint, Modal).
- Chamados (Dashboard/Detalhe).
- Ativos (checkout/checkin/termo).
- Configurações e relatórios.

## Projeto no GitHub

Repositório oficial:
- [https://github.com/calexquevedo-hub/wayti-control](https://github.com/calexquevedo-hub/wayti-control)

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.
