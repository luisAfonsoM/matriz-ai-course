# Changelog — Matriz

Todas as alterações relevantes a este projeto serão documentadas neste ficheiro.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning (SemVer 2.0.0)](https://semver.org/lang/pt-BR/).

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
