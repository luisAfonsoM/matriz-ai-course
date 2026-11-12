# Notas de Lançamento — Versão Candidata v1.1.0-rc.1

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Versão:** `1.1.0-rc.1` (Release Candidate 1)
* **Padrão de Versionamento:** [Semantic Versioning (SemVer 2.0.0)](https://semver.org/lang/pt-BR/)
* **Data de Emissão:** 12 de Novembro de 2026
* **Ambiente de Referência:** Node.js 20 LTS / Docker 24+ / Docker Compose v2
* **Documentos de Referência:** [`README.md`](../README.md) | [`CHANGELOG.md`](../CHANGELOG.md) | [`docs/deployment.md`](deployment.md) | [`docs/architecture.md`](architecture.md) | [`compose.yaml`](../compose.yaml) | [`openapi.yaml`](../openapi.yaml)

---

## 1. Resumo Executivo da Release Candidate

A versão **`v1.1.0-rc.1`** representa a primeira **Versão Candidata (*Release Candidate*)** da plataforma **Matriz**, consolidando a evolução do projeto desde a validação do MVP até à plena prontidão operacional e automação contínua de entrega.

Esta versão introduz **contentorização multi-stage com Docker**, **orquestração declarativa com Docker Compose v2**, **pipeline de Integração Contínua (CI/CD) no GitHub Actions** com validações de tipagem e testes sequenciais, um conjunto alargado de **testes automatizados (Unitários, Integração, End-to-End com Playwright e Regressão de Segurança)**, bem como a resolução formal de vulnerabilidades de autenticação e controlo de acesso (IDOR).

---

## 2. Principais Novidades e Melhorias

### 2.1 Entrega e Operações (Containerização & Docker Compose)
* **Dockerfile Multi-Stage Otimizado:** Construção em 4 estágios (`base`, `deps`, `builder`, `runner`) com base em `node:20-alpine`. A imagem final de execução tem um tamanho reduzido (~250MB para runtime standalone), inclui o utilizador não-privilegiado `nextjs:nodejs` (UID 1001) e o utilitário `openssl` para os motores nativos do Prisma ORM.
* **Orquestração com `compose.yaml`:**
  * Serviço `matriz-app` integrado com restart automático (`unless-stopped`).
  * Volume nomeado persistente `matriz_sqlite_data` garantindo durabilidade dos dados relacionais SQLite (`dev.db`).
  * Rede bridge dedicada `matriz_network`.
  * Verificação de saúde em tempo real (`healthcheck`) a cada 30 segundos via `curl` na porta 3000.
* **Entrypoint Automatizado (`docker-entrypoint.sh`):** No arranque do contentor, são executadas automaticamente as migrações (`prisma migrate deploy`) e o script de povoamento inicial de forma segura antes de iniciar o servidor Next.js.

### 2.2 Automação e Qualidade Contínua (GitHub Actions CI/CD)
* **Pipeline Integrada ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):** Disparo automático em qualquer `push` ou `pull_request` nas branches `master` e `main`.
* **Permissões Mínimas:** Configuração explícita de `permissions: contents: read` para mitigação de riscos de segurança no runner.
* **Jobs Sequenciais:**
  1. `typecheck`: Verificação estática com `npx tsc --noEmit`.
  2. `test`: Execução de todas as suites de testes automatizados com base de dados isolada.
  3. `build`: Validação de compilação de produção (`npm run build`).
  4. `docker-smoke-test`: Construção da imagem Docker via Buildx e validação de arranque com teste de fumo HTTP.
* **Resiliência a Falhas:** Comprovado experimentalmente através de ensaio de injeção de falha (*Fault Injection*) que qualquer erro em testes interrompe de imediato a promoção para build e Docker.

### 2.3 Reforço de Segurança e Resolução de Vulnerabilidades
* **SEC-01 (Prevenção de Falsificação de Identidade):** Removido definitivamente o suporte ao cabeçalho `X-User-Id` nas chamadas à API, exigindo exclusivamente cookies HTTP-only com tokens assinados HMAC-SHA256 e palavras-passe em hash `bcryptjs`.
* **SEC-02 (Eliminação de IDOR na Desassociação):** Implementada barreira de autorização em `PUT /api/v1/tasks/:id` que impede Membros de Equipa de desassociarem ou alterarem responsáveis de tarefas atribuídas a outros utilizadores.

---

## 3. Matriz de Cobertura e Resultados de Testes

A versão `v1.1.0-rc.1` foi submetida a uma verificação rigorosa em todas as camadas da aplicação:

| Suite de Testes | Ficheiro do Teste | Casos / Asserções | Resultado |
|---|---|:---:|:---:|
| **Verificação Estática de Tipos** | `npx tsc --noEmit` | Tipagem integral | ✅ **Aprovado (0 erros)** |
| **Testes Unitários (Título de Tarefa)** | [`tests/task-title-unit.test.ts`](../tests/task-title-unit.test.ts) | 13 | ✅ **13/13 Passaram** |
| **Testes de Integração (API & SQLite)** | [`tests/tasks-integration.test.ts`](../tests/tasks-integration.test.ts) | 33 | ✅ **33/33 Passaram** |
| **Testes de Regressão de Segurança (IDOR)** | [`tests/security-idor.test.ts`](../tests/security-idor.test.ts) | 21 | ✅ **21/21 Passaram** |
| **Verificação Formal do MVP (Casos 01-09)** | [`tests/mvp-verification.test.ts`](../tests/mvp-verification.test.ts) | 34 | ✅ **34/34 Passaram** |
| **Múltiplos Responsáveis (N:M)** | [`tests/task-assignees.test.ts`](../tests/task-assignees.test.ts) | 12 | ✅ **12/12 Passaram** |
| **Comentários de Tarefas** | [`tests/task-comments.test.ts`](../tests/task-comments.test.ts) | 28 | ✅ **28/28 Passaram** |
| **Gestão de Tarefas (CRUD & Filtros)** | [`tests/tasks-crud.test.ts`](../tests/tasks-crud.test.ts) | 27 | ✅ **27/27 Passaram** |
| **Gestão de Projetos (CRUD & Cascata)** | [`tests/projects-crud.test.ts`](../tests/projects-crud.test.ts) | 21 | ✅ **21/21 Passaram** |
| **Autenticação & RBAC** | [`tests/auth-rbac.test.ts`](../tests/auth-rbac.test.ts) | 14 | ✅ **14/14 Passaram** |
| **Integração Frontend & Métricas** | [`tests/frontend-integration.test.ts`](../tests/frontend-integration.test.ts) | 15 | ✅ **15/15 Passaram** |
| **End-to-End no Browser (Playwright)** | [`tests/e2e/tasks-flow.spec.ts`](../tests/e2e/tasks-flow.spec.ts) | 1 Fluxo E2E | ✅ **Aprovado** |

---

## 4. Como Executar a Versão Candidata

### 4.1 Via Docker Compose (Método Recomendado)
```bash
# 1. Clonar o repositório e aceder à pasta
git clone <url-do-repositorio>
cd matriz

# 2. Construir e iniciar os contentores em segundo plano
docker compose up -d --build

# 3. Validar estado do contentor e saúde da aplicação
docker compose ps
docker compose logs -f

# 4. Aceder no navegador
# URL: http://localhost:3000
```

### 4.2 Via Instalação Nativa Node.js
```bash
# 1. Copiar ficheiro de ambiente
cp .env.example .env

# 2. Instalar dependências
npm install

# 3. Aplicar migrações e seed
npx prisma migrate dev
npm run db:seed

# 4. Iniciar em modo de produção
npm run build
npm run start
```

---

## 5. Contas de Demonstração Pré-Configuradas

| Papel | Utilizador | Palavra-passe | Capacidades |
|---|---|:---:|---|
| **Gestor de Projeto** | `luis.ferreira@matriz.local` | `password123` | Criação/edição/remoção de projetos, definição de datas de tarefas e atribuição livre. |
| **Membro de Equipa** | `ana.silva@matriz.local` | `password123` | Gestão de tarefas próprias no Kanban, comentários e movimentação de estado. |
| **Membro de Equipa** | `carlos.ramos@matriz.local` | `password123` | Colaboração em tarefas atribuídas e inserção de comentários. |

---

## 6. Limitações Conhecidas e Próximos Passos (Roadmap para v1.1.0 Final)

1. **Testes E2E em Ambiente Linux Sem GUI:** Para executar o Playwright em distribuições Linux mínimas ou agentes de CI sem interface gráfica, é necessária a instalação prévia dos binários do navegador (`npx playwright install --with-deps chromium`).
2. **Cluster Multi-Instância:** Na versão atual, a base de dados SQLite é embutida e partilhada por volume local. Caso se pretenda escalabilidade horizontal com múltiplos réplicas de contentores em Kubernetes, deverá ponderar-se a migração do driver Prisma para PostgreSQL ou MySQL externo.
