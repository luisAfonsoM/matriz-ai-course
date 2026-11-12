# Diretrizes e Instruções Persistentes para Agentes de Desenvolvimento (AGENTS.md)
## Projeto Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas

Este documento define as regras operacionais, princípios de conduta técnica e restrições de execução que qualquer Agente de IA de Codificação (*Coding Agent*) deve seguir obrigatoriamente ao operar neste repositório.

---

## 1. Consulta Obrigatória de Contexto

Antes de propor planos, escrever código ou executar comandos, o agente deve consultar os documentos de contexto existentes no diretório `docs/`:

* **`docs/requirements.md`:** Visão global, tipos de utilizadores, requisitos funcionais (RF) e não funcionais (RNF).
* **`docs/user-stories.md`:** User Stories do MVP, critérios de aceitação BDD (*Given/When/Then*) e casos-limite (*Edge Cases*).
* **`docs/constraints.md`:** Restrições conhecidas, pressupostos aprovados, requisitos de segurança e decisões técnicas pendentes.
* **`README.md`:** Visão geral da arquitetura e estado atual do projeto.

> **Regra:** Qualquer implementação deve ser diretamente rastreável a um Requisito Funcional ou User Story aprovada.

---

## 2. Respeito pelo Âmbito e Controlo de Escopo (*Scope Control*)

1. **Fidelidade ao Âmbito do MVP:**
   * O agente deve implementar estritamente o que está classificado como *Must Have* ou explicitamente solicitado pelo utilizador.
   * Não adicione nem "invente" funcionalidades complementares (ex: comentários em tarefas, notificações push, integrações externas com Jira/Slack) sem aprovação expressa prévia do utilizador, pois estas pertencem ao roadmap futuro.
2. **Respeito pelas Decisões Pendentes:**
   * Para decisões identificadas como pendentes em `docs/constraints.md` (ex: seleção final de bibliotecas ou stack), o agente deve apresentar as opções recomendadas com respetivos prós e contras, aguardando a validação humana antes de estruturar código dependente.

---

## 3. Fluxo de Trabalho: Planear Antes de Executar (*Plan-First*)

Para qualquer tarefa que envolva criação de novos módulos, alteração de esquemas de dados ou modificação substancial de ficheiros existentes:

1. **Apresentar Plano Prévio:**
   * Resumir o objetivo da intervenção.
   * Listar os ficheiros exatos que serão criados ou editados.
   * Descrever a abordagem técnica e a justificação.
2. **Aguardar Validação:** Obter confirmação do utilizador antes de aplicar edições em larga escala.
3. **Princípio da Menor Alteração Necessária:** Modificar unicamente os ficheiros e linhas estritamente necessários para a tarefa em curso. Não reformatar nem reescrever código alheio ao âmbito solicitado.

---

## 4. Gestão de Ações Destrutivas ou Sensíveis

O agente está terminantemente proibido de executar de forma autónoma ações com potencial destrutivo. É **obrigatório solicitar confirmação explícita** do utilizador antes de:

* Eliminar ficheiros, diretórios ou bases de dados.
* Executar migrações com remoção ou renomeação irreversível de tabelas/colunas (`drop table`, `reset db`).
* Executar comandos de git destrutivos (ex: `git reset --hard`, `git push --force`, `git clean -fd`).
* Instalar pacotes de software globais no sistema operativo hospedeiro.

---

## 5. Segurança, Privacidade e Confidencialidade

1. **Sem Exposição de Credenciais:**
   * Nunca incluir segredos, palavras-passe, chaves de API ou tokens de acesso diretamente no código-fonte, nos ficheiros de documentação ou nas mensagens de resposta.
   * Utilizar sempre variáveis de ambiente geridas via ficheiros `.env.example` (com valores fictícios) e `.env` (ignorado no `.gitignore`).
2. **Validação e Higienização de Dados:**
   * Todo o endpoint ou função que processe inputs externos deve conter schemas de validação defensiva para prevenir injeções de código (SQL Injection, XSS).

---

## 6. Comunicação Transparente e Verificação

Ao concluir qualquer tarefa ou iteração, o agente deve reportar de forma estruturada:

1. **Pressupostos Assumidos:** Qualquer decisão pontual adotada durante a execução para resolver ambiguidades menores.
2. **Resumo das Alterações:** Lista clara dos ficheiros criados, alterados ou removidos com os respetivos links.
3. **Verificações e Testes Efetuados:** Comandos executados para testar ou validar a solução (ex: linter, testes unitários, compilação/build).
4. **Instruções para o Utilizador:** Passos exatos para o utilizador testar e verificar a funcionalidade no seu ambiente local.

---

## 7. Comandos Operacionais de Execução e Verificação

Para assegurar reprodutibilidade estrita a partir de uma cópia limpa do repositório, o agente deve conhecer e utilizar os seguintes comandos operacionais:

### 7.1 Configuração de Ambiente e Base de Dados
* **Configuração de variáveis:** `cp .env.example .env` (ou `copy .env.example .env` em Windows CMD)
* **Instalação de dependências:** `npm install`
* **Criação do esquema relacional (SQLite):** `npx prisma migrate dev`
* **Povoamento com dados de teste (Seed idempotente):** `npm run db:seed`
* **Inspeção visual da base de dados:** `npx prisma studio` (interface web em `http://localhost:5555`)

### 7.2 Arranque da Aplicação
* **Modo de desenvolvimento:** `npm run dev` (disponível em `http://localhost:3000`)
* **Compilação de produção:** `npm run build`
* **Arranque de produção:** `npm run start`

### 7.3 Execução das Suites de Testes Automatizados
O projeto utiliza a execução nativa de TypeScript via Node.js (v20+ ou v26+) e Playwright para testes End-to-End:
* **Suite End-to-End no Navegador Headless (Playwright - Ficha 4 Ex 4):** `npm run test:e2e`
* **Suite de Regressão de Segurança e IDOR (Ficha 4 Ex 5):** `node tests/security-idor.test.ts`
* **Suite de Integração de Tarefas & API (Ficha 4 Ex 3):** `node tests/tasks-integration.test.ts`
* **Suite de Testes Unitários da Regra do Título (Ficha 4 Ex 2):** `node tests/task-title-unit.test.ts`
* **Suite Formal de Verificação do MVP (Casos 01 a 09):** `node tests/mvp-verification.test.ts`
* **Suite de Integração Frontend & Métricas:** `node tests/frontend-integration.test.ts`
* **Suite de Comentários de Tarefas & Persistência:** `node tests/task-comments.test.ts`
* **Suite de Múltiplos Responsáveis (N:M) & Anti-Duplicados:** `node tests/task-assignees.test.ts`
* **Suite de Gestão de Tarefas (CRUD, Filtros & Anti-Espaços):** `node tests/tasks-crud.test.ts`
* **Suite de Gestão de Projetos (CRUD, Pesquisa & Cascata):** `node tests/projects-crud.test.ts`
* **Suite de Autenticação e RBAC:** `node tests/auth-rbac.test.ts`
