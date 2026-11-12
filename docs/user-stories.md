# Backlog de User Stories e Critérios de Aceitação — Matriz

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Contexto:** Curso de Desenvolvimento de Software com *Agentic Approach* (Exercício 4)
* **Documento de Requisitos:** [requirements.md](file:///C:/Users/LuisFerreira/Personal_projects/AI_PTH_Course/matriz/docs/requirements.md)
* **Versão:** 1.0
* **Data:** 29 de Outubro de 2026

---

## 1. Visão Geral do Backlog do MVP

Este documento define as **User Stories (US)** nucleares para o MVP da plataforma Matriz, detalhando o valor gerado para cada perfil de utilizador, prioridades na escala MoSCoW, estimativa em Story Points (SP) e **Critérios de Aceitação em formato BDD (*Given / When / Then*)**, garantindo a testabilidade em ambiente de desenvolvimento assistido por agentes de IA.

---

## 2. Matriz de Priorização do Backlog Inicial

| ID | User Story | Papel / Persona | Prioridade | SP | Requisito Relacionado |
|---|---|---|:---:|:---:|---|
| **US01** | [Criação e Estruturação de Projetos](#us01--criação-e-estruturação-de-projetos) | Gestor de Projeto | **Must Have** | 3 | RF01, RF02 |
| **US02** | [Criação e Atribuição de Tarefas com Prazos](#us02--criação-e-atribuição-de-tarefas-com-prazos) | Gestor de Projeto | **Must Have** | 5 | RF04, RF05, RF06 |
| **US03** | [Movimentação de Tarefas no Quadro Kanban](#us03--movimentação-de-tarefas-no-quadro-kanban) | Membro de Equipa | **Must Have** | 5 | RF07, RF08 |
| **US04** | [Deteção e Alerta Visual de Tarefas em Atraso](#us04--deteção-e-alerta-visual-de-tarefas-em-atraso) | Gestor / Membro | **Must Have** | 3 | RF11 |
| **US05** | [Dashboard de Métricas de Conclusão e Velocidade](#us05--dashboard-de-métricas-de-conclusão-e-velocidade) | Gestor de Projeto | **Must Have** | 5 | RF10, RF12 |
| **US06** | [Filtragem Rápida no Quadro Kanban](#us06--filtragem-rápida-no-quadro-kanban) | Membro / Gestor | **Should Have** | 2 | RF09 |

---

## 3. Especificação das User Stories e Critérios de Aceitação

---

### US01 — Criação e Estruturação de Projetos
> **Como** Gestor de Projeto,  
> **Quero** criar um novo projeto com título, descrição e prazo de conclusão previsto,  
> **Para que** a equipa possua um espaço de trabalho centralizado para gerir as suas entregas.

* **Prioridade:** Must Have | **Estimativa:** 3 Story Points

#### Critérios de Aceitação:
* **Cenário 1.1: Registo bem-sucedido de projeto (Caminho Feliz)**
  * **Given** que o utilizador autenticado é um Gestor de Projeto,
  * **And** acede ao formulário de criação de novo projeto,
  * **When** insere o título "Migração Cloud v2", uma descrição opcional (0 a 500 carateres) e uma data de entrega futura,
  * **And** clica no botão "Guardar Projeto",
  * **Then** o sistema persiste o projeto com o estado `ACTIVE`,
  * **And** o projeto passa a constar na lista geral com progresso inicial de 0%.

* **Cenário 1.2: Rejeição de projeto sem título obrigatório (Validação)**
  * **Given** que o utilizador submete o formulário com o campo "Título" vazio ou apenas com espaços,
  * **When** aciona a submissão,
  * **Then** o sistema bloqueia o envio com a mensagem de validação: *"O título do projeto é obrigatório (mínimo de 3 caracteres)"*,
  * **And** nenhum registo é criado na base de dados.

---

### US02 — Criação e Atribuição de Tarefas com Prazos
> **Como** Gestor de Projeto,  
> **Quero** registar tarefas dentro de um projeto definindo título, prioridade (Baixa, Média, Alta), data limite e responsável,  
> **Para que** cada elemento da equipa conheça com precisão o que deve executar e em que prazo.

* **Prioridade:** Must Have | **Estimativa:** 5 Story Points

#### Critérios de Aceitação:
* **Cenário 2.1: Criação e atribuição a um membro**
  * **Given** que o Gestor está a visualizar um projeto existente,
  * **When** adiciona uma tarefa com título "Implementar Endpoint /tasks", prioridade "Alta", data limite "2026-11-20" e seleciona o membro "Carlos Ramos",
  * **Then** a tarefa é criada na coluna "A Fazer" (`TODO`),
  * **And** exibe o identificador visual da prioridade "Alta" e o avatar/nome de "Carlos Ramos".

* **Cenário 2.2: Tarefa não atribuída (Backlog de Projeto)**
  * **Given** que o Gestor cria uma tarefa mas não seleciona nenhum membro no campo "Responsável",
  * **When** guarda a tarefa,
  * **Then** o sistema aceita a criação com `assignee_id = null`,
  * **And** o cartão exibe a indicação "Não Atribuída".

* **Cenário 2.3: Restrição de alteração de data limite a Membros de Equipa**
  * **Given** que o utilizador autenticado possui o perfil "Membro de Equipa",
  * **When** tenta editar a data limite de uma tarefa que lhe está atribuída,
  * **Then** o campo de data limite encontra-se desabilitado na interface,
  * **And** qualquer tentativa de mutação da data via API é rejeitada com código HTTP 403 (Forbidden).

---

### US03 — Movimentação de Tarefas no Quadro Kanban
> **Como** Membro de Equipa,  
> **Quero** mover tarefas entre as colunas "A Fazer", "Em Progresso" e "Concluído",  
> **Para que** o fluxo de trabalho seja transparente e todos saibam o estado corrente das atividades.

* **Prioridade:** Must Have | **Estimativa:** 5 Story Points

#### Critérios de Aceitação:
* **Cenário 3.1: Início de execução da tarefa**
  * **Given** que o utilizador visualiza o quadro Kanban do projeto,
  * **And** existe a tarefa "Implementar Autenticação" na coluna "A Fazer",
  * **When** arrasta o cartão ou clica na ação de transição para a coluna "Em Progresso",
  * **Then** o estado da tarefa é atualizado no sistema para `IN_PROGRESS`,
  * **And** o timestamp de atualização `updated_at` é renovado,
  * **And** o cartão é renderizado na nova coluna sem recarregamento de página.

* **Cenário 3.2: Finalização da tarefa com impacto no progresso geral**
  * **Given** que a tarefa se encontra na coluna "Em Progresso",
  * **When** o membro move a tarefa para a coluna "Concluído" (`DONE`),
  * **Then** o estado passa a `DONE`,
  * **And** a barra percentual de progresso do projeto é recalculada automaticamente.

---

### US04 — Deteção e Alerta Visual de Tarefas em Atraso
> **Como** Gestor de Projeto ou Membro de Equipa,  
> **Quero** que o sistema sinalize visualmente as tarefas cujo prazo expirou sem estarem concluídas,  
> **Para que** os atrasos sejam identificados e tratados prontamente antes de comprometerem a entrega.

* **Prioridade:** Must Have | **Estimativa:** 3 Story Points

#### Critérios de Aceitação:
* **Cenário 4.1: Destaque de tarefa com prazo expirado**
  * **Given** que uma tarefa possui data limite anterior à data/hora corrente (expirada após as 23:59:59 UTC do dia estipulado),
  * **And** o seu estado é `TODO` ou `IN_PROGRESS`,
  * **When** o utilizador visualiza o quadro Kanban ou o dashboard,
  * **Then** a data da tarefa é apresentada com badge visual de alerta (vermelho) indicando "(Em Atraso - X dias)",
  * **And** o contador global de "Tarefas Atrasadas" do projeto é incrementado.

* **Cenário 4.2: Tarefa concluída após a data limite**
  * **Given** que a tarefa tinha data limite anterior ao dia de hoje,
  * **When** o estado da tarefa é `DONE`,
  * **Then** a tarefa deixa de ser contabilizada no alerta de "Tarefas Atrasadas Ativas".

---

### US05 — Dashboard de Métricas de Conclusão e Velocidade
> **Como** Gestor de Projeto,  
> **Quero** consultar um painel analítico com a taxa de conclusão do projeto e a velocidade de entrega semanal,  
> **Para que** possa comunicar o progresso com base em indicadores objetivos e avaliar a cadência da equipa.

* **Prioridade:** Must Have | **Estimativa:** 5 Story Points

#### Critérios de Aceitação:
* **Cenário 5.1: Cálculo exato do progresso**
  * **Given** um projeto com 20 tarefas no total, das quais 10 estão `DONE`, 6 em `IN_PROGRESS` e 4 em `TODO`,
  * **When** o gestor acede ao Dashboard,
  * **Then** a taxa de progresso apresentada é rigorosamente de 50%,
  * **And** são discriminados os contadores exatos por cada um dos três estados.

* **Cenário 5.2: Histórico de velocidade dos últimos 7 dias**
  * **Given** que foram concluídas tarefas ao longo da última semana,
  * **When** o utilizador consulta a secção "Velocidade Semanal",
  * **Then** é exibido um gráfico com o número exato de tarefas completadas por dia nos últimos 7 dias corridos.

---

### US06 — Filtragem Rápida no Quadro Kanban
> **Como** Membro de Equipa ou Gestor,  
> **Quero** filtrar as tarefas do quadro por responsável ou por nível de prioridade,  
> **Para que** consiga focar-me apenas nas tarefas que me competem ou que requerem atenção urgente.

* **Prioridade:** Should Have | **Estimativa:** 2 Story Points

#### Critérios de Aceitação:
* **Cenário 6.1: Filtrar pelas tarefas do próprio utilizador**
  * **Given** que o quadro Kanban exibe tarefas de múltiplos colaboradores,
  * **When** o utilizador clica no filtro "Apenas as Minhas Tarefas",
  * **Then** o quadro oculta temporariamente as tarefas atribuídas a outros membros ou não atribuídas, mantendo visíveis apenas as do utilizador em sessão.

---

## 4. Casos Excecionais e Limites do Sistema (Edge Cases)

Para assegurar estabilidade operacional e orientar os agentes de IA na implementação de validações defensivas, especificam-se os seguintes casos-limite:

### Caso-Limite 1 (EC01): Projeto Vazio sem Tarefas
* **Condição:** Um projeto acabado de criar possui `total_tasks == 0`.
* **Tratamento:** A fórmula do progresso deve aplicar salvaguarda: `total > 0 ? (done / total) * 100 : 0`. O dashboard deve apresentar um estado vazio informativo (*Empty State*), sem disparar erros de divisão por zero ou exceções na biblioteca de gráficos.

### Caso-Limite 2 (EC02): Incoerência Temporal de Datas
* **Condição:** O utilizador tenta definir uma data limite de tarefa que é anterior à data de início do próprio projeto.
* **Tratamento:** O backend e o formulário devem validar: `task.due_date >= project.start_date`. Em caso de violação, o sistema emite mensagem amigável e impede o registo.

### Caso-Limite 3 (EC03): Integridade Referencial na Eliminação de Membro
* **Condição:** Um utilizador com tarefas ativas atribuídas é removido da plataforma.
* **Tratamento:** A base de dados executa política segura de `SET NULL` na chave estrangeira `assignee_id`. Nenhuma tarefa é apagada por cascata acidental e as tarefas passam automaticamente ao estado "Não Atribuída".

### Caso-Limite 4 (EC04): Concorrência na Atualização de Estado
* **Condição:** Dois utilizadores alteram o estado da mesma tarefa simultaneamente em janelas de browser distintas.
* **Tratamento:** O backend verifica a versão ou o timestamp `updated_at`. A segunda mutação com timestamp desatualizado recebe código HTTP 409 (Conflict) ou revalidação automática, informando que a tarefa já sofreu alterações recentes.

### Caso-Limite 5 (EC05): Aplicação sem Projetos (Zero-State Global)
* **Condição:** O utilizador acede à aplicação pela primeira vez após instalação limpa, não existindo qualquer projeto criado na base de dados (`total_projects == 0`).
* **Tratamento:** O seletor de projetos na TopBar e no Dashboard não deve falhar com erro `null`/`undefined`. O sistema renderiza um *Empty State Global* de boas-vindas: *"Bem-vindo ao Matriz! Não existem projetos registados."*, apresentando uma ação de chamada para ação (*CTA*) proeminente: **"+ Criar Primeiro Projeto"** (visível para Gestores) ou instrução de contacto com o gestor (para Membros).
