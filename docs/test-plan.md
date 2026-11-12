# Plano de Testes com IA — Plataforma Matriz

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Contexto:** Ficha Prática Laboratorial 04 — Exercício 1 (Plano de Testes com IA)
* **Funcionalidade em Teste:** **Gestão de Tarefas e Controlo de Permissões/Acessos (RBAC)**
* **Documentos de Referência:** [`AGENTS.md`](../AGENTS.md) | [`docs/requirements.md`](requirements.md) | [`docs/user-stories.md`](user-stories.md) | [`docs/constraints.md`](constraints.md) | [`docs/architecture.md`](architecture.md) | [`openapi.yaml`](../openapi.yaml)
* **Data:** 12 de Novembro de 2026
* **Versão:** 1.0 — Plano Aprovado para Execução

---

## 1. Enquadramento e Objetivos

O objetivo deste plano de testes é estabelecer uma estratégia rigorosa de garantia de qualidade (QA) para o módulo de **Gestão de Tarefas e Permissões** da plataforma **Matriz**, definindo os cenários com base nos **Requisitos Funcionais (`requirements.md`)**, nos **Critérios de Aceitação BDD (`user-stories.md`)** e no **Contrato da API (`openapi.yaml`)**, evitando testar meramente os comportamentos acidentais da implementação atual.

A abordagem combina a geração assistida por IA de cenários de teste com a **supervisão e revisão crítica humana (*Human-in-the-Loop*)**, garantindo que:
1. Validações de limites e inputs defensivos são exaustivamente verificadas.
2. O ciclo de vida e a integridade referencial relacional persistem sem efeitos secundários indesejados.
3. As barreiras de autorização baseadas em papéis (**RBAC**) e a proteção contra acessos indevidos a nível de objeto (**BOLA / IDOR**) impedem o escalonamento de privilégios.

---

## 2. Matriz Concisa de Cenários de Teste (Tarefas & Permissões)

A matriz abaixo sistematiza os cenários identificados, cobrindo os três níveis da pirâmide de testes: **Unitário**, **Integração** e **End-to-End (E2E)**.

| ID Cenário | Requisito / Origem | Nível de Teste | Descrição do Cenário | Entradas / Dados de Teste | Resultado Esperado |
|:---:|:---:|:---:|---|---|---|
| **TC-VAL-01** | `RF04`, `US02` | **Unitário** (Schema) | Título de tarefa vazio ou com espaços | `{ title: "   ", priority: "MEDIUM" }` | Rejeição imediata com `HTTP 400 Bad Request` e detalhe `"Título deve ter pelo menos 3 carateres"`. |
| **TC-VAL-02** | `RF04`, `US02` | **Unitário** (Schema) | Título de tarefa abaixo do limite mínimo (< 3 carateres úteis) | `{ title: "  ab  " }` | Rejeição com `HTTP 400 Bad Request`. |
| **TC-VAL-03** | `RF04`, `US02` | **Unitário** (Schema) | Título de tarefa acima do limite máximo (> 150 carateres) | `{ title: "A".repeat(151) }` | Rejeição com `HTTP 400 Bad Request` indicando excesso de caracteres. |
| **TC-VAL-04** | `RF04`, `EC02` | **Integração** (Serviço) | Incoerência temporal de datas (`due_date` anterior a `project.startDate`) | Projeto com início em `2026-11-15`, tarefa com prazo `2026-11-10` | Rejeição com `HTTP 400 Bad Request` e mensagem de incoerência temporal (`EC02`). |
| **TC-FUNC-01** | `RF04`, `US02` | **Integração** (API/BD) | Criação de tarefa válida no backlog pelo Gestor | Gestor autenticado, payload válido com título `"Implementar Testes E2E"`, prioridade `"HIGH"`, prazo `"2026-11-30"` | Resposta `HTTP 201 Created`, tarefa persistida no SQLite com status predefinido `TODO`. |
| **TC-FUNC-02** | `RF04`, `US02` | **Integração** (API/BD) | Consulta de tarefa por identificador (`GET /tasks/{id}`) | ID da tarefa criada em `TC-FUNC-01` | Resposta `HTTP 200 OK`, JSON contendo todos os atributos, projeto associado e array de responsáveis/comentários. |
| **TC-FUNC-03** | `RF08`, `US03` | **Integração** (API) | Transição de estado no Kanban (`PATCH /tasks/{id}/status`) | Membro autenticado atualiza tarefa de `TODO` para `IN_PROGRESS` | Resposta `HTTP 200 OK`, status atualizado, `updatedAt` recalculado no servidor. |
| **TC-SEC-01** | `RF05`, `US02 (Cenário 2.3)` | **Integração** (Segurança) | Membro de Equipa tenta alterar data limite (`due_date`) de tarefa | Membro autenticado envia `PUT/PATCH /tasks/{id}` alterando `dueDate` | Bloqueio estrito com `HTTP 403 Forbidden` (`"Apenas Gestores de Projeto podem alterar prazos"`). |
| **TC-SEC-02** | `RNF04`, `constraints.md` | **Integração** (Segurança) | Pedido à API de tarefas sem cookie de sessão ou com token inválido | `GET /projects/{id}/tasks` ou `POST /tasks` sem cabeçalho `Cookie` | Rejeição com `HTTP 401 Unauthorized` e sem fuga de metadados da base de dados. |
| **TC-SEC-03** | `RF05`, `requirements.md` | **Integração** (Segurança) | Membro de Equipa tenta eliminar tarefa de um projeto | Membro autenticado envia `DELETE /tasks/{id}` | Bloqueio com `HTTP 403 Forbidden` (exclusivo para `PROJECT_MANAGER`). |
| **TC-SEC-04** | Risco BOLA / IDOR | **Integração** (Segurança) | Manipulação de identificador de projeto no pedido de criação | Utilizador tenta criar tarefa associada a um `projectId` inexistente ou inacessível | Rejeição com `HTTP 404 Not Found` ou `HTTP 403 Forbidden` sem criação de registos órfãos. |
| **TC-E2E-01** | `RF04-RF08`, `RNF01` | **End-to-End** (Frontend/API) | Fluxo completo do ciclo de vida da tarefa na interface | Gestor cria tarefa, Membro assume execução, move para `DONE` e insere comentário | Estado e contadores do Dashboard atualizam reativamente sem recarregamento de página. |

---

## 3. Seleção dos Cenários Essenciais

Conforme estipulado no guião da Ficha Prática 4 (Exercício 1), foram selecionados **três cenários essenciais** representativos para execução e validação aprofundada:

### Cenário Essencial 1: Título Inválido (Validação Defensiva de Input)
* **Identificador:** `TC-VAL-01` / `TC-VAL-02`
* **Nível de Teste:** Unitário e Integração de Schema.
* **Justificação:** O título da tarefa é o atributo identificador primário no quadro Kanban. Espaços em branco acidentais, inputs vazios ou payloads excessivos corrompem a interface e geram cartões invisíveis ou quebras de layout. É imperativo que a camada de validação defensiva Zod rejeite ativamente estes casos com respostas explicativas (`HTTP 400 Bad Request`).

### Cenário Essencial 2: Criação e Consulta de Tarefa (Operação Funcional & Persistência)
* **Identificador:** `TC-FUNC-01` e `TC-FUNC-02`
* **Nível de Teste:** Integração de API com persistência relacional SQLite.
* **Justificação:** Garante o percurso crítico (*Happy Path*) da entidade nuclear do MVP. O teste cria a tarefa via API autenticada, verifica a correta inserção relacional no SQLite com campos predefinidos (`status: TODO`, `priority: MEDIUM`) e consulta posteriormente o registo por chave primária, validando que os dados retornados coincidem rigorosamente com os inseridos e com o contrato OpenAPI.

### Cenário Essencial 3: Acesso de Utilizador sem Autorização (Segurança RBAC & Prazos)
* **Identificador:** `TC-SEC-01`
* **Nível de Teste:** Integração de API e Autorização de Segurança.
* **Justificação:** O Critério de Aceitação 2.3 da `US02` define explicitamente que Membros de Equipa não possuem autorização para alterar a data limite de tarefas (`due_date`), mesmo que a tarefa lhes esteja atribuída. A validação não pode depender apenas de desabilitar o campo na interface web; o backend deve inspecionar a sessão ativa e devolver terminantemente `HTTP 403 Forbidden` quando um Membro tenta mutar o prazo via chamada direta à API.

---

## 4. Revisão das Sugestões da IA e Correção de Pressupostos

Durante a sessão de trabalho com a IA, foram identificados e retificados três pressupostos incorretos ou incompletos propostos pelo modelo:

### 1. Distinção entre Validação Sintática e Validação Semântica de Permissões
* **Sugestão Inicial da IA:** A IA propôs unificar os testes de erro tratando códigos HTTP 400 e 403 numa categoria genérica de "Erros de Pedido".
* **Correção Humana:** O programador determinou a separação estrita:
  * Erros de validação de dados sintáticos (ex: strings vazias, títulos curtos, tipos errados) devem devolver rigorosamente `HTTP 400 Bad Request` com o formato `ErrorResponse`.
  * Erros de autorização e privilégios (ex: perfil não autorizado a mudar prazos ou eliminar tarefas) devem devolver rigorosamente `HTTP 403 Forbidden`.
  * Ausência de autenticação deve devolver `HTTP 401 Unauthorized`.

### 2. Alinhamento com o Modelo de Dados Real (Atribuições N:M vs. Atributo Escalar)
* **Sugestão Inicial da IA:** A IA sugeriu enviar o campo `assigneeId` diretamente no corpo de criação de tarefa (`POST /api/v1/projects/{id}/tasks`).
* **Correção Humana:** O programador corrigiu o pressuposto recordando que, na Ficha 3 (Exercício 6), a plataforma Matriz evoluiu para múltiplos responsáveis por tarefa através da tabela de junção relacional `TaskAssignment` com restrição anti-duplicados `@@unique([taskId, userId])` e endpoints dedicados `/tasks/{taskId}/assignees`. O plano de testes foi ajustado para refletir este modelo real.

### 3. Isolamento do Ambiente de Testes e Prevenção de Efeitos Secundários
* **Sugestão Inicial da IA:** A IA propôs executar os novos testes diretamente sobre a base de dados SQLite de desenvolvimento (`prisma/dev.db`) sem controlo de ciclo de vida.
* **Correção Humana:** O programador rejeitou este procedimento para não adulterar os dados das contas de demonstração e dos projetos de teste existentes. Ficou definido que os novos testes devem:
  * Utilizar transações ou IDs de teste únicos com prefixo identificável (`TEST-FP4-...`).
  * Conter blocos `finally` de limpeza garantida (*teardown* relacional sem deixar registos órfãos).
  * Permitir execução isolada via comando Node.js dedicado.

---

## 5. Estratégia de Implementação e Ferramental

* **Linguagem & Runtime:** TypeScript executado nativamente sobre Node.js (v20+ / v26+).
* **Módulo de Asserções:** `node:assert/strict` para asserções determinísticas sem dependências externas adicionais.
* **Camada de Teste:**
  * Testes de validação unitária e schemas: execução direta sobre os schemas Zod de `src/modules/tasks/tasks.schema.ts`.
  * Testes de integração de API: invocação direta dos route handlers Next.js (`POST`, `GET`, `PATCH`, `DELETE`) simulando pedidos HTTP (`NextRequest`) com cookies de sessão assinados e cabeçalhos adequados.
  * Verificação relacional: inspeção direta no SQLite via cliente singleton Prisma (`src/lib/prisma.ts`).
* **Ficheiro de Execução Previsto:** `tests/test-plan-tasks.test.ts`.

---

## 6. Critérios de Sucesso do Exercício 1

* [x] Matriz de cenários concisa e rastreável aos requisitos `RF04-RF09`, `US02`, `US03`, `US04` e `openapi.yaml`.
* [x] Seleção clara dos três cenários essenciais (título inválido, criação/consulta de tarefa e acesso sem autorização).
* [x] Registo detalhado da revisão humana e correção dos pressupostos da IA.
* [x] Documento [`docs/test-plan.md`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/docs/test-plan.md) formalmente registado no repositório.

---

## 7. Registo de Execução do Exercício 2 — Testes Unitários da Regra do Título

* **Regra de Negócio Selecionada:** Validação do Título de uma Tarefa ([`src/modules/tasks/tasks.schema.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/modules/tasks/tasks.schema.ts)).
  * *Requisitos:* `RF04` (Criação de Tarefas) e `US02` (Critérios de Aceitação de Título).
  * *Regra Formal:* String obrigatória com comprimento útil entre **3 e 150 caracteres**, aplicando `.trim()` defensivo prévio e rejeitando ativamente strings vazias ou compostas exclusivamente por caracteres de espaçamento (*whitespace-only*).
* **Ficheiro de Testes Implementado:** [`tests/task-title-unit.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/task-title-unit.test.ts).
* **Framework de Execução:** `node:assert/strict` sobre o runtime nativo de Node.js.

### 7.1 Cenários Testados e Resultados

| Grupo | ID Teste | Descrição da Asserção | Entrada de Teste | Resultado Esperado | Resultado Observado |
|---|---|---|---|:---:|:---:|
| **Casos Válidos** | `TC-VAL-01` | Título padrão comum dentro do intervalo | `"Implementar autenticação JWT no backend"` | Aceite (`success = true`) | ✅ **PASS** |
| | `TC-VAL-02` | Título com espaços nos extremos higienizado pelo trim | `"   Criar testes unitários para a regra do título   "` | Aceite com trim | ✅ **PASS** |
| | `TC-VAL-03` | Título com caracteres acentuados e pontuação UTF-8 | `"Refatoração & Análise de Métricas: Relatório #123"` | Aceite | ✅ **PASS** |
| **Casos Inválidos** | `TC-INV-01` | Título completamente vazio (`""`) | `""` | Rejeitado (`success = false`) | ✅ **PASS** |
| | `TC-INV-02` | Título composto exclusivamente por espaços | `"     "` | Rejeitado (comprimento 0 pós-trim) | ✅ **PASS** |
| | `TC-INV-03` | Título com tabs e quebras de linha (`\t\n\r`) | `"  \t \n  \r\n  "` | Rejeitado pós-trim | ✅ **PASS** |
| | `TC-INV-04` | Título ausente / undefined | `{}` | Rejeitado com mensagem de campo obrigatório | ✅ **PASS** |
| | `TC-INV-05` | Título com tipo inválido (número) | `123456` | Rejeitado por erro de tipo Zod | ✅ **PASS** |
| **Valores-Limite (BVA)** | `TC-BND-01` | **Limite inferior exato (3 caracteres)** | `"Fix"` | Aceite | ✅ **PASS** |
| | `TC-BND-02` | **Imediatamente abaixo do limite inferior (2 caracteres)** | `"AB"` | Rejeitado (< 3 carateres) | ✅ **PASS** |
| | `TC-BND-03` | **2 caracteres úteis com espaços de preenchimento** | `"  ab  "` (tam. bruto 6) | Rejeitado (tam. útil 2) | ✅ **PASS** |
| | `TC-BND-04` | **Limite superior exato (150 caracteres)** | `"T".repeat(150)` | Aceite | ✅ **PASS** |
| | `TC-BND-05` | **Imediatamente acima do limite superior (151 caracteres)** | `"T".repeat(151)` | Rejeitado (> 150 carateres) | ✅ **PASS** |

### 7.2 Análise de Incoerências da IA e Prevenção de Falsos Verdes

Durante a elaboração dos testes com IA, identificou-se uma armadilha crítica de testes:
1. **Incoerência no Teste de Espaços:** A IA poderia sugerir que a entrada `"  ab  "` deveria ser válida porque o seu tamanho bruto em JavaScript é `6` (`"  ab  ".length === 6`), satisfazendo `.min(3)`.
2. **Tentativa Falsa de Ajuste da Regra:** Se o teste esperasse `true`, a execução falharia porque o schema aplica `.trim()`, resultando em `"ab"` (tamanho 2). Um agente descuidado poderia ser tentado a remover o `.trim()` da regra de negócio para "obter o teste verde".
3. **Decisão e Correção Humana (*Human-in-the-Loop*):** O requisito funcional `RF04` é taxativo: o título deve ter 3 caracteres **úteis** e não pode aceitar espaços vazios para contornar o limite mínimo. Por conseguinte, manteve-se a regra de negócio intacta em `src/modules/tasks/tasks.schema.ts` e garantiu-se que o teste `TC-BND-03` assere estritamente a **rejeição defensiva** (`result.success === false`).

### 7.3 Evidência de Execução
```bash
node tests/task-title-unit.test.ts
# Resultado: 13 Passaram, 0 Falharam (100% de sucesso)
```

---

## 8. Registo de Execução do Exercício 3 — Testes de Integração de API & Persistência

* **Objetivo:** Validar o ciclo completo da API e a persistência física relacional em ambiente isolado e controlado, com limpeza garantida pós-execução.
* **Ficheiro de Testes Implementado:** [`tests/tasks-integration.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/tasks-integration.test.ts).
* **Framework de Execução:** Node.js nativo com Prisma ORM e `node:assert/strict`.

### 8.1 Cenários de Integração Validados

| Fluxo | ID Cenário | Operação API | Condição / Entrada | Status HTTP | Resultado Observado |
|---|---|---|---|:---:|:---:|
| **Positivo** | `TC-INT-01` | `POST /projects/{id}/tasks` | Gestor cria tarefa com dados válidos e prazo futuro | `201 Created` | ✅ **PASS** (UUID gerado, `status: TODO`, `isOverdue: false`) |
| | `TC-INT-02` | `GET /tasks/{taskId}` | Consulta por ID da tarefa recém-criada | `200 OK` | ✅ **PASS** (Dados conferem com os persistidos e projeto associado) |
| | `TC-INT-03` | SQLite Direct Query | Inspeção direta na tabela `Task` via Prisma | N/A | ✅ **PASS** (Registo persistido no ficheiro local `prisma/dev.db`) |
| **Negativo** | `TC-INT-NEG-01` | `POST /projects/{id}/tasks` | Título composto exclusivamente por espaços em branco | `400 Bad Request` | ✅ **PASS** (`error: Bad Request`, `details` preenchido) |
| | `TC-INT-NEG-02` | `GET /tasks/{taskId}` | Consulta de ID de tarefa inexistente (`00000000-...`) | `404 Not Found` | ✅ **PASS** (`message: Tarefa não encontrada.`) |
| | `TC-INT-NEG-03` | `POST /projects/{id}/tasks` | Tentativa de criar tarefa em projeto inexistente | `404 Not Found` | ✅ **PASS** (`message: Projeto pai não encontrado.`) |
| | `TC-INT-NEG-04` | `POST /projects/{id}/tasks` | Membro de Equipa tenta definir data limite (`dueDate`) | `403 Forbidden` | ✅ **PASS** (Violação RBAC bloqueada no backend) |
| | `TC-INT-NEG-05` | `POST /projects/{id}/tasks` | Pedido sem cabeçalho de autenticação ou cookie | `401 Unauthorized` | ✅ **PASS** (Bloqueio por ausência de sessão) |
| **Isolamento** | `TC-INT-CLEAN` | Teardown relacional | Limpeza automática em bloco `finally` | N/A | ✅ **PASS** (0 tarefas órfãs, 0 projetos de teste remanescentes) |

### 8.2 Garantia de Isolamento e Reposição de Estado
* Cada execução gera dinamicamente um projeto com timestamp único (`TEST-FP4-PROJETO-...`).
* O bloco `finally` executa `prisma.task.deleteMany` e `prisma.project.delete` eliminando rigorosamente todas as entidades geradas durante a execução.
* Asserções explícitas confirmam que a contagem de tarefas e projetos de teste é igual a `0` após a limpeza, garantindo que as contas e tarefas de demonstração do seed permanecem 100% inalteradas.

### 8.3 Evidência de Execução
```bash
node tests/tasks-integration.test.ts
# Resultado: 33 Passaram, 0 Falharam (100% de sucesso)
```

---

## 9. Registo de Execução do Exercício 4 — Testes End-to-End (E2E) com Playwright

* **Objetivo:** Validar o percurso funcional completo do utilizador através da interface gráfica real em navegador headless:
  $$\text{Autenticar no Sistema} \longrightarrow \text{Navegar para Tarefas} \longrightarrow \text{Criar Tarefa no Modal} \longrightarrow \text{Validar Tarefa na Listagem}$$
* **Framework:** `@playwright/test` com navegador Chromium em modo headless.
* **Configuração:** [`playwright.config.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/playwright.config.ts) (com arranque automático do servidor Next.js em `http://localhost:3000`).
* **Ficheiro de Teste Implementado:** [`tests/e2e/task-lifecycle.spec.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/e2e/task-lifecycle.spec.ts).

### 9.1 Seletores Estáveis Utilizados (Baseados no Código Real)

| Ação no Fluxo | Seletor Estável Utilizado | Justificação Técnica |
|---|---|---|
| **Login (Email)** | `input[type="email"]` | Input semântico standard em [`src/app/login/page.tsx`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/app/login/page.tsx). |
| **Login (Password)** | `input[type="password"]` | Input semântico protegido para palavra-passe. |
| **Login (Submissão)** | `button:has-text("Entrar no Sistema")` | Botão primário do formulário de autenticação. |
| **Navegação (Tarefas)** | `nav button:has-text("Tarefas")` | Aba de navegação da [`TopBar.tsx`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/src/components/layout/TopBar.tsx). |
| **Abertura do Modal** | `button:has-text("Nova Tarefa")` | Botão de ação rápida que aciona `setIsCreateOpen(true)`. |
| **Modal / Formulário** | `form:has-text("Título da Tarefa")` | Escopo defensivo do formulário do modal para evitar conflitos com seletores da página base. |
| **Título da Tarefa** | `modalForm.locator('input[type="text"]')` | Campo de título obrigatório no modal. |
| **Descrição** | `modalForm.locator('textarea')` | Textarea de detalhes da tarefa. |
| **Prioridade** | `modalForm.locator('select').first()` | Dropdown de seleção de prioridade (`LOW`, `MEDIUM`, `HIGH`). |
| **Submissão do Modal** | `modalForm.locator('button[type="submit"]')` | Botão `"Criar Tarefa"` que despacha a mutação à API. |
| **Card na Listagem** | `page.getByRole("heading", { name: uniqueTaskTitle })` | Elemento `<h4>` renderizado no card, distinguindo do toast de sucesso. |
| **Badges de Estado/Prioridade**| `taskCard.getByText("Prioridade: Alta")` e `"A Fazer"` | Badges visuais de conformidade na interface. |

### 9.2 Diagnóstico de Falhas e Refinamento de Seletores (*Trace / Screenshot Analysis*)

Conforme exigido pelo guião (*"analisar screenshots, traces ou logs apenas quando necessários para diagnosticar falhas"*), durante a execução inicial foram diagnosticados e corrigidos três pontos de precisão:

1. **Ambiguidade no Dropdown de Prioridade:**
   * *Diagnóstico:* O seletor genérico `page.locator('select').first()` capturava o seletor de projeto localizado no fundo da página atrás do modal, falhando por timeout ao tentar selecionar `'HIGH'`.
   * *Correção:* Escopou-se o seletor exclusivamente dentro do formulário do modal (`modalForm.locator('select').first()`).
2. **Badge do Utilizador na TopBar:**
   * *Diagnóstico:* O teste esperava o texto completo `"Gestor de Projeto"`, mas na `TopBar.tsx` a badge compacta do utilizador autenticado exibe `"Gestor"`.
   * *Correção:* Ajustou-se a asserção para verificar o texto exato `"Gestor"`.
3. **Modo Estrito no Título da Tarefa:**
   * *Diagnóstico:* Ao validar `page.getByText(uniqueTaskTitle)`, o Playwright detetou 2 elementos: o banner de notificação (*toast*) `"Tarefa '...' criada com sucesso"` e o card na listagem.
   * *Correção:* Utilizou-se o seletor semântico `page.getByRole('heading', { name: uniqueTaskTitle })`, garantindo que se assere a presença física do card da tarefa na lista de trabalho.

### 9.3 Isolamento, Limpeza e Repetibilidade
* O teste utiliza um título único dinâmico (`Tarefa E2E Playwright <timestamp>`).
* O hook `test.afterAll` invoca o Prisma Client eliminando a tarefa gerada na base de dados SQLite, assegurando total idempotência e zero poluição entre execuções subsequentes.

### 9.4 Evidência de Execução
```bash
npm run test:e2e
# ou: npx playwright test
```
```text
Running 1 test using 1 worker

🧹 Teardown E2E: Tarefa 'Tarefa E2E Playwright 1794509701426' removida da base de dados.
  ✓  1 [chromium] › tests\e2e\task-lifecycle.spec.ts:24:3 › Fluxo E2E: Autenticação, Abertura de Projeto, Criação e Verificação de Tarefa › Deve autenticar como Gestor, navegar para Tarefas, criar uma nova tarefa e validá-la na listagem (1.1s)

  1 passed (4.4s)
```

---

## 10. Registo do Exercício 5 — Code Review, Security Review e Regressão de IDOR

* **Objetivo:** Auditar o código recente, analisar vulnerabilidades de Broken Access Control e IDOR através das duas contas de demonstração (`Luis Gestor` vs `Ana Membro`), e definir cenários de teste de regressão para as correções aplicadas.
* **Documento Detalhado de Auditoria:** [`docs/quality-security-review.md`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/docs/quality-security-review.md).
* **Ficheiro de Testes de Regressão Previsto:** [`tests/security-idor.test.ts`](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/tests/security-idor.test.ts).

### 10.1 Cenários de Regressão de Segurança (IDOR & Broken Authentication)

| ID Cenário | Requisito / Vulnerabilidade | Operação API | Ator / Credenciais | Dados do Pedido | Resultado Esperado |
|---|---|---|---|---|:---:|
| **TC-SEC-05** | `SEC-01` (Bypass de Auth) | `GET /api/v1/auth/me` | Cliente não autenticado com `X-User-Id` | Cabeçalho `X-User-Id: <id-gestor>` | `401 Unauthorized` (Bypass bloqueado) |
| **TC-SEC-06** | `SEC-02` (IDOR em Desassociação) | `PUT /api/v1/tasks/{id}` | Ana Silva (`TEAM_MEMBER`) | Tarefa de Luis Ferreira com `{ assigneeId: null }` | `403 Forbidden` (`"Membros apenas podem desassociar tarefas atribuídas a si próprios"`) |
| **TC-SEC-07** | `SEC-02` (Desassociação Própria) | `PUT /api/v1/tasks/{id}` | Ana Silva (`TEAM_MEMBER`) | Tarefa atribuída a Ana com `{ assigneeId: null }` | `200 OK` (Permitido com limpeza de `TaskAssignment`) |
| **TC-SEC-08** | `SEC-02` (Gestão pelo Gestor) | `PUT /api/v1/tasks/{id}` | Luis Ferreira (`PROJECT_MANAGER`) | Qualquer tarefa com `{ assigneeId: null }` ou novo ID | `200 OK` (Privilégio total mantido) |

### 10.2 Resultados Observados e Evidência de Execução

| ID Cenário | Descrição do Teste | Resultado Esperado | Resultado Observado | Estado |
|---|---|:---:|:---:|:---:|
| `TC-SEC-05` | Forjamento de identidade apenas com `X-User-Id` | `null` / `401 Unauthorized` | Rejeitado (Retornou `null`) | ✅ **PASS** |
| `TC-SEC-06` | Membro tenta desassociar tarefa do Gestor | `403 Forbidden` | Bloqueado com `403 Forbidden` | ✅ **PASS** |
| `TC-SEC-07` | Membro desassocia a sua própria tarefa | `200 OK` + sincronização N:M | Aceite (`200 OK`) e N:M limpo | ✅ **PASS** |
| `TC-SEC-08` | Gestor desassocia e reatribui tarefas livremente | `200 OK` em ambas | Aceite com integridade total | ✅ **PASS** |

```bash
node tests/security-idor.test.ts
```
```text
================================================================================
🛡️ FICHA PRÁTICA 4 — EXERCÍCIO 5: TESTES DE REGRESSÃO DE SEGURANÇA E IDOR
================================================================================

--------------------------------------------------------------------------------
0. Preparação de Dados e Contas de Demonstração
--------------------------------------------------------------------------------
  ✅ [PASS] Conta de demonstração Gestor disponível (Luis Ferreira)
  ✅ [PASS] Conta de demonstração Membro disponível (Ana Silva)
  ✅ [PASS] Projeto isolado criado no SQLite
  ✅ [PASS] Tarefa 1 criada e atribuída a Luis Ferreira
  ✅ [PASS] Tarefa 2 criada e atribuída a Ana Silva

--------------------------------------------------------------------------------
1. Regressão SEC-01: Rejeição de Injeção de Identidade via Cabeçalho X-User-Id
--------------------------------------------------------------------------------
  ✅ [PASS] TC-SEC-05: Pedido apenas com cabeçalho 'X-User-Id' não autentica utilizador (Retorna null / 401)
  ✅ [PASS] Autenticação legítima com token assinado HMAC-SHA256 concedida com sucesso

--------------------------------------------------------------------------------
2. Regressão SEC-02: Prevenção de IDOR em Desassociação via PUT /tasks/{id}
--------------------------------------------------------------------------------
  ✅ [PASS] TC-SEC-06: Membro de Equipa é bloqueado com HTTP 403 Forbidden ao tentar desassociar tarefa alheia
  ✅ [PASS] Mensagem de segurança informativa retornada pela API
  ✅ [PASS] Estado na base de dados SQLite inalterado: responsável primário preservado como Luis Ferreira
  ✅ [PASS] Registo relacional na tabela TaskAssignment preservado sem corrupção

--------------------------------------------------------------------------------
3. Regressão SEC-02: Desassociação Legítima da Própria Tarefa por Membro
--------------------------------------------------------------------------------
  ✅ [PASS] TC-SEC-07: Membro de Equipa consegue desassociar com sucesso a tarefa que lhe está atribuída
  ✅ [PASS] Atributo assigneeId atualizado para null no SQLite
  ✅ [PASS] Sincronização relacional: registo correspondente em TaskAssignment removido sem deixar órfãos

--------------------------------------------------------------------------------
4. Regressão SEC-02 & RBAC: Privilégios Integrais do Gestor de Projeto
--------------------------------------------------------------------------------
  ✅ [PASS] TC-SEC-08: Gestor de Projeto possui privilégio total para desassociar qualquer tarefa
  ✅ [PASS] Gestor de Projeto reatribui com sucesso a tarefa a outro membro

--------------------------------------------------------------------------------
5. Regressão RBAC: Bloqueio de Prazos, Prioridades e Eliminação por Membro
--------------------------------------------------------------------------------
  ✅ [PASS] Membro de Equipa é bloqueado ao tentar alterar a prioridade da tarefa (HTTP 403)
  ✅ [PASS] Membro de Equipa é bloqueado ao tentar alterar a data limite da tarefa (HTTP 403)
  ✅ [PASS] Membro de Equipa é bloqueado ao tentar atribuir a tarefa a um terceiro (HTTP 403)

--------------------------------------------------------------------------------
6. Teardown e Limpeza de Estado (Isolamento Garantido)
--------------------------------------------------------------------------------
  🧹 Limpeza: 1 registos TaskAssignment removidos.
  🧹 Limpeza: 2 tarefas de teste removidas.
  🧹 Limpeza: Projeto de teste removido.
  ✅ [PASS] Nenhuma tarefa órfã permaneceu na base de dados SQLite
  ✅ [PASS] Projeto de teste removido integralmente do SQLite

================================================================================
RESUMO DA SUITE DE SEGURANÇA & IDOR: 21 Passaram, 0 Falharam.
================================================================================
```


