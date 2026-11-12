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
  RefreshCw,
  RotateCcw,
  ListTodo,
  MessageSquare,
  Send,
  ArrowLeft,
} from "lucide-react";

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
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Nenhum projeto disponível</h3>
        <p className="text-xs text-slate-500 mt-1">
          Crie primeiro um projeto para começar a adicionar e gerir tarefas de trabalho.
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

      {/* NAVEGAÇÃO DE RETORNO / DETALHE DO PROJETO */}
      {onBackToProjects && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={onBackToProjects}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 border border-slate-200 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar à Lista de Projetos</span>
          </button>
          <div className="text-xs text-slate-500">
            <span>A gerir tarefas do projeto: </span>
            <strong className="text-slate-900 font-semibold">{currentProject?.title}</strong>
          </div>
        </div>
      )}

      {/* SELETOR DE PROJETO, FILTROS E AÇÕES */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Linha 1: Seleção de Projeto e Botão Nova Tarefa */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
              Projeto:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full sm:max-w-md px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
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
              title="Recarregar tarefas"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros de Estado e Prioridade */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar por:</span>
          </div>

          {/* Filtro de Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Estados</option>
            <option value="TODO">A Fazer (TODO)</option>
            <option value="IN_PROGRESS">Em Progresso (IN_PROGRESS)</option>
            <option value="DONE">Concluído (DONE)</option>
          </select>

          {/* Filtro de Prioridade */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="text-blue-600 hover:text-blue-800 text-xs font-medium ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* LISTAGEM DE TAREFAS */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm">A carregar tarefas do projeto...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-xl border border-slate-200 p-6">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            {statusFilter || priorityFilter ? "Nenhuma tarefa encontrada com os filtros selecionados" : "Nenhuma tarefa registada neste projeto"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {statusFilter || priorityFilter
              ? "Experimente ajustar ou limpar os filtros de estado e prioridade."
              : "Registe a primeira tarefa para organizar o fluxo de trabalho da equipa no projeto."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Criar Primeira Tarefa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                task.isOverdue ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
              }`}
            >
              <div>
                {/* Badges de Estado e Prioridade */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                      task.status === "TODO"
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : task.status === "IN_PROGRESS"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {STATUS_LABELS[task.status] || task.status}
                  </span>

                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                      task.priority === "HIGH"
                        ? "bg-rose-100 text-rose-800"
                        : task.priority === "MEDIUM"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Prioridade: {PRIORITY_LABELS[task.priority] || task.priority}
                  </span>
                </div>

                {/* Título */}
                <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1.5">
                  {task.title}
                </h4>

                {/* Descrição */}
                <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] mb-3">
                  {task.description || <span className="italic text-slate-400">Sem descrição adicional.</span>}
                </p>

                {/* Alerta de Atraso (isOverdue) */}
                {task.isOverdue && (
                  <div className="mb-3 px-2.5 py-1.5 bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-[11px] font-semibold animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                    <span>Em Atraso (Data limite expirada)</span>
                  </div>
                )}

                {/* Metadados: Múltiplos Responsáveis e Data Limite */}
                <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Responsáveis (
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
                        className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-blue-600 font-semibold cursor-pointer focus:outline-none"
                      >
                        <option value="" disabled>+ Atribuir</option>
                        {users
                          .filter((u) => !task.assignees?.some((a) => a.userId === u.id))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role === "PROJECT_MANAGER" ? "Gestor" : "Membro"})
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                          >
                            <span>{assignee.user.name}</span>
                            <button
                              onClick={() => handleRemoveAssignee(task.id, assignee.userId, assignee.user.name)}
                              title={`Remover atribuição de ${assignee.user.name}`}
                              className="text-slate-400 hover:text-rose-600 ml-0.5 transition"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      ) : task.assignee ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {task.assignee.name}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Não atribuída (Backlog)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Data Limite: </span>
                    <span className={task.isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}>
                      {new Date(task.dueDate).toLocaleDateString("pt-PT")}
                    </span>
                  </div>

                  {/* Botão de Acesso aos Comentários */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openCommentsModal(task)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-slate-600 hover:text-blue-700 font-medium transition group"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                        <span>Comentários</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                        {task.commentsCount || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                {/* Transição de Estado */}
                <div className="flex items-center gap-1">
                  {task.status === "TODO" && (
                    <button
                      onClick={() => handleQuickStatusChange(task, "IN_PROGRESS")}
                      title="Mover para Em Progresso"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition"
                    >
                      <Clock className="w-3 h-3" /> Iniciar
                    </button>
                  )}
                  {task.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleQuickStatusChange(task, "DONE")}
                      title="Marcar como Concluída"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Concluir
                    </button>
                  )}
                  {task.status === "DONE" && (
                    <button
                      onClick={() => handleQuickStatusChange(task, "IN_PROGRESS")}
                      title="Reabrir tarefa"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Reabrir
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(task)}
                    title="Editar metadados da tarefa"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {isManager && (
                    <button
                      onClick={() => openDeleteDialog(task)}
                      title="Eliminar tarefa"
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
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
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs">
          <p className="text-slate-600">
            A apresentar página <strong className="text-slate-900">{pagination.page}</strong> de{" "}
            <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} tarefas no total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTasks(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              onClick={() => fetchTasks(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Seguinte <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA TAREFA */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Nova Tarefa</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createErrors.length > 0 && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 space-y-1">
                {createErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Título da Tarefa * (3 a 150 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ex: Implementar testes e validação com Zod"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição (opcional, até 2000 caracteres)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Detalhes, critérios e notas de execução..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">
                  {createForm.description.length}/2000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="LOW">Baixa (LOW)</option>
                    <option value="MEDIUM">Média (MEDIUM)</option>
                    <option value="HIGH">Alta (HIGH)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="TODO">A Fazer (TODO)</option>
                    <option value="IN_PROGRESS">Em Progresso (IN_PROGRESS)</option>
                    <option value="DONE">Concluído (DONE)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data Limite (Prazo)
                  </label>
                  <input
                    type="date"
                    disabled={!isManager}
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {!isManager && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Herda a data do projeto (apenas Gestor pode alterar).</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Atribuir Responsável
                  </label>
                  <select
                    value={createForm.assigneeId}
                    onChange={(e) => setCreateForm({ ...createForm, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">Não Atribuída (Backlog)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role === "PROJECT_MANAGER" ? "Gestor" : "Membro"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Editar Tarefa</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editErrors.length > 0 && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 space-y-1">
                {editErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Título da Tarefa * (3 a 150 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição (opcional, até 2000 caracteres)
                </label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 text-right mt-0.5">
                  {editForm.description.length}/2000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Estado no Kanban
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as "TODO" | "IN_PROGRESS" | "DONE",
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="TODO">A Fazer (TODO)</option>
                    <option value="IN_PROGRESS">Em Progresso (IN_PROGRESS)</option>
                    <option value="DONE">Concluído (DONE)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
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
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Data Limite (Prazo)
                    </label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Atribuir Responsável
                    </label>
                    <select
                      value={editForm.assigneeId}
                      onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      <option value="">Não Atribuída (Backlog)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === "PROJECT_MANAGER" ? "Gestor" : "Membro"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Eliminar Tarefa</h3>
                <p className="text-xs text-slate-500">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              Tem a certeza de que deseja eliminar a tarefa{" "}
              <strong className="text-slate-900 font-semibold">"{selectedTask.title}"</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-5 leading-relaxed">
              <strong>Regra de Integridade:</strong> Todos os comentários associados a esta tarefa serão
              eliminados em cascata da base de dados.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={submitting}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4 flex-shrink-0">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">Comentários da Tarefa</h3>
                </div>
                <p className="text-xs font-medium text-slate-600 line-clamp-1">{commentsTask.title}</p>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista Cronológica de Comentários */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 min-h-[160px]">
              {commentsLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">A carregar comentários...</p>
                </div>
              ) : taskComments.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-4">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Sem comentários registados</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Seja o primeiro a partilhar notas ou atualizações sobre esta tarefa.
                  </p>
                </div>
              ) : (
                taskComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span>{comment.author.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            comment.author.role === "PROJECT_MANAGER"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {comment.author.role === "PROJECT_MANAGER" ? "Gestor" : "Membro"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(comment.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Erro de Submissão */}
            {commentError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{commentError}</span>
              </div>
            )}

            {/* Formulário de Adicionar Comentário */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
              <div className="relative">
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={newCommentText}
                  onChange={(e) => {
                    setNewCommentText(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                  placeholder="Escreva um comentário sobre o progresso desta tarefa... (1 a 2000 caracteres)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
                <div className="text-[10px] text-slate-400 text-right mt-0.5">
                  {newCommentText.trim().length} / 2000 caracteres
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Identidade inferida: <strong className="text-slate-600">{currentUser?.name || "Utilizador"}</strong>
                </span>
                <button
                  type="submit"
                  disabled={submittingComment || !newCommentText.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingComment ? "A publicar..." : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
