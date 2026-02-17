# WayTI Control

Plataforma full stack para operação de TI com gestão de demandas, chamados, ativos, contratos, automações e controle de acesso por perfil (ACL).

## Visão Geral

O projeto foi desenhado para operação diária de times de TI com foco em:
- Visibilidade de fluxo (Kanban de demandas)
- Execução operacional (chamados, ativos e contratos)
- Governança (auditoria, aprovações, permissões e cofre)

## Arquitetura

- Frontend: React + TypeScript + Vite + Tailwind + Radix UI
- Backend: Node.js + Express + TypeScript + Mongoose
- Banco: MongoDB
- Deploy local/prod simplificado: Docker Compose

## Estrutura do Repositório

- `client/`: interface web
- `server/`: API e regras de negócio
- `docker-compose.yml`: orquestra app + Mongo
- `Dockerfile`: build multi-stage (frontend + backend)

## Pré-requisitos

- Node.js 20+ para desenvolvimento do frontend
- Node.js 18+ para backend local
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

A aplicação frontend por padrão aponta para a API via variável `VITE_API_URL`.

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

## Scripts Principais

### Backend (`server/package.json`)

- `npm run dev`: sobe API em modo desenvolvimento
- `npm run build`: compila TypeScript
- `npm run start`: roda build compilado
- `npm run seed`: cria perfis ACL padrão e migra usuários
- `npm run migrate:dates`: migração de campos de data

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

## Auditoria de Dependências

Auditorias recentes (npm audit) em `client` e `server`:
- `0 vulnerabilities`

## Projeto no GitHub

Repositório oficial:
- [https://github.com/calexquevedo-hub/wayti-control](https://github.com/calexquevedo-hub/wayti-control)

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.
