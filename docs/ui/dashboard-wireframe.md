# Prototipagem de Interface — Wireframe do Dashboard

* **Projeto:** Matriz — Plataforma de Gestão de Projetos e Acompanhamento de Equipas
* **Contexto:** Ficha Prática 2 — Exercício 4 (Prototipagem de Interface)
* **Documentos de Referência:** [requirements.md](../requirements.md) | [user-stories.md](../user-stories.md) | [database.md](../database.md) | [openapi.yaml](../../openapi.yaml)
* **Ficheiro Gráfico Vetorial:** [dashboard-wireframe.svg](dashboard-wireframe.svg)
* **Versão:** 1.0
* **Data:** 5 de Novembro de 2026
* **Estado:** Aprovado

---

## 1. Visão Geral do Ecrã de Dashboard

O **Dashboard** é o ecrã central da plataforma **Matriz**, concebido para satisfazer a necessidade prioritária de lideranças e equipas: *"acompanhar o progresso do trabalho e prevenir atrasos em tempo real"*.

O desenho de baixa fidelidade (*low-fidelity wireframe*) prioriza hierarquia visual clara, facilidade de leitura rápida e rastreabilidade direta com os requisitos e User Stories do MVP.

---

## 2. Wireframe Esquemático (ASCII Layout)

```
+---------------------------------------------------------------------------------------------------------+
| [M] Matriz (PoC MVP)      [Dashboard]   Projetos   Quadro Kanban         [👤 Luís Ferreira (Gestor) ▾]  |
+---------------------------------------------------------------------------------------------------------+
|  VISÃO ANALÍTICA DO PROJETO                                                                             |
|  [ Migração Cloud v2  ● Ativo ▾ ]   Progresso: [==== 45% ====------] (9/20)          [ + Nova Tarefa ]  |
+---------------------------------------------------------------------------------------------------------+
|  +--------------------+  +--------------------+  +--------------------+  +--------------------------+   |
|  | Total Tarefas      |  | Concluídas (DONE)  |  | Em Progresso (IN_PROGRESS) |  | Tarefas em Atraso (RF11) |   |
|  |     [ 20 ]         |  |      [ 9 ]         |  |      [ 7 ]         |  |      [ 4 ]  ⚠ (Alerta)   |   |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------------+   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  +--- Velocidade Semanal (Últimos 7 dias) [RF12] ---+  +--- Atenção: Tarefas Críticas [RF11/US04] ---+  |
|  | Tarefas concluídas por dia (UTC)                 |  | 4 tarefas ultrapassaram o prazo ou expiram  |  |
|  |                                                  |  |                                             |  |
|  | 6 |                                              |  | +-[ALTA] [Atraso: 3 dias]-----------------+ |  |
|  | 4 |                    [#]                 [#]   |  | | Criar migração Prisma e modelos         | |  |
|  | 2 |           [#]      [#]        [#]      [#]   |  | | Resp: Carlos Ramos • Estado: Em Progresso | |  |
|  | 0 |  [#]      [#]  ..  [#]   [#]  [#]  ..  [#]   |  | +-----------------------------------------+ |  |
|  |   +--------------------------------------------  |  |                                             |  |
|  |     30   31   01   02   03   04  Hoje            |  | +-[MÉDIA] [Atraso: 1 dia]-----------------+ |  |
|  |     Out  Out  Nov  Nov  Nov  Nov (5 Nov)         |  | | Configurar suite de testes unitários     | |  |
|  |                                                  |  | | Resp: Ana Silva • Estado: A Fazer        | |  |
|  | Média Semanal: 2.3 tarefas/dia (Ritmo Suficiente)|  | +-----------------------------------------+ |  |
|  +--------------------------------------------------+  |                                             |  |
|                                                        | +-[ALTA] [Expira Hoje]---------------------+ |  |
|                                                        | | Implementar rota POST /tasks             | |  |
|                                                        | | Resp: Carlos Ramos • Estado: Em Progresso | |  |
|                                                        | +-----------------------------------------+ |  |
|                                                        |                                             |  |
|                                                        | [      Ir para o Quadro Kanban →         ]  |  |
|                                                        | +-------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Decomposição de Componentes e Mapeamento de Requisitos

### 3.1 Barra de Navegação Superior (*TopBar*)
* **Marca e Contexto:** Logótipo e badge indicativo do PoC MVP.
* **Navegação Global:** Links diretos para alternar entre as 3 vistas principais: `Dashboard` (ativo), `Projetos` e `Quadro Kanban`.
* **Seletor de Perfil (*Mock Switcher*):** Dropdown que exibe o utilizador em sessão (`Luís Ferreira`), o seu papel operacional (`Gestor de Projeto`) e permite alternar rapidamente para `Membro de Equipa` (Ana Silva / Carlos Ramos) para validar o controlo de acessos (RBAC).

### 3.2 Cabeçalho de Contexto do Projeto
* **Seletor de Projeto Ativo:** Permite filtrar todas as métricas do ecrã para um projeto específico ou alternar entre projetos em carteira ([RF02](../requirements.md#módulo-1-gestão-de-projetos)).
* **Barra de Progresso Global ([RF10](../requirements.md#módulo-4-acompanhamento-de-progresso-e-métricas) / [US05](../user-stories.md#us05--dashboard-de-métricas-de-conclusão-e-velocidade)):** Exibe a percentagem ponderada calculada: $\frac{9}{20} \times 100 = 45\%$.
* **Ação Primária (+ Nova Tarefa):** Botão que abre o modal de criação de tarefa ([US02](../user-stories.md#us02--criação-e-atribuição-de-tarefas-com-prazos)), desabilitado ou oculto quando o perfil ativo é Membro de Equipa.

### 3.3 Grelha de KPI Cards (Resumo Operacional)
1. **Total de Tarefas:** Contador numérico total do projeto.
2. **Concluídas (`DONE`):** Indicador de sucesso com badge verde.
3. **Em Progresso (`IN_PROGRESS`):** Trabalho em execução com badge azul.
4. **Tarefas em Atraso ([RF11](../requirements.md#módulo-4-acompanhamento-de-progresso-e-métricas) / [US04](../user-stories.md#us04--deteção-e-alerta-visual-de-tarefas-em-atraso)):** Destaque com fundo e contorno em vermelho de alerta (`#dc2626`), indicando quantas tarefas ultrapassaram o corte das 23:59:59 UTC da `due_date`.

### 3.4 Painel Analítico de Velocidade Semanal ([RF12](../requirements.md#módulo-4-acompanhamento-de-progresso-e-métricas))
* **Gráfico de Barras dos Últimos 7 Dias:** Renderização limpa de tarefas concluídas por dia no fuso horário UTC.
* **Média Móvel e Feedback:** Indicação resumida da cadência da equipa face à meta de entrega global.

### 3.5 Painel de Atenção Imediata (Tarefas em Atraso e Críticas)
* Lista priorizada das tarefas que requerem intervenção rápida, com:
  * Badge de Prioridade (`ALTA`, `MÉDIA`).
  * Badge de Atraso com contagem de dias expirados (ex: `Atraso: 3 dias` ou `Expira Hoje`).
  * Responsável e estado atual.
* Botão de atalho rápido: **"Ir para o Quadro Kanban →"** para encaminhar diretamente para a manipulação visual das tarefas.

---

## 4. Tratamento de Estados Especiais e Casos-Limite

### 4.1 Projeto Vazio sem Tarefas (EC01)
Quando um projeto recém-criado for selecionado (`total_tasks == 0`):
* A barra de progresso fixa-se a `0%` (proteção contra divisão por zero).
* Os cartões de KPI exibem contadores a `0`.
* O gráfico e o painel de atenção são substituídos por um *Empty State* ilustrado:
  > *"Ainda não foram criadas tarefas neste projeto. Clique em **+ Nova Tarefa** ou aceda ao Quadro Kanban para estruturar as primeiras atividades!"*

### 4.2 Perfil Membro de Equipa (*RBAC View*)
Quando o utilizador em sessão for alterado para Membro de Equipa via *Mock Switcher*:
* O botão `+ Nova Tarefa` fica desabilitado com tooltip informativo: *"Apenas o Gestor de Projeto pode criar novas tarefas"*.
* É adicionado um filtro rápido no cabeçalho: `[x] Apenas as Minhas Tarefas` ([US06](../user-stories.md#us06--filtragem-rápida-no-quadro-kanban)), recalculando os KPIs para o trabalho do próprio utilizador.

---

## 5. Ficheiro de Visualização Vetorial

Para visualizar o wireframe em alta definição com tipografia, contrastes e elementos estilizados, consulte o ficheiro SVG:
👉 **[docs/ui/dashboard-wireframe.svg](dashboard-wireframe.svg)**
