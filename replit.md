# Norion Capital

## Overview
Norion Capital is a comprehensive financial management system designed to streamline operations for investment funds and financial institutions. It provides a rich dashboard with KPIs, pipeline management, recent operations, company profiles, market quotes (BCB PTAX, Selic/CDI/IPCA indicators, agricultural commodities), and agricultural climate data. Key capabilities include fund management, company management, operation tracking, CAF (Cadastro de Agricultores Familiares) processing, a client portal, SDR (Sales Development Representative) functionalities, and advanced reporting. The system aims to enhance efficiency in financial asset management, client interaction, and data-driven decision-making, with a focus on enriching company data and optimizing fund matching.

## User Preferences
None specified.

## System Architecture
The application follows a client-server architecture:
- **Frontend:** Built with React, Vite, TailwindCSS, and shadcn/ui for a modern and responsive user interface. Routing is handled by `wouter`. The UI adheres to a dark theme only, with a dark navy palette defined by CSS `:root` variables. Page-level colors directly use dark-suitable values (e.g., `bg-slate-800/60`), and `dark:` variants are used exclusively within shadcn/ui components. Portal client pages have their own distinct dark navy styling.
- **Backend:** Powered by Express.js and Node.js, providing a robust API layer.
- **Database:** PostgreSQL is used for data persistence, with Drizzle ORM facilitating database interactions.
- **Authentication:** Passport.js is implemented for user authentication, utilizing `express-session` and `connect-pg-simple` for session management.
- **Data Enrichment:** A core component of the system involves automatic company data enrichment through various external APIs (BrasilAPI, DAP/CAF, SICOR/BCB, IBGE) upon company creation or operation forms. This data is stored in `company_data_sources` and used to calculate a profile score.
- **Fund Matching Workflow:** Implements a 2-stage workflow for sending operations to funds, involving selection (`pronto_para_envio`) and confirmation (`enviado`). A sophisticated matching algorithm uses elimination criteria and weighted scoring across multiple factors (operation, value, guarantees, financial profile, agro profile, compliance, fund history) to suggest suitable funds. The API returns `scoreBreakdown` with per-dimension scores. A graph visualization dialog ("Ver Gráfico") in operacao-detalhe provides: summary stats, horizontal bar chart ranking, radar chart comparing funds across 7 dimensions, clickable fund pills for detailed breakdown panels, and eliminated funds section. Uses recharts.
- **Internal Notifications:** A system for internal notifications is implemented with a `norion_notificacoes` table, displaying unread counts and actions in the header.
- **Document Management:** Includes file upload validation for size (max 10MB) and types (PDF, JPG, PNG, WebP).
- **Form Field-Level Revision:** A `camposRevisao` mechanism in `norion_formulario_cliente` allows admins to flag specific form fields for revision. The client portal then restricts editing to only these flagged fields, highlighting them for correction.

## External Dependencies
- **GitHub:** Used for project import (via Replit integrations).
- **Google Drive:** Integrated for document uploads, with files stored in a dedicated "Norion Capital" folder.
- **PostgreSQL:** Replit's built-in PostgreSQL database.
- **BrasilAPI:** Used for CNPJ lookup and company data enrichment (QSA, CNAE, status).
- **DAP/CAF API:** For querying CAF data based on partners' CPFs.
- **SICOR/BCB API:** For rural credit information.
- **IBGE API:** For municipality data.
- **AwesomeAPI:** For agricultural commodity quotes.
- **Open-Meteo:** For weather data in agricultural regions.