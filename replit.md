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
- Dashboard principal
- Gestão de Fundos (fundos-parceiros, fundo-detalhe, fundo-novo, consulta-fundos)
- Gestão de Empresas (empresas, empresa-detalhe, empresa-nova)
- Operações (operacoes, operacao-detalhe, operacao-nova)
- CAF (caf, caf-detalhe, caf-novo, caf-importar, caf-crawler, caf-sicor)
- Portal do Cliente (portal-cliente, portal-cliente-dashboard, portal-cliente-formulario, portal-clientes-admin)
- SDR
- Relatórios
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
    fundos.ts          - Fundos enrichment logic
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
- `/api/caf-extrator/registros` (GET) - CAF records for crawler
- `/api/caf-extrator/varredura` (POST) - Trigger CAF scan

## Routing Notes
- Detail pages (/operacoes/:id, /empresas/:id, /fundos-parceiros/:id) use useParams wrapper components in App.tsx to pass route params correctly through NorionShell
- CafDetalhePage already uses useParams internally so no wrapper needed

## Test Data
- Default credentials: admin/admin
- 5 test companies (Agropecuária Boa Vista, TechBuild, Fazenda São José, DNA Alimentos, Praia Dourada Resort)
- 3 partner funds (FIDC Agro Brasil, Securitizadora Real Capital, FIP Expansion Partners)
- 5 credit operations in various stages
- 3 CAF records (2 active, 1 expired)

## Notes
- The Notion integration was not used (user dismissed it). If needed in the future, can be set up via Replit integrations or manual API token.
