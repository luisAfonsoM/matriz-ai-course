/**
 * Dicionário Central de Terminologia de Aviação (UI Labels)
 *
 * NOTA ARQUITETURAL:
 * Este módulo altera exclusivamente a camada de apresentação visual (UI).
 * Todos os valores de persistência e contratos de API (TODO, IN_PROGRESS, DONE,
 * PROJECT_MANAGER, TEAM_MEMBER, LOW, MEDIUM, HIGH) mantêm-se inalterados.
 */

export const AVIATION_LABELS = {
  // Marca e TopBar
  brand: {
    name: "Matriz",
    tagline: "Torre de Operações & Gestão de Missões",
    badge: "Esquadrão MVP",
    dbStatusOnline: "Transponder Ativo",
    dbStatusOffline: "Sem Sinal de Radar",
  },

  // Navegação Principal
  nav: {
    dashboard: "Torre de Controlo",
    projects: "Missões",
    tasks: "Checklists de Voo",
  },

  // Colunas do Kanban e Estados de Voo
  status: {
    TODO: "Hangar",
    TODO_DESC: "A Fazer / Preparação pré-voo",
    IN_PROGRESS: "Em Voo",
    IN_PROGRESS_DESC: "Em Execução / Missão no ar",
    DONE: "Aterrado",
    DONE_DESC: "Concluído / Pista livre",
  },

  // Níveis de Prioridade
  priority: {
    HIGH: "Supersónica (Alta)",
    HIGH_SHORT: "Alta",
    MEDIUM: "Cruzeiro (Média)",
    MEDIUM_SHORT: "Média",
    LOW: "Aproximação (Baixa)",
    LOW_SHORT: "Baixa",
  },

  // Papéis de Utilizador (RBAC)
  roles: {
    PROJECT_MANAGER: "Comandante de Missão (Gestor)",
    PROJECT_MANAGER_SHORT: "Comandante (Gestor)",
    TEAM_MEMBER: "Piloto de Esquadrão (Membro)",
    TEAM_MEMBER_SHORT: "Piloto (Membro)",
  },

  // Atribuição de Recursos
  crew: {
    assignee: "Piloto Responsável",
    assignees: "Tripulação Atribuída",
    unassigned: "Sem Piloto Atribuído",
    assignToSelf: "Assumir Controlo (Auto-atribuição)",
  },

  // Métricas e Alertas
  metrics: {
    projectProgress: "Progresso da Missão",
    totalTasks: "Total de Itens",
    todoCount: "No Hangar",
    inProgressCount: "Em Voo",
    completedCount: "Aterradas",
    overdueCount: "Em Turbulência (Atraso)",
    overdueAlert: "Alerta de Turbulência (Prazo UTC Expirado)",
    velocityTitle: "Velocidade de Cruzeiro (Últimos 7 dias)",
    velocitySubtitle: "Itens de voo concluídos por dia (UTC)",
    criticalTitle: "Atenção: Voos Críticos & Turbulência",
    criticalSubtitle: "Itens que ultrapassaram a janela de voo ou expiram hoje",
  },

  // Estados Vazios (Empty States)
  empty: {
    noMissions: "Sem Missões Registadas no Radar",
    noMissionsSub: "Crie uma nova missão no plano de voo para começar a coordenar tarefas.",
    emptyHangar: "Hangar Vazio — Nenhum item em fila de descolagem",
    emptyFlight: "Espaço Aéreo Limpo — Nenhuma aeronave em voo no momento",
    emptyRunway: "Pista Desimpedida — Nenhuma checklist finalizada recentemente",
    noComments: "Sem registos no diário de bordo. Adicione a primeira observação de voo.",
  },

  // Ações e Botões
  actions: {
    newMission: "+ Nova Missão",
    newChecklist: "+ Nova Tarefa",
    editMission: "Editar Plano de Voo",
    deleteMission: "Cancelar Missão",
    confirmTakeoff: "Autorizar Descolagem",
    loginSubmit: "Entrar no Sistema (Torre de Controlo)",
  },
} as const;
