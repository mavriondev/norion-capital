# Norion Capital

## Overview
Sistema de gestão financeira Norion Capital. Importado do repositório GitHub `mavriondev/norion-capital`.

## Architecture
- **Frontend:** React + Vite + TailwindCSS + shadcn/ui
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Passport.js com sessões (express-session + connect-pg-simple)
- **Routing:** wouter (frontend), Express routes (backend)

## Key Features
- Dashboard rico com KPIs, pipeline, operações recentes, perfil de empresas, cotações (BCB PTAX + indicadores Selic/CDI/IPCA + commodities agro), clima de regiões agrícolas (Open-Meteo)
- Gestão de Fundos (fundos-parceiros, fundo-detalhe, fundo-novo, consulta-fundos)
- Gestão de Empresas (empresas, empresa-detalhe, empresa-nova)
- Operações (operacoes, operacao-detalhe, operacao-nova) — com dialog de seleção de empresa
- CAF (caf, caf-detalhe, caf-novo, caf-importar, caf-consultar, caf-sicor)
- Portal do Cliente (portal-cliente, portal-cliente-dashboard, portal-cliente-formulario, portal-clientes-admin)
- SDR
- Relatórios avançados com 3 abas (Visão Geral com gráficos, Pipeline/Funil, Detalhes), filtros por data/empresa/status, exportação CSV
- Configurações
- Login com autenticação

## Project Structure
```
client/src/
  App.tsx              - Main app with routing and auth guards
  components/
    norion-layout.tsx  - Main layout wrapper (sidebar + header)
    norion-create-fundo-dialog.tsx - Dialog para criar fundos
    ui/                - shadcn/ui components
  hooks/
    use-auth.ts        - Auth hook
  pages/               - All page components
  lib/                 - Utils and query client

server/
  index.ts             - Server entry point
  routes.ts            - Main route registration
  routes/
    norion.ts          - Norion-specific API routes
    norion-portal.ts   - Portal client API routes
  storage.ts           - Database storage layer
  db.ts                - Database connection
  auth.ts              - Authentication setup
  enrichment/
    fundos.ts          - Fundos enrichment logic (CVM + ANBIMA)
    company-enrichment.ts - Auto-enrichment service (BrasilAPI, DAP/CAF, SICOR, IBGE)
  google-drive.ts      - Google Drive integration

shared/
  schema.ts            - Drizzle schema + types
  routes.ts            - API route contracts
```

## Integrations
- GitHub connector (installed via Replit integrations) - used for importing the project
- Google Drive connector (installed via Replit integrations) - used for document uploads; files are stored under the "Norion Capital" root folder in Drive
- PostgreSQL database (Replit built-in)

## API Routes Added
- `/api/crm/companies` (GET, POST, PATCH, DELETE) - CRUD for companies, used by empresas pages
- `/api/cnpj/:cnpj` - CNPJ lookup via BrasilAPI, used by empresa-nova page
- `/api/sdr/queue` (GET) - SDR leads queue based on company profiles
- `/api/sdr/leads/:id` (PATCH) - Update SDR lead status
- `/api/norion/caf/consultar` (GET) - Consulta CAF por número CAF, DAP ou CPF (busca local + fallback portal DAP)
- `/api/norion/cotacoes` (GET) - Cotações BCB PTAX (USD/EUR), indicadores (Selic/CDI/IPCA), commodities agro (AwesomeAPI). Cache de 5 min no servidor.
- `/api/norion/clima` (GET) - Clima de 5 regiões agrícolas via Open-Meteo (gratuito, sem chave)

## Routing Notes
- Detail pages (/operacoes/:id, /empresas/:id, /fundos-parceiros/:id) use useParams wrapper components in App.tsx to pass route params correctly through NorionShell
- CafDetalhePage already uses useParams internally so no wrapper needed

## Test Data
- Default credentials: admin/admin
- 5 test companies (Agropecuária Boa Vista, TechBuild, Fazenda São José, DNA Alimentos, Praia Dourada Resort)
- 3 partner funds (FIDC Agro Brasil, Securitizadora Real Capital, FIP Expansion Partners)
- 5 credit operations in various stages
- 3 CAF records (2 active, 1 expired)

## Database Tables (new from GitHub sync)
- `company_api_queries` — histórico de consultas a APIs externas por empresa (CAF, SICAR, SICOR, etc)
- `company_data_sources` — dados agregados por fonte para cada empresa
- `company_timeline_events` — timeline de eventos do cliente (consultas, formulários, documentos, etc)

## Manus AI Report Improvements (all implemented)
- T001: Motivo de rejeição de documento exibido no portal-cliente-dashboard
- T002: Busca de formulário por clientUserId na operação (acesso avulso)
- T003: Renovação automática de token quando expira em < 6 meses (login e login-cpf)
- T004: Alerta no dashboard admin quando há formulários aguardando revisão
- T005: Validação de campos obrigatórios por etapa no formulário do cliente
- T006: CPF pré-populado no link do portal (?cpf=)
- T007: Checklists por tipo de operação (Agro, Capital de Giro, Imóvel, Home Equity)
- T008: Timeline de próximos passos após envio do formulário
- Portal Clientes admin simplificado: removida aba Formulários (redundante), mantido geração de acesso + lista de clientes enriquecida com status do formulário, etapa da operação, e busca

## Company Enrichment System
- Auto-enrichment triggered on company creation (`POST /api/crm/companies`) and formulário criar-operação (fire-and-forget)
- APIs: BrasilAPI (CNPJ, QSA, CNAE, situação), DAP/CAF (por CPF dos sócios), SICOR/BCB (crédito rural), IBGE (município)
- Each API result stored individually in `company_data_sources` with timestamps, validity, and tags
- Profile score (0-100) calculated from enrichment data: CNAE, porte, situação, capital social, CAF/DAP, SICOR, endereço
- Empresa-detalhe redesigned with 6 tabs: Visão Geral, QSA/Sócios, CAF/DAP, SICOR, IBGE, Operações
- Each tab has individual "Atualizar" button calling `POST /api/norion/companies/:id/enrich/:source`
- Matching com fundos enriquecido: score de perfil, situação ativa, CAF/DAP, capital social como fatores adicionais
- Endpoints:
  - `POST /api/norion/companies/:id/enrich` — full enrichment
  - `POST /api/norion/companies/:id/enrich/:source` — single source (brasilapi, dap_caf, sicor, ibge)
  - `GET /api/norion/companies/:id/data-sources` — all stored API results
  - `GET /api/norion/companies/:id/operations` — all operations for company

## Theming
- Dark theme only (no light mode toggle). CSS `:root` vars define dark navy palette (--background: 222 47% 11%)
- Tailwind `darkMode: ["class"]` is configured but `.dark` class is NOT applied to `<html>` — `dark:` variants never activate
- All page-level colors use dark-suitable values directly (e.g., `bg-slate-800/60`, `bg-green-900/30`, `text-green-400`)
- No `dark:` prefix variants in page components — only in shadcn ui library components
- Portal client pages (portal-cliente-*) have their own dark navy styling

## Notes
- The Notion integration was not used (user dismissed it). If needed in the future, can be set up via Replit integrations or manual API token.
- GitHub repo: mavriondev/norion-capital (público). Último sync: commit ec85abe3 (company history tracking, data aggregation, permanent portal access)
