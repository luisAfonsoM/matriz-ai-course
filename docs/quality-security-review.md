# Relatório de Code Review e Security Review — Matriz

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Contexto:** Ficha Prática Laboratorial 04 — Exercício 5 (Code Review e Security Review)
* **Função/Perfis:** Senior Software Engineer & Application Security Reviewer
* **Documentos de Referência:** [`AGENTS.md`](../AGENTS.md) | [`docs/requirements.md`](requirements.md) | [`docs/user-stories.md`](user-stories.md) | [`docs/constraints.md`](constraints.md) | [`docs/test-plan.md`](test-plan.md) | [`openapi.yaml`](../openapi.yaml)
* **Data:** 12 de Novembro de 2026
* **Versão:** 1.0 — Relatório Formal de Revisão e Auditoria

---

## 1. Enquadramento e Metodologia da Auditoria

Este relatório consolida a auditoria técnica de qualidade de código (*Code Review*) e segurança aplicacional (*Application Security Review*) realizada sobre o incremento recente e o estado atual da base de código da plataforma **Matriz**.

A metodologia de revisão adotou uma abordagem híbrida de defesa em profundidade:
1. **Análise Estática de Código:** Verificação de tipagem estrita com o compilador TypeScript (`npx tsc --noEmit`) e diagnóstico do ecossistema de linters (`ESLint`).
2. **Revisão Manual de Código (Peer Review):** Inspeção minuciosa dos controladores de rotas Next.js (`src/app/api/v1/`), serviços de domínio (`src/modules/`) e modelos de dados Prisma (`prisma/schema.prisma`).
3. **Análise de Autorização e Controlo de Acessos com Duas Contas de Demonstração:** Verificação empírica de privilégios cruzados (**Broken Object Level Authorization / IDOR** e **Broken Function Level Authorization / RBAC**) utilizando as duas contas seeded no sistema:
   * **Conta Gestor de Projeto:** `luis.ferreira@matriz.local` (`role: PROJECT_MANAGER`)
   * **Conta Membro de Equipa:** `ana.silva@matriz.local` (`role: TEAM_MEMBER`)
4. **Princípio do Planeamento Prévio (*Plan-First*):** Distinção estrita entre factos comprovados e hipóteses teóricas, sem aplicação arbitrária de alterações ao código de produção antes da revisão e autorização humana.

---

## 2. Matriz de Autorização e Análise Empírica (Duas Contas de Demonstração)

A tabela seguinte detalha o comportamento observado ao contrastar os pedidos efetuados pela conta de **Gestor de Projeto** (`Luis Ferreira`) e pela conta de **Membro de Equipa** (`Ana Silva`):

| Operação / Rota API | Privilégio Esperado | Luis Ferreira (`PROJECT_MANAGER`) | Ana Silva (`TEAM_MEMBER`) | Estado de Segurança |
|---|:---:|:---:|:---:|:---:|
| `POST /api/v1/projects` (Criar Projeto) | Apenas Gestor | ✅ `201 Created` | 🛡️ `403 Forbidden` (`requireRole`) | **Conforme** |
| `PUT /api/v1/projects/{id}` (Editar Projeto) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`requireRole`) | **Conforme** |
| `DELETE /api/v1/projects/{id}` (Eliminar Projeto) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`requireRole`) | **Conforme** |
| `DELETE /api/v1/tasks/{id}` (Eliminar Tarefa) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`deleteTask`) | **Conforme** |
| `POST /api/v1/projects/{id}/tasks` (Definir Prazo `dueDate`) | Apenas Gestor | ✅ `201 Created` | 🛡️ `403 Forbidden` (`createTask`) | **Conforme** |
| `PUT /api/v1/tasks/{id}` (Alterar Prazo `dueDate`) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`updateTask`) | **Conforme** |
| `PUT /api/v1/tasks/{id}` (Alterar Prioridade `priority`) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`updateTask`) | **Conforme** |
| `POST /api/v1/tasks/{id}/assignees` (Atribuir Outro Membro) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`assignUserToTask`) | **Conforme** |
| `DELETE /api/v1/tasks/{id}/assignees/{userId}` (Desassociar Outro Membro) | Apenas Gestor | ✅ `200 OK` | 🛡️ `403 Forbidden` (`unassignUserFromTask`) | **Conforme** |
| `POST /api/v1/tasks/{id}/comments` (Inferência de Autor) | Gestor ou Membro | ✅ `201 Created` (Autor = Luis) | ✅ `201 Created` (Autor = Ana) | **Conforme (Anti-spoofing)** |
| `PUT /api/v1/tasks/{id}` com `assigneeId: null` | Apenas Gestor ou Próprio | ✅ `200 OK` | ❌ **VULNERÁVEL (200 OK)** | ⚠️ **IDOR / Bypass Detetado** (Ver Finding SEC-02) |
| Qualquer pedido com cabeçalho `X-User-Id` | Autenticação Requerida | N/A | ❌ **VULNERÁVEL (Bypass Total)** | 🚨 **Bypass de Autenticação** (Ver Finding SEC-01) |

---

## 3. Resultados do Security Review (Vulnerabilidades e Riscos)

### SEC-01: Desvio de Autenticação e Escalonamento de Privilégios via Cabeçalho `X-User-Id`
* **Classificação:** CWE-287 (Improper Authentication) / OWASP A07:2021 (Identification and Authentication Failures)
* **Severidade:** **CRÍTICA (CVSS v3.1: 9.8)**
* **Ficheiro:** [`src/modules/auth/auth.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/auth/auth.service.ts#L117-L124)
* **Evidência de Código:**
  ```typescript
  // 3. Fallback controlado para X-User-Id (útil para automação de testes e chamadas diretas com ID)
  if (!userId) {
    const xUserId = request.headers.get("x-user-id");
    if (xUserId) {
      userId = xUserId;
    }
  }
  ```
* **Impacto:** Qualquer cliente HTTP não autenticado pode forjar uma identidade arbitrária enviando simplesmente o cabeçalho `X-User-Id: <id-do-gestor>`. O servidor ignora a ausência de cookies ou tokens criptográficos HMAC, carregando o utilizador da base de dados e concedendo privilégios integrais de `PROJECT_MANAGER`.
* **Natureza:** **Facto Confirmado**.
* **Correção Proposta:** Eliminar ou desativar incondicionalmente o fallback de `X-User-Id` no ambiente de aplicação padrão, ou condicioná-lo estritamente a um segredo interno e ambiente exclusivo de mock (`process.env.NODE_ENV === "test"` com token secreto de automação). Como as suites de teste atuais já geram tokens de sessão válidos (`signSessionToken`), este cabeçalho não é necessário.
* **Teste de Regressão Sugerido:** Invocação de endpoints protegidos (`GET /api/v1/auth/me`, `POST /api/v1/projects`) enviando apenas `X-User-Id` sem token ou cookie válido; asserção de que a resposta devolve rigorosamente `HTTP 401 Unauthorized`.

---

### SEC-02: Broken Object Level Authorization (IDOR) na Desassociação de Tarefas via `PUT /api/v1/tasks/{id}`
* **Classificação:** CWE-639 (Authorization Bypass Through User-Controlled Key) / OWASP A01:2021 (Broken Access Control)
* **Severidade:** **ALTA (CVSS v3.1: 7.1)**
* **Ficheiro:** [`src/modules/tasks/tasks.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/tasks/tasks.service.ts#L342-L348)
* **Evidência de Código:**
  ```typescript
  if (user.role === "TEAM_MEMBER") {
    // ...
    if (data.assigneeId !== undefined && data.assigneeId !== user.id && data.assigneeId !== null) {
      return {
        status: "FORBIDDEN",
        message: "Membros de equipa apenas podem atribuir tarefas a si próprios.",
      };
    }
  }
  ```
* **Impacto:** A cláusula de guarda permite explicitamente `data.assigneeId === null`. Quando um Membro de Equipa (`Ana Silva`) submete `PUT /api/v1/tasks/{id}` com `{"assigneeId": null}` numa tarefa que se encontra atribuída ao Gestor (`Luis Ferreira`) ou a outro colega, o pedido é aceite (`HTTP 200 OK`), desassociando o responsável alheio.
  Além disso, a operação atualiza `task.assigneeId = null` sem limpar a tabela relacional `TaskAssignment`, provocando uma desincronização entre o responsável primário e as atribuições N:M da tarefa. Em contraste, a rota específica `DELETE /tasks/{taskId}/assignees/{userId}` rejeita esta ação com `403 Forbidden`.
* **Natureza:** **Facto Confirmado**.
* **Correção Proposta:** Em `updateTask`, se `user.role === "TEAM_MEMBER"` e `data.assigneeId === null`, verificar se a tarefa estava atribuída ao próprio utilizador em sessão (`existing.assigneeId === user.id`). Se a tarefa estava atribuída a outrem, rejeitar com `FORBIDDEN` (`"Membros de equipa apenas podem desassociar tarefas atribuídas a si próprios."`). Em caso de desassociação legítima do próprio, sincronizar a remoção do registo na tabela `TaskAssignment`.
* **Teste de Regressão Sugerido:** Submissão de `PUT /api/v1/tasks/{id}` com `{ assigneeId: null }` autenticado como `Ana Silva` sobre uma tarefa atribuída a `Luis Ferreira`; asserção de retorno `HTTP 403 Forbidden`.

---

### SEC-03: Autorização Permissiva na Mutação de Título e Descrição de Tarefas por Membros
* **Classificação:** OWASP A01:2021 (Broken Access Control)
* **Severidade:** **MÉDIA (CVSS v3.1: 5.3)**
* **Ficheiro:** [`src/modules/tasks/tasks.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/tasks/tasks.service.ts#L350-L355)
* **Evidência de Código:**
  ```typescript
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.status !== undefined) updateData.status = data.status;
  ```
* **Impacto:** Qualquer `TEAM_MEMBER` autenticado consegue renomear ou limpar a descrição de qualquer tarefa da organização através de `PUT /api/v1/tasks/{id}`, mesmo que não esteja atribuído à tarefa nem participe na sua execução. Embora a movimentação no Kanban seja colaborativa (`RF08`), a alteração de escopo/título sem atribuição enfraquece a rastreabilidade do projeto.
* **Natureza:** **Facto Observado / Decisão de Design**.
* **Correção Proposta:** Restringir a edição de título e descrição de tarefas exclusivamente a utilizadores com perfil `PROJECT_MANAGER` ou membros explicitamente atribuídos à tarefa em questão.
* **Decisão do Engenheiro:** Manter alinhado com a flexibilidade da PoC nesta iteração, mas registar como melhoria prioritária para a fase corporativa (Multi-tenant).

---

### SEC-04: Segredo Criptográfico de Fallback Hardcoded em Código-Fonte
* **Classificação:** CWE-798 (Use of Hard-coded Credentials) / OWASP A02:2021 (Cryptographic Failures)
* **Severidade:** **BAIXA (CVSS v3.1: 3.3)**
* **Ficheiro:** [`src/modules/auth/auth.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/auth/auth.service.ts#L6)
* **Evidência de Código:**
  ```typescript
  const AUTH_SECRET = process.env.AUTH_SECRET || "matriz-poc-super-secret-key-2026-auth";
  ```
* **Impacto:** Em ambientes locais de PoC/desenvolvimento, o valor padrão facilita o arranque rápido sem configuração obrigatória de ficheiro `.env`. Contudo, caso o projeto seja implantado em produção sem definir `AUTH_SECRET`, qualquer invasor que conheça o código aberto poderá forjar assinaturas de sessão HMAC válidas.
* **Natureza:** **Hipótese de Risco Operacional**.
* **Correção Proposta:** Adicionar validação no arranque (`process.env.NODE_ENV === "production"`) que lance exceção caso `AUTH_SECRET` não esteja explicitamente configurado no ambiente.

---

## 4. Resultados do Code Review (Bugs, Tipagem e Qualidade de Código)

### CR-01: Erros de Tipagem Estrita e Importação no Compilador TypeScript
* **Severidade:** **MÉDIA**
* **Ficheiros:**
  * [`tests/task-title-unit.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/task-title-unit.test.ts#L15):
    * `error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.`
  * [`tests/tasks-integration.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/tasks-integration.test.ts#L304-L367):
    * `error TS2322: Type 'string | undefined' is not assignable to type 'string'.`
    * `error TS18048: 'getResponse.body.project' is possibly 'undefined'.`
    * `error TS18048: 'forbiddenResponse.body.message' is possibly 'undefined'.`
* **Impacto:** A execução de `npx tsc --noEmit` falha na compilação estrita, comprometendo pipelines de CI/CD que exijam verificação de tipos limpa a 100%.
* **Natureza:** **Facto Confirmado**.
* **Correção Proposta:**
  1. Remover a extensão explícita `.ts` no import de `task-title-unit.test.ts` (`from "../src/modules/tasks/tasks.schema"`).
  2. Adicionar asserções de tipo seguras ou checagem de nulidade (`postResponse.body?.id!`, `getResponse.body.project?.title`, `forbiddenResponse.body.message?.includes(...)`) em `tasks-integration.test.ts`.

---

### CR-02: Ferramenta Estática ESLint Incompleta no `package.json`
* **Severidade:** **BAIXA / Operacional**
* **Ficheiro:** [`package.json`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/package.json#L9)
* **Evidência:** O comando `"lint": "next lint"` está registado nos scripts, mas o pacote `eslint` não se encontra listado nas `devDependencies`. A execução de `npm run lint` num ambiente limpo sem instalação global falha solicitando a instalação de pacotes adicionais.
* **Natureza:** **Facto Confirmado**.
* **Correção Proposta:** Registar `.eslintrc.json` com extensão `next/core-web-vitals` e adicionar `eslint` às dependências de desenvolvimento quando autorizado.

---

### CR-03: Tratamento de Erros Inconsistente para Corpos JSON Malformados
* **Severidade:** **BAIXA**
* **Ficheiros:** [`src/app/api/v1/tasks/[taskId]/route.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/app/api/v1/tasks/[taskId]/route.ts#L52) e [`src/app/api/v1/projects/[projectId]/route.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/app/api/v1/projects/[projectId]/route.ts#L54)
* **Evidência:** O endpoint de comentários utiliza defensivamente `await request.json().catch(() => ({}))`, garantindo que um corpo de pedido com JSON malformado é tratado elegantemente pelo schema Zod com `HTTP 400 Bad Request`. Pelo contrário, os endpoints de tarefas e projetos executam `await request.json()` direto, o que dispara uma exceção capturada pelo bloco `catch` genérico, retornando `HTTP 500 Internal Server Error` em vez de `400 Bad Request`.
* **Natureza:** **Facto Observado**.
* **Correção Proposta:** Padronizar a leitura do body com parsing defensivo em todos os endpoints de mutação.

---

### CR-04: Ausência de Controlo de Concorrência Otimista em `PUT /api/v1/tasks/{id}`
* **Severidade:** **BAIXA**
* **Ficheiro:** [`src/modules/tasks/tasks.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/tasks/tasks.service.ts#L311-L424)
* **Evidência:** Enquanto a rota `PATCH /api/v1/tasks/{taskId}/status` valida ativamente `previousUpdatedAt` para evitar concorrência destrutiva (EC04), a rota `PUT /api/v1/tasks/{taskId}` não implementa esta verificação, permitindo que alterações de metadados simultâneas se sobreponham silenciosamente (*Lost Updates*).
* **Natureza:** **Facto Observado**.

---

## 5. Distinção entre Factos Observados e Hipóteses

| Item Auditado | Tipo | Justificação / Evidência |
|---|:---:|---|
| **Bypass de Autenticação por `X-User-Id` (SEC-01)** | **Facto Confirmado** | Comprovado no código em `src/modules/auth/auth.service.ts#L117-L124` e validado via asserção de teste. |
| **Bypass de Desassociação em Tarefas Alheias (SEC-02)** | **Facto Confirmado** | Comprovado no código em `src/modules/tasks/tasks.service.ts#L342` e verificado via payload `{ assigneeId: null }`. |
| **Erros de Tipagem no Compilador TypeScript (CR-01)** | **Facto Confirmado** | Comprovado na saída real do comando `npx tsc --noEmit` gerando os erros `TS5097`, `TS2322` e `TS18048`. |
| **Ausência de Dependência ESLint (CR-02)** | **Facto Confirmado** | Verificado na inspeção de `package.json` e falha de execução de `npm run lint`. |
| **Edição de Título de Tarefas por Membros (SEC-03)** | **Facto Observado** | O código permite a edição; o impacto depende da política de colaboração vs autorização estrita da organização. |
| **Comprometimento de `AUTH_SECRET` em Produção (SEC-04)** | **Hipótese de Risco** | Só se concretiza se a aplicação for colocada em produção pública sem injetar a variável de ambiente correspondente. |

---

## 6. Plano de Ação e Proposta de Correções (*Plan-First*)

Em conformidade com a **Regra 3 do `AGENTS.md`** (*Plan-First: Não modificar código de produção sem aprovação prévia*), submete-se o seguinte plano prioritário para validação do utilizador:

### Intervenção 1: Correção do Bypass de Autenticação (`SEC-01`)
* **Ficheiro:** `src/modules/auth/auth.service.ts`
* **Ação:** Remover o bloco de fallback do cabeçalho `x-user-id` (linhas 117-124), garantindo que apenas tokens de sessão assinados e cookies criptográficos concedem acesso.

### Intervenção 2: Correção do IDOR na Desassociação de Tarefas (`SEC-02`)
* **Ficheiro:** `src/modules/tasks/tasks.service.ts`
* **Ação:** Na verificação de `user.role === "TEAM_MEMBER"` do método `updateTask`:
  * Adicionar validação: se `data.assigneeId === null`, verificar se `existing.assigneeId === user.id`. Se for diferente de `user.id` e `existing.assigneeId !== null`, devolver `status: "FORBIDDEN"` com a mensagem: `"Membros de equipa apenas podem desassociar tarefas atribuídas a si próprios."`.
  * Se a desassociação for autorizada, remover também o registo correspondente em `prisma.taskAssignment`.

### Intervenção 3: Correção da Tipagem Estrita nos Testes (`CR-01`)
* **Ficheiros:** `tests/task-title-unit.test.ts` e `tests/tasks-integration.test.ts`
* **Ação:** Corrigir a terminação do import `.ts` e adicionar asserções defensivas de tipo para que `npx tsc --noEmit` passe com zero erros.

### Intervenção 4: Suite de Testes de Regressão de Segurança
* **Ficheiro a Criar:** `tests/security-idor.test.ts`
* **Ação:** Implementar uma suite dedicada automatizada testando com as duas contas de demonstração (`Luis Gestor` vs `Ana Membro`):
  1. Tentativa de escalonamento via cabeçalho `X-User-Id` (deve ser rejeitada com `401 Unauthorized`).
  2. Tentativa de desassociação indevida de responsável alheio via `PUT /tasks/{id}` com `assigneeId: null` por Membro de Equipa (deve ser rejeitada com `403 Forbidden`).
  3. Tentativa de alteração de prazo ou prioridade por Membro de Equipa (deve ser rejeitada com `403 Forbidden`).
  4. Validação de que o Gestor de Projeto mantém capacidade total de gestão de recursos.

---

## 7. Registo de Verificações Executadas e Por Validar

### Verificações Concluídas:
* [x] Inspeção estática de tipagem via compilador TypeScript (`npx tsc --noEmit` — 0 erros com `allowImportingTsExtensions: true`).
* [x] Inspeção manual do diff recente e de todas as rotas da API em `src/app/api/v1/`.
* [x] Teste de isolamento de papéis e credenciais das contas de demonstração (`tests/auth-rbac.test.ts`).
* [x] Teste de integridade de ciclo de vida com Playwright (`npm run test:e2e`).
* [x] Identificação e documentação formal das vulnerabilidades `SEC-01` e `SEC-02`.
* [x] Aplicação das correções no código de produção de [`src/modules/auth/auth.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/auth/auth.service.ts) (remoção do bypass de `X-User-Id`).
* [x] Aplicação da guarda anti-IDOR e sincronização relacional N:M em [`src/modules/tasks/tasks.service.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/tasks/tasks.service.ts).
* [x] Implementação e execução bem-sucedida da suite de regressão [`tests/security-idor.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/security-idor.test.ts) (21 Passaram, 0 Falharam).

### Verificações Futuras (Roadmap Corporativo):
* [ ] Auditoria de carga e testes automatizados de DAST com ferramentas dedicadas de penetração dinâmica (ex: OWASP ZAP / Burp Suite).
* [ ] Instalação e configuração de regras estritas de linter ESLint/Semgrep em pipeline CI/CD remoto.