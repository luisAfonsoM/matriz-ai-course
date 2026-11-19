"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Plane,
  PlaneTakeoff,
  Lock,
  Fan,
  ArrowRight,
} from "lucide-react";

export interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  targetDate: string;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD";
  managerId: string;
  manager: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "PROJECT_MANAGER" | "TEAM_MEMBER";
}

export interface ProjectManagementProps {
  currentUser: CurrentUser | null;
  onSelectProject?: (projectId: string) => void;
  onMutation?: () => void;
}

export function ProjectManagement({ currentUser, onSelectProject, onMutation }: ProjectManagementProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Estados dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

  // Estados do formulário de criação
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Estados do formulário de edição
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    startDate: "",
    targetDate: "",
    status: "ACTIVE" as "ACTIVE" | "COMPLETED" | "ON_HOLD",
  });
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const isManager = currentUser?.role === "PROJECT_MANAGER";

  // Carregar lista de projetos da API
  const fetchProjects = useCallback(
    async (pageToLoad = pagination.page, searchTerm = search) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(pageToLoad),
          limit: String(pagination.limit),
          search: searchTerm,
        });

        const res = await fetch(`/api/v1/projects?${queryParams.toString()}`);
        if (!res.ok) {
          if (res.status === 401) {
            setFeedback({ type: "error", message: "Sessão expirada. Por favor inicie sessão novamente." });
          } else {
            setFeedback({ type: "error", message: "Não foi possível carregar os projetos da base de dados." });
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.projects && data.pagination) {
          setProjects(data.projects);
          setPagination(data.pagination);
        } else if (Array.isArray(data)) {
          setProjects(data);
        }
      } catch (err) {
        setFeedback({ type: "error", message: "Erro de conectividade com a API de projetos." });
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, search]
  );

  useEffect(() => {
    fetchProjects(1, search);
  }, [search]);

  // Handler de pesquisa com debounce simples
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  // --- CRIAÇÃO DE PROJETO ---
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateErrors([]);
    setSubmitting(true);

    if (createForm.title.trim().length < 3 || createForm.title.trim().length > 100) {
      setCreateErrors(["O título do projeto é obrigatório e deve ter entre 3 e 100 caracteres."]);
      setSubmitting(false);
      return;
    }

    if (createForm.description && createForm.description.length > 1000) {
      setCreateErrors(["A descrição do projeto não pode exceder 1000 caracteres."]);
      setSubmitting(false);
      return;
    }

    if (new Date(createForm.targetDate) < new Date(createForm.startDate)) {
      setCreateErrors(["A data prevista de conclusão não pode ser anterior à data de início."]);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          startDate: new Date(createForm.startDate).toISOString(),
          targetDate: new Date(createForm.targetDate).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateErrors(data.details || [data.message || "Erro ao criar projeto."]);
        setSubmitting(false);
        return;
      }

      setIsCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      setFeedback({ type: "success", message: `Projeto "${data.title}" criado e persistido com sucesso!` });
      await fetchProjects(1, search);
      if (onMutation) onMutation();
    } catch {
      setCreateErrors(["Erro de ligação ao servidor durante a criação."]);
    } finally {
      setSubmitting(false);
    }
  }

  // --- EDIÇÃO DE PROJETO ---
  function openEditModal(project: ProjectData) {
    setSelectedProject(project);
    setEditForm({
      title: project.title,
      description: project.description || "",
      startDate: project.startDate.split("T")[0],
      targetDate: project.targetDate.split("T")[0],
      status: project.status,
    });
    setEditErrors([]);
    setIsEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return;
    setEditErrors([]);
    setSubmitting(true);

    if (editForm.title.trim().length < 3 || editForm.title.trim().length > 100) {
      setEditErrors(["O título do projeto deve ter entre 3 e 100 caracteres."]);
      setSubmitting(false);
      return;
    }

    if (editForm.description && editForm.description.length > 1000) {
      setEditErrors(["A descrição do projeto não pode exceder 1000 caracteres."]);
      setSubmitting(false);
      return;
    }

    if (new Date(editForm.targetDate) < new Date(editForm.startDate)) {
      setEditErrors(["A data prevista de conclusão não pode ser anterior à data de início."]);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          startDate: new Date(editForm.startDate).toISOString(),
          targetDate: new Date(editForm.targetDate).toISOString(),
          status: editForm.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditErrors(data.details || [data.message || "Erro ao atualizar projeto."]);
        setSubmitting(false);
        return;
      }

      setIsEditOpen(false);
      setSelectedProject(null);
      setFeedback({ type: "success", message: `Projeto "${data.title}" atualizado com sucesso!` });
      await fetchProjects(pagination.page, search);
      if (onMutation) onMutation();
    } catch {
      setEditErrors(["Erro de ligação ao servidor durante a atualização."]);
    } finally {
      setSubmitting(false);
    }
  }

  // --- ELIMINAÇÃO DE PROJETO COM CONFIRMAÇÃO ---
  function openDeleteDialog(project: ProjectData) {
    setSelectedProject(project);
    setIsDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!selectedProject) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/projects/${selectedProject.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.message || "Erro ao eliminar projeto." });
        setIsDeleteOpen(false);
        setSubmitting(false);
        return;
      }

      setIsDeleteOpen(false);
      setFeedback({
        type: "success",
        message: `Projeto "${selectedProject.title}" e todos os dados dependentes foram eliminados com sucesso.`,
      });
      setSelectedProject(null);
      await fetchProjects(1, search);
      if (onMutation) onMutation();
    } catch {
      setFeedback({ type: "error", message: "Erro de ligação ao tentar eliminar o projeto." });
    } finally {
      setSubmitting(false);
    }
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

      {/* BARRA SUPERIOR DE AÇÕES E PESQUISA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Campo de Pesquisa por Nome */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Pesquisar missões por código ou nome..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white transition text-navy-900 placeholder:text-navy-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botão de Criação de Projeto (Apenas Gestor) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProjects(pagination.page, search)}
            title="Recarregar missões"
            className="p-2 text-navy-600 hover:text-aero-600 hover:bg-navy-50 border border-navy-200 rounded-lg transition"
          >
            <Fan className={`w-4 h-4 ${loading ? "animate-turbine-spin text-aero-600" : ""}`} />
          </button>

          {isManager ? (
            <button
              onClick={() => {
                setCreateErrors([]);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white text-sm font-semibold rounded-lg shadow-xs transition duration-150 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap motion-reduce:transform-none"
            >
              <Plus className="w-4 h-4" /> Nova Missão
            </button>
          ) : (
            <button
              disabled
              title="Apenas Comandantes têm permissão para criar novas missões"
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-100 text-navy-400 border border-navy-200 text-sm font-medium rounded-lg cursor-not-allowed whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" /> Nova Missão (Comandante)
            </button>
          )}
        </div>
      </div>

      {/* LISTAGEM DE MISSÕES */}
      {loading ? (
        <div className="py-16 text-center text-navy-400 bg-white rounded-xl border border-navy-200">
          <Fan className="w-6 h-6 animate-turbine-spin mx-auto mb-2 text-aero-600" />
          <p className="text-sm">A rastrear missões no radar central...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-navy-200 p-6">
          <Plane className="w-12 h-12 text-navy-300 mx-auto mb-3 transform -rotate-45" />
          <h3 className="text-base font-semibold text-navy-900 mb-1">
            {search ? "Nenhuma missão encontrada no radar" : "Nenhuma missão registada no esquadrão"}
          </h3>
          <p className="text-xs text-navy-500 max-w-sm mx-auto mb-4">
            {search
              ? `Não foram encontrados planos de voo para "${search}". Tente outro termo.`
              : "Ainda não existem missões ativas. Como Comandante, pode autorizar o primeiro plano de voo."}
          </p>
          {isManager && !search && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white text-xs font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Registar Primeira Missão
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-1">
                    {project.title}
                  </h3>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${
                      project.status === "ACTIVE"
                        ? "bg-aero-50 text-aero-700 border border-aero-200"
                        : project.status === "COMPLETED"
                        ? "bg-hud-50 text-hud-700 border border-hud-200"
                        : "bg-runway-50 text-runway-700 border border-runway-200"
                    }`}
                  >
                    {project.status === "ACTIVE"
                      ? "Em Rota"
                      : project.status === "COMPLETED"
                      ? "Aterrado"
                      : "Em Espera"}
                  </span>
                </div>

                {/* Descrição */}
                <p className="text-xs text-navy-600 mb-4 line-clamp-2 min-h-[32px]">
                  {project.description || <span className="italic text-navy-400">Sem plano de voo detalhado.</span>}
                </p>

                {/* Progresso */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-navy-500 mb-1 font-medium">
                    <span>Progresso ({project.completedTasks}/{project.totalTasks} checklists)</span>
                    <span className="font-bold text-navy-700">{project.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-navy-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        project.progressPercentage === 100 ? "bg-hud-500" : "bg-aero-600"
                      }`}
                      style={{ width: `${project.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Metadados: Comandante e Datas */}
                <div className="space-y-1.5 text-xs text-navy-500 border-t border-navy-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-navy-400" />
                    <span>Comandante: </span>
                    <strong className="text-navy-700 font-medium">{project.manager.name}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-navy-400" />
                    <span>Plano de Voo: </span>
                    <span className="text-navy-700">
                      {new Date(project.startDate).toLocaleDateString("pt-PT")} até{" "}
                      {new Date(project.targetDate).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectProject && onSelectProject(project.id)}
                  title="Ver detalhes da missão e gerir checklists associadas"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-aero-50 hover:bg-aero-100 text-aero-700 rounded-lg transition"
                >
                  <span>Ver Missão / Checklists</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  {isManager ? (
                    <>
                      <button
                        onClick={() => openEditModal(project)}
                        title="Editar metadados do projeto"
                        className="inline-flex items-center gap-1 text-xs font-semibold p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteDialog(project)}
                        title="Eliminar projeto e tarefas associadas"
                        className="inline-flex items-center gap-1 text-xs font-semibold p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : null}
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
            <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} projetos no total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchProjects(pagination.page - 1, search)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              onClick={() => fetchProjects(pagination.page + 1, search)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Seguinte <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA MISSÃO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-navy-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="w-5 h-5 text-aero-600" />
                <h3 className="font-bold text-navy-900 text-base">Nova Missão (Plano de Voo)</h3>
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
                  Designação da Missão * (3 a 100 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ex: Operação Radar Atlas v2"
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 placeholder:text-navy-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Briefing / Descrição (opcional, até 1000 caracteres)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Objetivos e parâmetros operacionais da missão..."
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 placeholder:text-navy-400"
                />
                <p className="text-[10px] text-navy-400 text-right mt-0.5">
                  {createForm.description.length}/1000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Descolagem Prevista *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Aterragem Prevista *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.targetDate}
                    onChange={(e) => setCreateForm({ ...createForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  />
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
                  className="px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 inline-flex items-center gap-2 group"
                >
                  <PlaneTakeoff className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  {submitting ? "A autorizar..." : "Autorizar Missão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MISSÃO */}
      {isEditOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-navy-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-aero-600" />
                <h3 className="font-bold text-navy-900 text-base">Editar Missão</h3>
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
                  Designação da Missão * (3 a 100 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Briefing / Descrição (opcional, até 1000 caracteres)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                />
                <p className="text-[10px] text-navy-400 text-right mt-0.5">
                  {editForm.description.length}/1000 caracteres
                </p>
              </div>

              <div>
                <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                  Estado Operacional da Missão
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as "ACTIVE" | "COMPLETED" | "ON_HOLD",
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                >
                  <option value="ACTIVE">Em Operação / Ativa (ACTIVE)</option>
                  <option value="COMPLETED">Cumprida / Aterrada (COMPLETED)</option>
                  <option value="ON_HOLD">No Hangar / Em Espera (ON_HOLD)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Descolagem Prevista
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-navy-700 uppercase tracking-wider mb-1">
                    Aterragem Prevista
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.targetDate}
                    onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-navy-50/50 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900"
                  />
                </div>
              </div>

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
                  {submitting ? "A atualizar..." : "Atualizar Missão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO MODAL: CONFIRMAÇÃO DE ELIMINAÇÃO (RNF03 / Anti-Órfãos) */}
      {isDeleteOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-storm-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-storm-100 text-storm-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-base">Cancelar Missão</h3>
                <p className="text-xs text-navy-500">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-navy-700 leading-relaxed mb-4">
              Tem a certeza de que deseja cancelar e eliminar a missão{" "}
              <strong className="text-navy-900 font-semibold">"{selectedProject.title}"</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-5 leading-relaxed">
              <strong>Regra de Integridade Referencial:</strong> Todos os{" "}
              <strong>{selectedProject.totalTasks} itens de voo</strong> e respetivos relatórios dependentes serão
              eliminados em cascata da base de dados para evitar registos órfãos no radar.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={submitting}
                className="px-4 py-2 border border-navy-200 rounded-lg text-xs font-semibold text-navy-700 hover:bg-navy-50 transition"
              >
                Manter Missão
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 bg-storm-600 hover:bg-storm-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {submitting ? "A cancelar..." : "Sim, Abortar e Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
