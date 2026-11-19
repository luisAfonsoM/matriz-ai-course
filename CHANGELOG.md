# Changelog — Matriz

Todas as alterações relevantes a este projeto serão documentadas neste ficheiro.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning (SemVer 2.0.0)](https://semver.org/lang/pt-BR/).

---

## [1.1.0-rc.2] - 2026-11-19

### Adicionado (Added)
* **Identidade Visual de Aviação ("Torre de Operações Matriz"):**
  * **Tokens Semânticos de Design:** Extensão do `tailwind.config.ts` com paleta aeronáutica profissional (`aero` azul-céu, `navy` cinza-naval, `runway` âmbar-pista, `hud` verde-cockpit e `storm` alerta de turbulência), mantendo contraste mínimo WCAG AA em modo claro.
  * **Micro-interações & Animações CSS:** Criação de keyframes personalizados `turbine-spin` (turbina rotativa para estados de loading) e `plane-takeoff` (efeito de sustentação/descolagem em botões de ação e submissão), com suporte total a acessibilidade motora via `prefers-reduced-motion` (`motion-reduce:` / `motion-safe:`).
  * **Módulo Centralizado de Terminologia:** Criação do módulo [`src/lib/labels.ts`](src/lib/labels.ts) com mapeamento semântico de vocabulário de aviação para navegação, papéis de tripulação, estados de voo e alertas, mantendo 100% de estabilidade nas APIs, enums e Prisma.
  * **Cockpit Hero na Página de Login:** Redesenho da interface [`src/app/login/page.tsx`](src/app/login/page.tsx) com painel hero ilustrado em gradiente aero/navy com bússola, radar e vento (`Plane`, `Compass`, `Radar`, `Wind`), transponder ativo e cartões táteis para credenciais de teste (Comandante e Piloto).
  * **TopBar & Logótipo:** Atualização da barra superior [`src/components/layout/TopBar.tsx`](src/components/layout/TopBar.tsx) com o novo logótipo aeronáutico (`Plane` + Matriz), telemetria do transponder em tempo real e ícones temáticos (`Gauge`, `Plane`, `ClipboardList`).
  * **Torre de Controlo (Dashboard):** Atualização dos cartões de KPI, gráfico de velocidade semanal com agulha de bússola (`recharts` em `#0284c7`), turbina em loading e alertas de turbulência com `CloudLightning`.
  * **Esquadrão de Missões & Checklists:** Atualização dos ecrãs de projetos e tarefas com badges temáticos (`Hangar / A Fazer`, `Em Voo / Em Progresso`, `Aterrado / Concluído`), atribuição de tripulação ("Pilotos") e comunicações de rádio (`Radio`).
  * **Captura Automatizada de Screenshots:** Criação do teste Playwright [`tests/e2e/capture-screenshots.spec.ts`](tests/e2e/capture-screenshots.spec.ts) e geração de screenshots de alta resolução no diretório [`docs/ui/screenshots/`](docs/ui/screenshots/).

### Modificado (Changed)
* **Eliminação de Cores Hardcoded:** Substituição integral de todos os seletores hardcoded `bg-blue-600`, `hover:bg-blue-700` e `text-blue-600` por classes semânticas `bg-aero-600`, `hover:bg-aero-700` e `text-aero-600` em todos os componentes de UI.
* **Resiliência e Compatibilidade de Testes:** Preservação estrita dos seletores e asserções nos testes E2E do Playwright (`task-lifecycle.spec.ts`) e suites de integração Node.js (`tests/*.test.ts`).

---

## [1.1.0-rc.1] - 2026-11-12

### Adicionado (Added)
* **Contentorização com Docker:**
  * Criação do [`Dockerfile`](Dockerfile) com construção multi-stage (`base`, `deps`, `builder`, `runner`) baseado em `node:20-alpine` com pacotes `libc6-compat` e `openssl`.
  * Criação de utilizador não-root com privilégios reduzidos (`nextjs:nodejs` UID 1001) para conformidade de segurança.
  * Adição do script [`docker-entrypoint.sh`](docker-entrypoint.sh) para migrações automáticas (`prisma migrate deploy`) e arranque seguro.
  * Criação do ficheiro [`.dockerignore`](.dockerignore) prevenindo inclusão de `node_modules`, ficheiros `.env` locais e binários.
* **Orquestração com Docker Compose:**
  * Criação do ficheiro canónico [`compose.yaml`](compose.yaml) (Compose Spec v2) com serviço `matriz-app`.
  * Criação do volume nomeado persistente `matriz_sqlite_data` montado em `/app/prisma` para retenção durável da base de dados relacional SQLite (`dev.db`).
  * Criação de rede isolada do tipo bridge (`matriz_network`).
  * Configuração de `healthcheck` HTTP nativo a cada 30 segundos com validação via `curl` na porta 3000.
* **Pipeline de Integração Contínua (CI/CD):**
  * Criação do workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) para disparo automático em `push` e `pull_request` nas branches `master` e `main`.
  * Configuração de permissões mínimas globais (`permissions: contents: read`).
  * Execução sequencial de 4 etapas: `typecheck` (`npx tsc --noEmit`), `test` (suites automatizadas de teste), `build` (compilação Next.js Standalone) e `docker-smoke-test` (construção da imagem com Buildx e teste de fumo em contentor).
  * Garantia de integridade: a construção da imagem Docker requer aprovação estrita dos testes e do build (`needs: [test, build]`).
* **Desafio A — Segurança Avançada na Pipeline:**
  * Integração de auditoria de dependências (SCA) com `npm audit` no job `typecheck`.
  * Integração do analisador de vulnerabilidades de contentores **Trivy** (`aquasecurity/trivy-action`) no job `docker-smoke-test` e no workflow de release, identificando CVEs na imagem base Alpine e bibliotecas Node.js.
* **Desafio B — Observabilidade & Disponibilidade:**
  * Criação do endpoint especializado [`/api/health`](src/app/api/health/route.ts) e [`/api/v1/health`](src/app/api/v1/health/route.ts) com verificação ativa do SQLite (`SELECT 1`), medição de latência em milissegundos, tempo de atividade (`uptime`) e uso de memória.
  * Criação do utilitário de logs estruturados em JSON ([`src/lib/logger.ts`](src/lib/logger.ts)) para ingestão por sistemas modernos de APM e agregação de logs.
  * Atualização dos healthchecks no `Dockerfile`, `compose.yaml` e testes de fumo para consultar diretamente `/api/health`.
  * Adição de suite automatizada de testes de observabilidade ([`tests/health-observability.test.ts`](tests/health-observability.test.ts)).
* **Desafio C — Publicação de Imagens no GitHub Container Registry (GHCR):**
  * Criação do workflow dedicado [`.github/workflows/release.yml`](.github/workflows/release.yml) para compilação e publicação automática de imagens no GHCR (`ghcr.io/luisafonsom/matriz-ai-course`) a partir de tags `v*`.
  * Configuração de autenticação segura via `GITHUB_TOKEN` com escopo mínimo `packages: write` e extração dinâmica de metadados SemVer com `docker/metadata-action`.
* **Suites Automatizadas de Teste:**
  * Adição de testes unitários para a regra de negócio do título de tarefa ([`tests/task-title-unit.test.ts`](tests/task-title-unit.test.ts)) cobrindo casos válidos, inválidos e análise de valores-limite (BVA nos limiares 3 e 150 caracteres).
  * Adição de testes de integração de API e persistência SQLite ([`tests/tasks-integration.test.ts`](tests/tasks-integration.test.ts)) com isolamento de dados e teardown determinístico.
  * Adição de teste End-to-End no navegador headless via Playwright ([`tests/e2e/tasks-flow.spec.ts`](tests/e2e/tasks-flow.spec.ts)) cobrindo o percurso utilizador (login $\to$ projeto $\to$ criação de tarefa $\to$ validação em listagem).
  * Adição de suite de regressão de segurança e IDOR ([`tests/security-idor.test.ts`](tests/security-idor.test.ts)) cobrindo 21 asserções de controlo de acesso entre utilizadores de demonstração.
* **Documentação Operacional:**
  * Criação do manual técnico de deployment e operações ([`docs/deployment.md`](docs/deployment.md)).
  * Criação do plano de testes consolidado ([`docs/test-plan.md`](docs/test-plan.md)).
  * Criação do relatório de revisão de código e segurança ([`docs/quality-security-review.md`](docs/quality-security-review.md)).
  * Criação das notas de lançamento da Release Candidate ([`docs/release-notes-v1.1.0-rc.1.md`](docs/release-notes-v1.1.0-rc.1.md)).

### Segurança (Security)
* **Correção de Bypass de Autenticação (SEC-01):**
  * Removido o suporte inseguro ao cabeçalho `X-User-Id` em [`src/modules/auth/auth.service.ts`](src/modules/auth/auth.service.ts), impedindo a falsificação de identidade de utilizador por injeção direta de headers HTTP em chamadas externas.
  * Validação estrita e exclusiva de tokens de sessão assinados com HMAC-SHA256 através de cookies HTTP-only (`matriz_session`).
* **Correção de Vulnerabilidade IDOR na Desassociação de Tarefas (SEC-02):**
  * Correção do manipulador `PUT /api/v1/tasks/:id` em [`src/modules/tasks/tasks.service.ts`](src/modules/tasks/tasks.service.ts), impedindo que um Membro de Equipa (`TEAM_MEMBER`) desassocie ou altere o responsável de uma tarefa que não lhe pertença.
  * Membros de equipa apenas podem desassociar tarefas atribuídas a si próprios; Gestores de Projeto mantêm privilégio de gestão global.

### Modificado (Changed)
* **Compilação do Script de Seed:** Atualizado o processo de seed da base de dados com compilação prévia TypeScript (`npx tsc prisma/seed.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --outDir prisma/dist`), assegurando execução idêntica em Node.js 20, 22 e Alpine Linux.
* **Scripts no `package.json`:** Adicionados atalhos operacionais para gestão de contentores (`docker:build`, `docker:up`, `docker:down`, `docker:logs`).
* **Dependências:** Adicionados pacotes de tipagem e runtime `bcryptjs` e `@types/bcryptjs`.
* **Especificação OpenAPI:** Atualizada a versão do contrato em [`openapi.yaml`](openapi.yaml) para `1.1.0-rc.1`.

---

## [1.0.0] - 2026-11-05

### Adicionado (Added)
* **Arquitetura Base:** Monólito Modular em Next.js 14 (App Router), TypeScript e Tailwind CSS.
* **Camada de Dados:** Esquema relacional Prisma ORM com SQLite (`prisma/dev.db`), incluindo migrações e seed idempotente.
* **Módulo de Autenticação:** Autenticação por email e palavra-passe, hashing seguro via `bcryptjs`, cookies HTTP-only e RBAC (`PROJECT_MANAGER` vs `TEAM_MEMBER`).
* **Módulo de Projetos:** Criação, edição, listagem com paginação e pesquisa textual, cálculo de progresso e eliminação em cascata com diálogo de segurança.
* **Módulo de Tarefas & Kanban:** Visualização em 3 colunas (`TODO`, `IN_PROGRESS`, `DONE`), drag and drop com `@hello-pangea/dnd`, prioridades (`LOW`, `MEDIUM`, `HIGH`), datas limites e computação em tempo de execução de `isOverdue`.
* **Múltiplos Responsáveis (N:M):** Associação de múltiplos utilizadores por tarefa via tabela relacional com restrição `@@unique([taskId, userId])`.
* **Comentários Colaborativos:** Registo cronológico de comentários por tarefa com autoria inferida pela sessão.
* **Dashboard Analítico:** Indicadores de progresso percentual, distribuição por estado e gráfico de velocidade semanal com `recharts`.
* **Especificação de Contratos:** Criação da especificação formal OpenAPI 3.1 ([`openapi.yaml`](openapi.yaml)).
* **Documentação Inicial:** Requisitos ([`docs/requirements.md`](docs/requirements.md)), User Stories ([`docs/user-stories.md`](docs/user-stories.md)), Restrições ([`docs/constraints.md`](docs/constraints.md)), Arquitetura ([`docs/architecture.md`](docs/architecture.md)), Base de Dados ([`docs/database.md`](docs/database.md)) e Verificação Formal do MVP ([`docs/verification.md`](docs/verification.md)).
