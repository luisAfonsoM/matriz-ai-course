# Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas

[![Course](https://img.shields.io/badge/Curso-Agentic%20Software%20Development-blue.svg)](https://github.com)
[![Status](https://img.shields.io/badge/Status-Ficha%203%20Conclu%C3%ADda%20(MVP%20Entregue)-success.svg)](docs/verification.md)
[![Paradigma](https://img.shields.io/badge/Paradigma-Agentic%20Approach-purple.svg)](README.md)

**Matriz** é uma aplicação web colaborativa desenvolvida de raiz para capacitar equipas a organizar os seus projetos, gerir tarefas de forma ágil e acompanhar o progresso das entregas com métricas em tempo real.

O projeto serve como Prova de Conceito (PoC) prática no contexto do curso sobre **Desenvolvimento de Software com Abordagem Agêntica (*Agentic Approach*)**, demonstrando como agentes autónomos de IA e engenheiros humanos colaboram desde a elicitação de requisitos até à implementação e teste do software.

---

## 1. Problema que Pretende Resolver

Em muitas organizações e equipas técnicas, a informação sobre o trabalho encontra-se fragmentada em múltiplas ferramentas, emails ou folhas de cálculo. Esta dispersão resulta em:
* **Falta de clareza sobre responsabilidades:** Dificuldade em saber quem está a executar cada tarefa e quais os prazos acordados.
* **Invisibilidade do fluxo operacional:** Ausência de uma visão dinâmica que mostre onde estão os estrangulamentos ou bloqueios no ciclo de vida das tarefas.
* **Deteção tardia de atrasos:** Apenas no final do prazo é que a liderança descobre que uma entrega crítica está atrasada.
* **Falta de métricas simples e objetivas:** Dificuldade em avaliar a cadência e velocidade real da equipa sem burocracia excessiva.

O **Matriz** resolve estes desafios oferecendo uma interface centralizada, visualmente intuitiva e focada na simplicidade de utilização.

---

## 2. Objetivos Principais

1. **Gestão Estruturada de Projetos:** Permitir que gestores criem e configurem projetos com objetivos e prazos definidos.
2. **Organização Visual com Quadro Kanban:** Proporcionar uma visão clara das tarefas divididas em três colunas essenciais: *A Fazer*, *Em Progresso* e *Concluído*.
3. **Acompanhamento Ativo de Prazos e Atrasos:** Identificar e sinalizar automaticamente qualquer tarefa cujo prazo expirou sem estar concluída.
4. **Métricas de Progresso e Velocidade:** Disponibilizar um dashboard com indicadores percentuais de conclusão e gráficos de produtividade dos últimos 7 dias.
5. **Context Engineering e Arquitetura Agêntica:** Estabelecer contratos de dados, especificações e documentação rigorosa para orientar o desenvolvimento com agentes de IA.

---

## 3. Funcionalidades Previstas para o MVP

O âmbito do **Minimum Viable Product (MVP)** foi rigorosamente definido para garantir uma entrega rápida, funcional e demonstrável:

| Módulo | Funcionalidades Incluídas no MVP |
|---|---|
| **Projetos** | Criação, edição, listagem e encerramento de projetos com data prevista de entrega. |
| **Tarefas** | Registo de tarefas com título, descrição, prioridade (Baixa, Média, Alta), data limite e membro atribuído. |
| **Quadro Kanban** | Visualização interativa em 3 colunas (`TODO`, `IN_PROGRESS`, `DONE`) com movimentação fluida de cartões. |
| **Deteção de Atrasos** | Destaque visual automático (vermelho + contador de dias) para tarefas que ultrapassaram a data limite. |
| **Dashboard de Métricas** | Barra percentual de conclusão do projeto, distribuição de tarefas por estado e gráfico de velocidade semanal. |
| **Perfis e Acessos** | Suporte para dois perfis operacionais: **Gestor de Projeto** e **Membro de Equipa**. |

---

## 4. Organização da Documentação (`/docs`)

Para apoiar a continuidade do desenvolvimento pelas equipas e pelos agentes de IA nas próximas aulas, a documentação está organizada de forma modular:

* 📄 **[docs/requirements.md](docs/requirements.md):**  
  Especificação completa dos requisitos funcionais (RF01 a RF12), requisitos não funcionais (desempenho, confiabilidade, arquitetura agêntica), tipos de utilizadores e fronteiras do MVP.
* 📋 **[docs/user-stories.md](docs/user-stories.md):**  
  Backlog inicial composto por 6 User Stories no formato canónico (*Como / Quero / Para*), com prioridades MoSCoW, estimativas em Story Points, critérios de aceitação em BDD (*Given / When / Then*) e tratamento de 4 casos-limite (*Edge Cases*).
* 🛡️ **[docs/constraints.md](docs/constraints.md):**  
  Registo das restrições conhecidas (tempo, portabilidade local), pressupostos assumidos (mono-tenant, auth simplificada), requisitos de segurança (RBAC, validação de inputs) e decisões técnicas em aberto.
* 🏛️ **[docs/architecture.md](docs/architecture.md):**  
  Decisão e justificação arquitetural (Monólito Modular), decomposição em camadas e módulos de domínio, padrões de fluxo de dados e diretrizes para desenvolvimento agêntico.
* 🗄️ **[docs/database.md](docs/database.md):**  
  Modelo de dados relacional, diagrama Entidade-Relacionamento (ER em Mermaid), dicionário de atributos, cardinalidades, integridade referencial (`SET NULL` / `CASCADE`) e regras de validação.
* 📜 **[openapi.yaml](openapi.yaml):**  
  Especificação OpenAPI 3.1 dos contratos da API REST (operações de criação de tarefas e transição de estado no Kanban, schemas de validação e códigos de resposta).
* 🖥️ **[docs/ui/dashboard-wireframe.md](docs/ui/dashboard-wireframe.md):**  
  Prototipagem de interface com wireframe do Dashboard analítico ([formato vetorial SVG](docs/ui/dashboard-wireframe.svg) e ASCII), navegação, KPIs, gráfico de velocidade e tratamento de estados vazios.
* 📋 **[docs/implementation-plan.md](docs/implementation-plan.md):**  
  Plano executável de implementação incremental (7 incrementos), regras de acesso RBAC consolidadas, stack confirmada, ficheiros previstos, critérios de aceitação BDD e métodos de verificação.
* 🧪 **[docs/verification.md](docs/verification.md):**  
  Relatório formal de verificação do MVP com matriz de testes para os 9 cenários essenciais (Casos 01 a 09), 151 asserções automatizadas validadas, evidências detalhadas e distinção rigorosa entre testes manuais e automatizados.
* 🤖 **[AGENTS.md](AGENTS.md):**  
  Instruções persistentes e regras de conduta técnica para agentes de IA de codificação (leitura prévia de contexto, planeamento prévio, controlo de escopo e prevenção de ações destrutivas).

---

## 5. Estado Atual do Projeto

O projeto encontra-se atualmente no final da fase de **Context Engineering e Especificação**:

```mermaid
flowchart LR
    E1["Ficha 1<br/>Requisitos & Stories"] -->|Concluído| E2["Ficha 2<br/>Architecture Pack"]
    E2 -->|Concluído| E3["Ficha 3 - Ex 1 & 2<br/>Plano & Persistência"]
    E3 -->|Concluído| E4["Ficha 3 - Ex 3<br/>Auth, Sessão & RBAC"]
    E4 -->|Concluído| E5["Ficha 3 - Ex 4<br/>Gestão de Projetos"]
    E5 -->|Concluído| E6["Ficha 3 - Ex 5<br/>Gestão de Tarefas"]
    E6 -->|Concluído| E7["Ficha 3 - Ex 6<br/>Responsáveis & Comentários"]
    E7 -->|Concluído| E8["Ficha 3 - Ex 7<br/>Frontend & Métricas"]
    E8 -->|Concluído| E9["Ficha 3 - Ex 8<br/>Verificação do MVP"]
    E9 -->|Concluído| E10["Ficha 3 - Ex 9<br/>Revisão & Entrega"]
    E10 -->|Aprovado| Ready["MVP Entregue & Totalmente Auditado"]

    classDef done fill:#22c55e,stroke:#15803d,color:#fff;
    classDef current fill:#3b82f6,stroke:#1d4ed8,color:#fff;

    class E1,E2,E3,E4,E5,E6,E7,E8,E9,E10 done;
    class Ready current;
```

* ✅ **Ficha Prática 1:** Elicitação de requisitos, User Stories em BDD, casos-limite, restrições e diretrizes em `AGENTS.md`.
* ✅ **Ficha Prática 2:** Definição da arquitetura de Monólito Modular, modelo ER relacional, contrato OpenAPI 3.1 e wireframe do Dashboard.
* ✅ **Ficha Prática 3 — Exercício 1 & 2:** Plano de implementação executável, setup do Next.js 14, base de dados SQLite com Prisma e seed idempotente.
* ✅ **Ficha Prática 3 — Exercício 3:** Autenticação segura com palavras-passe em hash (`bcryptjs`), tokens de sessão HMAC-SHA256 em cookies HTTP-only, inferência estrita de identidade no backend e autorização RBAC para Gestores e Membros.
* ✅ **Ficha Prática 3 — Exercício 4:** Gestão integrada de projetos (CRUD completo, pesquisa por título, paginação, validação de limites de texto de 3-100 / até 1000 caracteres, eliminação em cascata com diálogo de confirmação prévia e persistência real no SQLite).
* ✅ **Ficha Prática 3 — Exercício 5:** Gestão completa de tarefas associadas a projetos (CRUD, filtros combinados por estado e prioridade, paginação, rejeição de títulos com apenas espaços, transição rápida de estados, alertas de atraso `isOverdue` e interface reativa sem reload).
* ✅ **Ficha Prática 3 — Exercício 6:** Múltiplos responsáveis por tarefa (relação N:M com restrição `@@unique([taskId, userId])` anti-duplicados, seleção de utilizadores elegíveis e remoção individual) e comentários colaborativos (1-2000 caracteres, rejeição de apenas espaços, inferência estrita de autor/data no backend, modal interativo e garantia de persistência total na reabertura de tarefas).
* ✅ **Ficha Prática 3 — Exercício 7:** Frontend completo da Matriz coerente com o wireframe da Aula 2 (Painel Inicial com KPIs, velocidade semanal e tarefas críticas, gestão de projetos com pesquisa e detalhe, tarefas com filtros e múltiplos responsáveis, comentários integrados, mock switcher e sincronização reativa sem recarregamento).
* ✅ **Ficha Prática 3 — Exercício 8:** Verificação formal do MVP com relatório em `docs/verification.md` cobrindo os 9 cenários do guião, 3 testes automatizados específicos (validação defensiva, autorização RBAC e persistência durável pós-reabertura) e 151 asserções automatizadas aprovadas com 0 falhas.
* ✅ **Ficha Prática 3 — Exercício 9:** Revisão detalhada de critérios e diff, oportunidade de refatoração aplicada em isolamento (`createErrorResponse` padronizado e defensividade em `computeIsOverdue`), sincronização do contrato OpenAPI 3.1, atualização de `AGENTS.md` e `README.md`, registo de 3 exemplos de uso da IA (incluindo sugestão rejeitada/corrigida) e versionamento semântico em Git.
* 🎯 **Estado Final:** MVP 100% concluído, verificado e pronto para entrega.

---

## 6. Autenticação, Ciclo de Sessão e Controlo de Acessos (RBAC)

A plataforma implementa um mecanismo de segurança em conformidade com as boas práticas de desenvolvimento web:

### Contas de Demonstração (PoC)
| Utilizador | Email | Palavra-passe | Papel / Permissões |
|---|---|:---:|---|
| **Luís Ferreira** | `luis.ferreira@matriz.local` | `password123` | **Gestor de Projeto (`PROJECT_MANAGER`)** — Cria projetos, define prazos de tarefas e elimina entidades. |
| **Ana Silva** | `ana.silva@matriz.local` | `password123` | **Membro de Equipa (`TEAM_MEMBER`)** — Move estados no Kanban e insere comentários. |
| **Carlos Ramos** | `carlos.ramos@matriz.local` | `password123` | **Membro de Equipa (`TEAM_MEMBER`)** — Executa tarefas atribuídas. |

### Ciclo de Vida da Sessão e Segurança
1. **Hashing Seguro:** Nenhuma palavra-passe é guardada em texto limpo. Utiliza-se `bcryptjs` com 10 rondas de salt para gerar `passwordHash`.
2. **Ciclo de Sessão:**
   * **Início de Sessão (`POST /api/v1/auth/login`):** Valida as credenciais. Emite um cookie HTTP-only `matriz_session` com validade de 24 horas (`Max-Age=86400`, `SameSite=Lax`). Retorna também o token de sessão para clientes de API.
   * **Consulta de Perfil (`GET /api/v1/auth/me`):** Verifica a integridade da assinatura HMAC do token, garantindo que o utilizador existe na base de dados SQLite.
   * **Fim de Sessão (`POST /api/v1/auth/logout`):** Invalida a sessão limpando imediatamente o cookie (`Max-Age=0`).
3. **Inferência de Identidade no Backend (Anti-Spoofing):**
   * Em `POST /api/v1/projects`, o backend infere `managerId = user.id` a partir da sessão validada, ignorando qualquer ID de dono enviado no corpo do pedido.
   * Em `POST /api/v1/tasks/{id}/comments`, o backend infere `authorId = user.id`.
4. **Verificação de Autorização (RBAC):**
   * Membros de equipa são bloqueados (`403 Forbidden`) ao tentar criar projetos ou alterar `dueDate` de tarefas.

---

## 7. Instruções de Instalação e Execução a partir de Cópia Limpa

### Pré-requisitos
* **Node.js:** Versão 20+ LTS ou 22+/26+ instalada.
* **npm:** Gestor de pacotes standard incluído no Node.js.
* **SQLite:** Incluído no ecossistema (não necessita de daemons externos ou Docker).

### 1. Configurar Variáveis de Ambiente
Copie o ficheiro de configuração de exemplo:
```bash
cp .env.example .env
```
*(Em linha de comandos Windows CMD use `copy .env.example .env`).*  
O ficheiro `.env` vem pré-configurado com a base de dados relacional SQLite local (`DATABASE_URL="file:./dev.db"`) e chave secreta para assinaturas HMAC de sessão (`SESSION_SECRET`).

### 2. Instalar Dependências
```bash
npm install
```

### 3. Criar a Base de Dados e Aplicar Migrações
Gera o esquema relacional no SQLite local (`prisma/dev.db`):
```bash
npx prisma migrate dev
```

### 4. Povoar com Dados de Demonstração (Seed Idempotente)
Popula a base de dados com as 3 contas de teste, projetos de demonstração, tarefas variadas e comentários:
```bash
npm run db:seed
```
> **Nota de Idempotência:** O script utiliza `upsert` com base em chaves primárias e emails, permitindo execuções repetidas sem duplicação de dados.

### 5. Iniciar a Aplicação

#### Em Modo de Desenvolvimento:
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador. Pode aceder à página de login em [http://localhost:3000/login](http://localhost:3000/login) para entrar com 1 clique usando as credenciais de demonstração.

#### Em Modo de Produção:
```bash
npm run build
npm run start
```
A compilação otimiza os assets e o servidor de produção arranca na porta 3000 com saída de telemetria estática.

---

## 8. Execução dos Testes Automatizados

Todas as suites de testes utilizam a execução nativa TypeScript via Node.js e Playwright para o fluxo End-to-End:

| Suite | Âmbito / Módulo Testado | Asserções | Comando de Execução |
|---|---|:---:|---|
| **End-to-End (Playwright)** | Fluxo completo do utilizador na interface (Login $\to$ Tarefas $\to$ Criação $\to$ Listagem) | 1 E2E | `npm run test:e2e` |
| **Segurança & Regressão IDOR** | Prevenção de bypass X-User-Id, bloqueio de IDOR na desassociação e RBAC | 21 | `node tests/security-idor.test.ts` |
| **Integração de Tarefas & API** | Criação, consulta por ID, persistência SQLite e 5 cenários negativos com teardown | 33 | `node tests/tasks-integration.test.ts` |
| **Validação Unitária de Título** | Casos válidos, inválidos e análise de valores-limite (BVA nos limiares 3 e 150) | 13 | `node tests/task-title-unit.test.ts` |
| **Verificação Formal MVP** | Validação, RBAC, anti-spoofing, persistência durável pós-reabertura (Casos 01 a 09) | 34 | `node tests/mvp-verification.test.ts` |
| **Integração Frontend & Métricas** | Agregação analítica, KPIs, percentagem, velocidade semanal e cliente API | 15 | `node tests/frontend-integration.test.ts` |
| **Comentários de Tarefas** | Threads de comentários, ordenação cronológica, inferência de autor e persistência | 28 | `node tests/task-comments.test.ts` |
| **Múltiplos Responsáveis (N:M)** | Atribuição N:M, seleção elegível, remoção e restrição única `P2002` anti-duplicados | 12 | `node tests/task-assignees.test.ts` |
| **Gestão de Tarefas (CRUD)** | Schemas Zod, filtros combinados, paginação e cálculo de atraso `isOverdue` | 27 | `node tests/tasks-crud.test.ts` |
| **Gestão de Projetos (CRUD)** | Criação, edição, pesquisa por título, paginação e eliminação em cascata | 21 | `node tests/projects-crud.test.ts` |
| **Autenticação & RBAC** | Hashing bcrypt, emissão e validação de cookie HMAC-SHA256 e barreiras 403 | 14 | `node tests/auth-rbac.test.ts` |

**Comando para executar a suite principal de verificação ponta a ponta:**
```bash
node tests/mvp-verification.test.ts
```

**Comando para executar o teste End-to-End com Playwright:**
```bash
npm run test:e2e
```

**Para inspecionar visualmente os registos da base de dados:**
```bash
npx prisma studio
```
*(Inicia uma interface gráfica no browser em `http://localhost:5555`).*
