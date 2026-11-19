"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Filter,
  Calendar,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Fan,
  RotateCcw,
  ClipboardList,
  Radio,
  Send,
  ArrowLeft,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  CloudLightning,
} from "lucide-react";
import { AVIATION_LABELS } from "@/lib/labels";

export interface TaskData {
  id: string;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  assignees?: Array<{
    id: string;
    taskId: string;
    userId: string;
    assignedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
  commentsCount?: number;
}

export interface CommentData {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "PROJECT_MANAGER" | "TEAM_MEMBER";
}

interface ProjectBrief {
  id: string;
  title: string;
  startDate: string;
  targetDate: string;
}

interface TaskManagementProps {
  projects: ProjectBrief[];
  activeProjectId?: string;
  onProjectChange?: (id: string) => void;
  currentUser: CurrentUser | null;
  onMutation?: () => void;
  onBackToProjects?: () => void;
  isDetailView?: boolean;
}

// Helpers de tradução e estilo em conformidade com o OpenAPI
const STATUS_LABELS: Record<string, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Progresso",
  DONE: "Concluído",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export function TaskManagement({
  projects,
  activeProjectId,
  onProjectChange,
  currentUser,
  onMutation,
  onBackToProjects,
  isDetailView,
}: TaskManagementProps) {
  // Projeto selecionado
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjectId || (projects.length > 0 ? projects[0].id : "")
  );

  useEffect(() => {
    if (activeProjectId) {
      setSelectedProjectId(activeProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  // Filtros e Paginação
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Lista de utilizadores para atribuição
  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  // Estados dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  // Estados do Modal de Comentários
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentsTask, setCommentsTask] = useState<TaskData | null>(null);
  const [taskComments, setTaskComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Formulário de Criação
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    status: "TODO" as "TODO" | "IN_PROGRESS" | "DONE",
    dueDate: "",
    assigneeId: "",
  });
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Formulário de Edição
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    status: "TODO" as "TODO" | "IN_PROGRESS" | "DONE",
    dueDate: "",
    assigneeId: "",
  });
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const isManager = currentUser?.role === "PROJECT_MANAGER";
  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // Carregar utilizadores para atribuição
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/v1/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Erro ao carregar utilizadores:", err);
      }
    }
    loadUsers();
  }, []);

  // Carregar tarefas do projeto com filtros e paginação
  const fetchTasks = useCallback(
    async (pageToLoad = pagination.page) => {
      if (!selectedProjectId) {
        setTasks([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageToLoad),
          limit: String(pagination.limit),
        });
        if (statusFilter) params.set("status", statusFilter);
        if (priorityFilter) params.set("priority", priorityFilter);

        const res = await fetch(`/api/v1/projects/${selectedProjectId}/tasks?${params.toString()}`);
        if (!res.ok) {
          setFeedback({ type: "error", message: "Não foi possível carregar as tarefas do projeto." });
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.tasks && data.pagination) {
          setTasks(data.tasks);
          setPagination(data.pagination);
        } else if (Array.isArray(data)) {
          setTasks(data);
        }
      } catch {
        setFeedback({ type: "error", message: "Erro de ligação ao obter as tarefas." });
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, priorityFilter, selectedProjectId, statusFilter]
  );

  useEffect(() => {
    fetchTasks(1);
  }, [fetchTasks, selectedProjectId, statusFilter, priorityFilter]);

  function handleProjectSelect(id: string) {
    setSelectedProjectId(id);
    if (onProjectChange) onProjectChange(id);
  }

  // --- CRIAÇÃO DE TAREFA ---
  function openCreateModal() {
    setCreateErrors([]);
    const defaultDate = currentProject?.targetDate
      ? currentProject.targetDate.split("T")[0]
      : new Date().toISOString().split("T")[0];

    setCreateForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: defaultDate,
      assigneeId: isManager ? "" : currentUser?.id || "",
    });
    setIsCreateOpen(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateErrors([]);
    setSubmitting(true);

    const trimmedTitle = createForm.title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
      setCreateErrors(["O título da tarefa é obrigatório e deve ter entre 3 e 150 caracteres."]);
      setSubmitting(false);
      return;
    }

    if (createForm.description && createForm.description.length > 2000) {
      setCreateErrors(["A descrição não pode exceder 2000 caracteres."]);
      setSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        title: trimmedTitle,
        description: createForm.description.trim() || null,
        priority: createForm.priority,
        status: createForm.status,
      };

      if (isManager && createForm.dueDate) {
        payload.dueDate = new Date(createForm.dueDate).toISOString();
      }
      if (createForm.assigneeId) {
        payload.assigneeId = createForm.assigneeId;
      }

      const res = await fetch(`/api/v1/projects/${selectedProjectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateErrors(data.details || [data.message || "Erro ao criar tarefa."]);
        setSubmitting(false);
        return;
      }

      setIsCreateOpen(false);
      setFeedback({ type: "success", message: `Tarefa "${data.title}" criada com sucesso!` });
      await fetchTasks(1);
      if (onMutation) onMutation();
    } catch {
      setCreateErrors(["Erro de ligação ao servidor durante a criação da tarefa."]);
    } finally {
      setSubmitting(false);
    }
  }

  // --- ATUALIZAÇÃO RÁPIDA DE ESTADO ---
  async function handleQuickStatusChange(task: TaskData, newStatus: "TODO" | "IN_PROGRESS" | "DONE") {
    try {
      const res = await fetch(`/api/v1/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.message || "Erro ao alterar estado." });
        return;
      }

      setFeedback({
        type: "success",
        message: `Estado da tarefa "${task.title}" alterado para ${STATUS_LABELS[newStatus]}.`,
      });
      await fetchTasks(pagination.page);
      if (onMutation) onMutation();
    } catch {
      setFeedback({ type: "error", message: "Erro ao comunicar alteração de estado à API." });
    }
  }

  // --- EDIÇÃO DE TAREFA ---
  function openEditModal(task: TaskData) {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate.split("T")[0],
      assigneeId: task.assigneeId || "",
    });
    setEditErrors([]);
    setIsEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setEditErrors([]);
    setSubmitting(true);

    const trimmedTitle = editForm.title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
      setEditErrors(["O título da tarefa deve ter entre 3 e 150 caracteres."]);
      setSubmitting(false);
      return;
    }

    if (editForm.description && editForm.description.length > 2000) {
      setEditErrors(["A descrição não pode exceder 2000 caracteres."]);
      setSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        title: trimmedTitle,
        description: editForm.description.trim() || null,
        status: editForm.status,
      };

      if (isManager) {
        payload.priority = editForm.priority;
        if (editForm.dueDate) {
          payload.dueDate = new Date(editForm.dueDate).toISOString();
        }
        payload.assigneeId = editForm.assigneeId || null;
      }

      const res = await fetch(`/api/v1/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditErrors(data.details || [data.message || "Erro ao atualizar tarefa."]);
        setSubmitting(false);
        return;
      }

      setIsEditOpen(false);
      setSelectedTask(null);
      setFeedback({ type: "success", message: `Tarefa "${data.title}" atualizada com sucesso!` });
      await fetchTasks(pagination.page);
      if (onMutation) onMutation();
    } catch {
      setEditErrors(["Erro de ligação ao atualizar a tarefa."]);
    } finally {
      setSubmitting(false);
    }
  }

  // --- ELIMINAÇÃO DE TAREFA ---
  function openDeleteDialog(task: TaskData) {
    setSelectedTask(task);
    setIsDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/tasks/${selectedTask.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.message || "Erro ao eliminar tarefa." });
        setIsDeleteOpen(false);
        setSubmitting(false);
        return;
      }

      setIsDeleteOpen(false);
      setFeedback({ type: "success", message: `Tarefa "${selectedTask.title}" eliminada com sucesso.` });
      setSelectedTask(null);
      await fetchTasks(1);
      if (onMutation) onMutation();
    } catch {
      setFeedback({ type: "error", message: "Erro ao comunicar eliminação da tarefa." });
    } finally {
      setSubmitting(false);
    }
  }

  // --- MÚLTIPLOS RESPONSÁVEIS: ADICIONAR E REMOVER ATRIBUIÇÕES ---
  async function handleAddAssignee(taskId: string, userId: string) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.message || "Erro ao associar responsável à tarefa.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: `Colaborador ${data.user?.name || "atribuído"} associado à tarefa com sucesso!`,
      });
      await fetchTasks(pagination.page);
      if (onMutation) onMutation();
    } catch {
      setFeedback({ type: "error", message: "Erro de ligação ao associar responsável." });
    }
  }

  async function handleRemoveAssignee(taskId: string, userId: string, userName: string) {
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/assignees/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.message || "Erro ao remover responsável da tarefa.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: `Atribuição de ${userName} removida da tarefa com sucesso!`,
      });
      await fetchTasks(pagination.page);
      if (onMutation) onMutation();
    } catch {
      setFeedback({ type: "error", message: "Erro de ligação ao remover responsável." });
    }
  }

  // --- GESTÃO DE COMENTÁRIOS: LISTAR E ADICIONAR ---
  async function openCommentsModal(task: TaskData) {
    setCommentsTask(task);
    setIsCommentsOpen(true);
    setNewCommentText("");
    setCommentError(null);
    setCommentsLoading(true);

    try {
      const res = await fetch(`/api/v1/tasks/${task.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setTaskComments(data);
      } else {
        setCommentError("Não foi possível carregar os comentários da tarefa.");
      }
    } catch {
      setCommentError("Erro de ligação ao obter os comentários.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentsTask) return;
    setCommentError(null);

    const trimmed = newCommentText.trim();
    if (!trimmed) {
      setCommentError("O comentário não pode estar vazio nem conter apenas espaços.");
      return;
    }

    if (trimmed.length > 2000) {
      setCommentError("O comentário não pode exceder 2000 caracteres.");
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/tasks/${commentsTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCommentError(data.message || data.details?.[0] || "Erro ao registar comentário.");
        setSubmittingComment(false);
        return;
      }

      setTaskComments((prev) => [...prev, data]);
      setNewCommentText("");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === commentsTask.id
            ? { ...t, commentsCount: (t.commentsCount || 0) + 1 }
            : t
        )
      );
      if (onMutation) onMutation();
    } catch {
      setCommentError("Erro de ligação ao registar comentário.");
    } finally {
      setSubmittingComment(false);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-navy-200 p-8 text-center">
        <Plane className="w-12 h-12 text-navy-300 mx-auto mb-3 transform -rotate-45" />
        <h3 className="text-sm font-semibold text-navy-900">Nenhuma missão disponível no esquadrão</h3>
        <p className="text-xs text-navy-500 mt-1">
          Autorize primeiro uma missão para começar a adicionar e coordenar checklists operacionais de voo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded text-current opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO DE RETORNO / DETALHE DA MISSÃO */}
      {onBackToProjects && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 px-4 rounded-xl border border-navy-200 shadow-xs">
          <button
            onClick={onBackToProjects}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-aero-600 bg-navy-50/50 hover:bg-aero-50 px-3 py-1.5 border border-navy-200 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Esquadrão de Missões</span>
          </button>
          <div className="text-xs text-navy-500">
            <span>Checklists operacionais da missão: </span>
            <strong className="text-navy-900 font-semibold">{currentProject?.title}</strong>
          </div>
        </div>
      )}

      {/* SELETOR DE MISSÃO, FILTROS E AÇÕES */}
      <div className="bg-white p-4 rounded-xl border border-navy-200 shadow-xs space-y-4">
        {/* Linha 1: Seleção de Missão e Botão Nova Tarefa */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-navy-700 uppercase tracking-wider whitespace-nowrap">
              Missão Ativa:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full sm:max-w-md px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white font-medium text-navy-900"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTasks(pagination.page)}
              title="Recarregar checklists de voo"
              className="p-2 text-navy-600 hover:text-aero-600 hover:bg-navy-50 border border-navy-200 rounded-lg transition"
            >
              <Fan className={`w-4 h-4 ${loading ? "animate-turbine-spin text-aero-600" : ""}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white text-xs font-semibold rounded-lg shadow-xs transition duration-150 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap motion-reduce:transform-none"
            >
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros de Estado e Prioridade */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-navy-100 text-xs">
          <div className="flex items-center gap-1.5 text-navy-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar por:</span>
          </div>

          {/* Filtro de Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-navy-50/50 border border-navy-200 rounded-lg text-navy-700 font-medium focus:outline-none focus:ring-2 focus:ring-aero-500"
          >
            <option value="">Todos os Estados</option>
            <option value="TODO">A Fazer (Hangar)</option>
            <option value="IN_PROGRESS">Em Progresso (Em Voo)</option>
            <option value="DONE">Concluído (Aterrado)</option>
          </select>

          {/* Filtro de Prioridade */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-navy-50/50 border border-navy-200 rounded-lg text-navy-700 font-medium focus:outline-none focus:ring-2 focus:ring-aero-500"
          >
            <option value="">Todas as Prioridades</option>
            <option value="LOW">Baixa (LOW)</option>
            <option value="MEDIUM">Média (MEDIUM)</option>
            <option value="HIGH">Alta (HIGH)</option>
          </select>

          {(statusFilter || priorityFilter) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setPriorityFilter("");
              }}
              className="text-aero-600 hover:text-aero-800 text-xs font-medium ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* LISTAGEM DE TAREFAS */}
      {loading ? (
        <div className="py-16 text-center text-navy-400 bg-white rounded-xl border border-navy-200">
          <Fan className="w-6 h-6 animate-turbine-spin mx-auto mb-2 text-aero-600" />
          <p className="text-sm">A sintonizar checklists da missão no radar...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-xl border border-navy-200 p-6">
          <Plane className="w-12 h-12 text-navy-300 mx-auto mb-3 transform -rotate-45" />
          <h3 className="text-sm font-semibold text-navy-900 mb-1">
            {statusFilter || priorityFilter ? "Nenhuma checklist encontrada com os filtros selecionados" : "Hangar vazio — sem checklists registadas nesta missão"}
          </h3>
          <p className="text-xs text-navy-500 max-w-sm mx-auto mb-4">
            {statusFilter || priorityFilter
              ? "Experimente ajustar ou limpar os filtros de estado e prioridade."
              : "Registe a primeira tarefa para organizar o plano de voo da equipa na missão."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-aero-600 hover:bg-aero-700 text-white text-xs font-semibold rounded-lg shadow-xs transition hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
          >
            <Plus className="w-4 h-4" /> Nova Tarefa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl border p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                task.isOverdue ? "border-storm-300 bg-storm-50/20" : "border-navy-200"
              }`}
            >
              <div>
                {/* Badges de Estado e Prioridade */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                      task.status === "TODO"
                        ? "bg-navy-100 text-navy-800 border border-navy-200"
                        : task.status === "IN_PROGRESS"
                        ? "bg-aero-50 text-aero-700 border border-aero-200"
                        : "bg-hud-50 text-hud-700 border border-hud-200"
                    }`}
                  >
                    {task.status === "TODO" ? (
                      <>
                        <PlaneTakeoff className="w-3 h-3 text-navy-600" />
                        <span>A Fazer</span>
                      </>
                    ) : task.status === "IN_PROGRESS" ? (
                      <>
                        <Plane className="w-3 h-3 text-aero-600" />
                        <span>Em Progresso</span>
                      </>
                    ) : (
                      <>
                        <PlaneLanding className="w-3 h-3 text-hud-600" />
                        <span>Concluído</span>
                      </>
                    )}
                  </span>

                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                      task.priority === "HIGH"
                        ? "bg-storm-100 text-storm-800"
                        : task.priority === "MEDIUM"
                        ? "bg-runway-100 text-runway-800"
                        : "bg-navy-100 text-navy-700"
                    }`}
                  >
                    Prioridade: {PRIORITY_LABELS[task.priority] || task.priority}
                  </span>
                </div>

                {/* Título */}
                <h4 className="font-semibold text-navy-900 text-sm leading-snug line-clamp-2 mb-1.5">
                  {task.title}
                </h4>

                {/* Descrição */}
                <p className="text-xs text-navy-600 line-clamp-2 min-h-[32px] mb-3">
                  {task.description || <span className="italic text-navy-400">Sem notas adicionais de voo.</span>}
                </p>

                {/* Alerta de Atraso (isOverdue) */}
                {task.isOverdue && (
                  <div className="mb-3 px-2.5 py-1.5 bg-storm-100 border border-storm-200 rounded-lg flex items-center gap-2 text-storm-800 text-[11px] font-semibold animate-pulse">
                    <CloudLightning className="w-3.5 h-3.5 flex-shrink-0 text-storm-600" />
                    <span>Em Turbulência (Data limite expirada)</span>
                  </div>
                )}

                {/* Metadados: Múltiplos Responsáveis e Data Limite */}
                <div className="space-y-2 text-xs text-navy-500 border-t border-navy-100 pt-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1 font-semibold text-navy-700">
                        <UserIcon className="w-3.5 h-3.5 text-navy-400" /> Pilotos (
                        {task.assignees?.length || (task.assignee ? 1 : 0)}):
                      </span>

                      {/* Dropdown de adição de responsáveis elegíveis */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddAssignee(task.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                        className="text-[10px] bg-navy-50/50 hover:bg-navy-100 border border-navy-200 rounded px-1.5 py-0.5 text-aero-600 font-semibold cursor-pointer focus:outline-none"
                      >
                        <option value="" disabled>+ Atribuir Piloto</option>
                        {users
                          .filter((u) => !task.assignees?.some((a) => a.userId === u.id))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role === "PROJECT_MANAGER" ? "Comandante" : "Piloto"})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Chips de responsáveis associados com botão de remoção rápida */}
                    <div className="flex flex-wrap gap-1">
                      {task.assignees && task.assignees.length > 0 ? (
                        task.assignees.map((assignee) => (
                          <span
                            key={assignee.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-navy-100 text-navy-800 border border-navy-200"
                          >
                            <span>{assignee.user.name}</span>
                            <button
                              onClick={() => handleRemoveAssignee(task.id, assignee.userId, assignee.user.name)}
                              title={`Remover atribuição de ${assignee.user.name}`}
                              className="text-navy-400 hover:text-storm-600 ml-0.5 transition"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      ) : task.assignee ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-navy-100 text-navy-800 border border-navy-200">
                          {task.assignee.name}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-navy-400">Não atribuída (Backlog de Hangar)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-navy-50">
                    <Calendar className="w-3.5 h-3.5 text-navy-400" />
                    <span>Data Limite: </span>
                    <span className={task.isOverdue ? "text-storm-600 font-bold" : "text-navy-700"}>
                      {new Date(task.dueDate).toLocaleDateString("pt-PT")}
                    </span>
                  </div>

                  {/* Botão de Acesso aos Comentários */}
                  <div className="pt-2 border-t border-navy-100">
                    <button
                      onClick={() => openCommentsModal(task)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-navy-50/60 hover:bg-aero-50 border border-navy-200 hover:border-aero-200 rounded-lg text-navy-600 hover:text-aero-700 font-medium transition group"
                    >
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-navy-400 group-hover:text-aero-500" />
                        <span>Comunicações de Rádio</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-navy-700 border border-navy-200">
                        {task.commentsCount || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between gap-1">
                {/* Transição de Estado */}
                <div className="flex items-center gap-1">
                  {task.status === "TODO" && (
                    <button
                      onClick={() => handleQuickStatusChange(task, "IN_PROGRESS")}
                      title="Descolar (Mover para Em Progresso)"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-aero-50 text-aero-700 hover:bg-aero-100 rounded transition"
                    >
                      <PlaneTakeoff className="w-3 h-3" /> Iniciar
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleQuickStatusChange(task, "DONE")}
                      title="Aterrar (Marcar como Concluída)"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-hud-50 text-hud-700 hover:bg-hud-100 rounded transition"
                    >
                      <PlaneLanding className="w-3 h-3" /> Concluir
                    </button>
                  )}
                  {task.status === "DONE" && (
                    <button
                      onClick={() => handleQuickStatusChange(task, "IN_PROGRESS")}
                      title="Retornar tarefa ao voo"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-navy-100 text-navy-700 hover:bg-navy-200 rounded transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Reabrir
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(task)}
                    title="Editar metadados da checklist"
                    className="p-1.5 text-navy-500 hover:text-navy-900 hover:bg-navy-100 rounded transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {isManager && (
                    <button
                      onClick={() => openDeleteDialog(task)}
                      title="Eliminar checklist de voo"
                      className="p-1.5 text-storm-500 hover:text-storm-700 hover:bg-storm-50 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTROLO DE PAGINAÇÃO */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-navy-200 text-xs">
          <p className="text-navy-600">
            A apresentar página <strong className="text-navy-900">{pagination.page}</strong> de{" "}
            <strong className="text-navy-900">{pagination.totalPages}</strong> ({pagination.total} tarefas no total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTasks(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-navy-200 rounded-lg font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              onClick={() => fetchTasks(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-navy-200 rounded-lg font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Seguinte <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA TAREFA */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-navy-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-aero-600" />
                <h3 className="font-bold text-navy-900 text-base">Nova Tarefa</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-navy-400 hover:text-navy-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createErrors.length > 0 && (
              <div className="mb-4 p-3 bg-storm-50 border border-storm-200 rounded-lg text-xs text-storm-700 space-y-1">
                {createErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Título da Tarefa * (3 a 150 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ex: Verificar telemetria e calibração de instrumentos"
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 placeholder:text-navy-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Descrição (opcional, até 2000 caracteres)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Instruções de voo, parâmetros técnicos e critérios de validação..."
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 placeholder:text-navy-400"
                />
                <p className="text-[10px] text-navy-400 text-right mt-0.5">
                  {createForm.description.length}/2000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value as "LOW" | "MEDIUM" | "HIGH",
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  >
                    <option value="LOW">Baixa (LOW)</option>
                    <option value="MEDIUM">Média (MEDIUM)</option>
                    <option value="HIGH">Alta (HIGH)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Estado Inicial
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        status: e.target.value as "TODO" | "IN_PROGRESS" | "DONE",
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  >
                    <option value="TODO">A Fazer (Hangar)</option>
                    <option value="IN_PROGRESS">Em Progresso (Em Voo)</option>
                    <option value="DONE">Concluído (Aterrado)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Data Limite (Prazo)
                  </label>
                  <input
                    type="date"
                    disabled={!isManager}
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed text-navy-900"
                  />
                  {!isManager && (
                    <p className="text-[10px] text-navy-400 mt-0.5">Herda a data da missão (apenas Comandante pode alterar).</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Atribuir Piloto
                  </label>
                  <select
                    value={createForm.assigneeId}
                    onChange={(e) => setCreateForm({ ...createForm, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  >
                    <option value="">Não Atribuída (Hangar / Backlog)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === "PROJECT_MANAGER" ? "Comandante" : "Piloto"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-navy-200 rounded-lg text-navy-700 hover:bg-navy-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "A registar..." : "Criar Tarefa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR TAREFA */}
      {isEditOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-navy-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-aero-600" />
                <h3 className="font-bold text-navy-900 text-base">Editar Tarefa</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-navy-400 hover:text-navy-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editErrors.length > 0 && (
              <div className="mb-4 p-3 bg-storm-50 border border-storm-200 rounded-lg text-xs text-storm-700 space-y-1">
                {editErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Título da Tarefa * (3 a 150 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Descrição (opcional, até 2000 caracteres)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                />
                <p className="text-[10px] text-navy-400 text-right mt-0.5">
                  {editForm.description.length}/2000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Estado Operacional
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as "TODO" | "IN_PROGRESS" | "DONE",
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  >
                    <option value="TODO">A Fazer (Hangar)</option>
                    <option value="IN_PROGRESS">Em Progresso (Em Voo)</option>
                    <option value="DONE">Concluído (Aterrado)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    disabled={!isManager}
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        priority: e.target.value as "LOW" | "MEDIUM" | "HIGH",
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed text-navy-900"
                  >
                    <option value="LOW">Baixa (LOW)</option>
                    <option value="MEDIUM">Média (MEDIUM)</option>
                    <option value="HIGH">Alta (HIGH)</option>
                  </select>
                </div>
              </div>

              {isManager && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                      Data Limite (Prazo)
                    </label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                      Atribuir Piloto
                    </label>
                    <select
                      value={editForm.assigneeId}
                      onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                    >
                      <option value="">Não Atribuída (Hangar / Backlog)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === "PROJECT_MANAGER" ? "Comandante" : "Piloto"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-navy-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-navy-200 rounded-lg text-navy-700 hover:bg-navy-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "A guardar..." : "Guardar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO MODAL: CONFIRMAÇÃO DE ELIMINAÇÃO DE TAREFA */}
      {isDeleteOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-storm-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-storm-100 text-storm-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-base">Eliminar Tarefa</h3>
                <p className="text-xs text-navy-500">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-navy-700 leading-relaxed mb-4">
              Tem a certeza de que deseja eliminar a tarefa{" "}
              <strong className="text-navy-900 font-semibold">"{selectedTask.title}"</strong>?
            </p>

            <div className="p-3 bg-runway-50 border border-runway-200 rounded-lg text-xs text-runway-800 mb-5 leading-relaxed">
              <strong>Regra de Integridade:</strong> Todas as comunicações de rádio associadas a esta checklist serão
              eliminadas em cascata da base de dados.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={submitting}
                className="px-4 py-2 border border-navy-200 rounded-lg text-xs font-semibold text-navy-700 hover:bg-navy-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 bg-storm-600 hover:bg-storm-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {submitting ? "A eliminar..." : "Sim, Eliminar Tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMENTÁRIOS DA TAREFA */}
      {isCommentsOpen && commentsTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-navy-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-navy-100 mb-4 flex-shrink-0">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="w-5 h-5 text-aero-600" />
                  <h3 className="font-bold text-navy-900 text-base">Comunicações de Rádio & Telemetria</h3>
                </div>
                <p className="text-xs font-medium text-navy-600 line-clamp-1">{commentsTask.title}</p>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="text-navy-400 hover:text-navy-600 p-1 rounded-lg hover:bg-navy-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista Cronológica de Comentários */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 min-h-[160px]">
              {commentsLoading ? (
                <div className="py-12 text-center text-navy-400">
                  <Fan className="w-5 h-5 animate-turbine-spin mx-auto mb-2 text-aero-600" />
                  <p className="text-xs">A sintonizar frequência de rádio...</p>
                </div>
              ) : taskComments.length === 0 ? (
                <div className="py-10 text-center text-navy-400 bg-navy-50/60 rounded-xl border border-dashed border-navy-200 p-4">
                  <Radio className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-navy-700">Canal de rádio em silêncio</p>
                  <p className="text-[11px] text-navy-500 mt-0.5">
                    Seja o primeiro a transmitir notas ou relatórios de voo sobre esta tarefa.
                  </p>
                </div>
              ) : (
                taskComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-navy-50/50 rounded-xl border border-navy-200/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-navy-800">
                        <span>{comment.author.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            comment.author.role === "PROJECT_MANAGER"
                              ? "bg-runway-100 text-runway-800"
                              : "bg-aero-100 text-aero-700"
                          }`}
                        >
                          {comment.author.role === "PROJECT_MANAGER" ? "Comandante" : "Piloto"}
                        </span>
                      </div>
                      <span className="text-[10px] text-navy-400 whitespace-nowrap">
                        {new Date(comment.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-navy-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Erro de Submissão */}
            {commentError && (
              <div className="mb-3 p-2.5 bg-storm-50 border border-storm-200 rounded-lg text-xs text-storm-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-storm-600 flex-shrink-0" />
                <span>{commentError}</span>
              </div>
            )}

            {/* Formulário de Adicionar Comentário */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-navy-100 flex-shrink-0 space-y-2">
              <div className="relative">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={newCommentText}
                  onChange={(e) => {
                    setNewCommentText(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  placeholder="Transmitir mensagem pelo rádio de bordo... (1 a 2000 caracteres)"
                  className="w-full px-3 py-2 text-xs bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white resize-none text-navy-900 placeholder:text-navy-400"
                />
                <div className="text-[10px] text-navy-400 text-right mt-0.5">
                  {newCommentText.trim().length} / 2000 caracteres
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-navy-500">
                  Transponder ativo: <strong className="text-navy-700">{currentUser?.name || "Operador"}</strong>
                </span>
                <button
                  type="submit"
                  disabled={submittingComment || !newCommentText.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-aero-600 hover:bg-aero-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  {submittingComment ? "A transmitir..." : "Transmitir Mensagem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
