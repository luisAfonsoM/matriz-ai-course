"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
  TrendingUp,
  Plus,
  ArrowRight,
  RefreshCw,
  Calendar,
  AlertTriangle,
  User as UserIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ProjectBrief {
  id: string;
  title: string;
  startDate: string;
  targetDate: string;
}

interface ProjectMetricsData {
  projectId: string;
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasksCount: number;
  weeklyVelocity: Array<{ date: string; completedCount: number }>;
  criticalTasks: Array<{
    id: string;
    title: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "TODO" | "IN_PROGRESS" | "DONE";
    dueDate: string;
    isOverdue: boolean;
    assignee?: { name: string } | null;
  }>;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "PROJECT_MANAGER" | "TEAM_MEMBER";
}

interface DashboardViewProps {
  projects: ProjectBrief[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  currentUser: CurrentUser | null;
  onNavigateToTasks: (projectId?: string) => void;
  onOpenCreateTask?: (projectId: string) => void;
}

export function DashboardView({
  projects,
  activeProjectId,
  onSelectProject,
  currentUser,
  onNavigateToTasks,
  onOpenCreateTask,
}: DashboardViewProps) {
  const [metrics, setMetrics] = useState<ProjectMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const fetchMetrics = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    const { data, error: apiErr } = await apiFetch<ProjectMetricsData>(
      `/api/v1/projects/${projectId}/metrics`
    );

    if (apiErr) {
      setError(apiErr.message);
      setLoading(false);
      return;
    }

    setMetrics(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchMetrics(selectedProject.id);
    }
  }, [fetchMetrics, selectedProject?.id]);

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Nenhum projeto registado</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Crie o seu primeiro projeto na aba <strong>Projetos</strong> para começar a acompanhar métricas e prazos.
        </p>
      </div>
    );
  }

  const maxVelocity = metrics?.weeklyVelocity?.reduce(
    (max, item) => Math.max(max, item.completedCount),
    1
  ) || 1;

  const totalCompletedLast7Days = metrics?.weeklyVelocity?.reduce(
    (acc, item) => acc + item.completedCount,
    0
  ) || 0;
  const avgVelocity = (totalCompletedLast7Days / 7).toFixed(1);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO ANALÍTICO: SELETOR DE PROJETO & BARRA DE PROGRESSO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Projeto Ativo:
            </span>
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full sm:w-auto min-w-[260px] px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => selectedProject?.id && fetchMetrics(selectedProject.id)}
              title="Recarregar métricas"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTasks(selectedProject?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg transition"
            >
              <span>Ver Tarefas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {currentUser?.role === "PROJECT_MANAGER" && (
              <button
                onClick={() => onOpenCreateTask && selectedProject?.id && onOpenCreateTask(selectedProject.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Tarefa</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE PROGRESSO GLOBAL COM PREVENÇÃO DIVISÃO POR ZERO (EC01) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">
              Progresso Geral:{" "}
              <strong className="text-slate-900">
                {metrics ? `${metrics.completedTasks}/${metrics.totalTasks} tarefas concluídas` : "A calcular..."}
              </strong>
            </span>
            <span className="text-blue-700 font-bold text-sm">
              {metrics ? `${metrics.progressPercentage}%` : "0%"}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                metrics?.progressPercentage === 100 ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${metrics?.progressPercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ERRO AO CARREGAR MÉTRICAS */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* GRELHA DE 4 KPI CARDS (TOTAL, DONE, IN_PROGRESS, OVERDUE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Tarefas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total de Tarefas
            </p>
            <p className="text-3xl font-extrabold text-slate-800">
              {loading ? "..." : metrics?.totalTasks ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>

        {/* Concluídas (DONE) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between bg-emerald-50/20">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
              Concluídas (DONE)
            </p>
            <p className="text-3xl font-extrabold text-emerald-600">
              {loading ? "..." : metrics?.completedTasks ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Em Progresso (IN_PROGRESS) */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between bg-blue-50/20">
          <div>
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
              Em Progresso
            </p>
            <p className="text-3xl font-extrabold text-blue-600">
              {loading ? "..." : metrics?.inProgressTasks ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Tarefas em Atraso (isOverdue) */}
        <div
          className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition ${
            (metrics?.overdueTasksCount || 0) > 0
              ? "bg-rose-50/80 border-rose-300 text-rose-900"
              : "bg-white border-slate-200 text-slate-700"
          }`}
        >
          <div>
            <p
              className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                (metrics?.overdueTasksCount || 0) > 0 ? "text-rose-700" : "text-slate-400"
              }`}
            >
              Tarefas em Atraso
            </p>
            <p
              className={`text-3xl font-extrabold ${
                (metrics?.overdueTasksCount || 0) > 0 ? "text-rose-600" : "text-slate-800"
              }`}
            >
              {loading ? "..." : metrics?.overdueTasksCount ?? 0}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              (metrics?.overdueTasksCount || 0) > 0
                ? "bg-rose-100 text-rose-600 animate-pulse"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CASO-LIMITE: PROJETO VAZIO (EC01) */}
      {metrics && metrics.totalTasks === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Ainda não foram criadas tarefas neste projeto (EC01)
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Estruture o plano de trabalho da equipa adicionando a primeira tarefa com prioridade, responsáveis e prazo.
          </p>
          <button
            onClick={() => onNavigateToTasks(selectedProject.id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Criar Primeira Tarefa do Projeto
          </button>
        </div>
      ) : (
        /* PAINÉIS LADO A LADO: VELOCIDADE SEMANAL (RF12) & TAREFAS CRÍTICAS (RF11/US04) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel: Velocidade Semanal (Últimos 7 dias) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Velocidade Semanal (Últimos 7 dias)
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  Tarefas concluídas / dia
                </span>
              </div>

              {/* Gráfico de Barras dos 7 dias */}
              <div className="h-44 flex items-end justify-between gap-2 px-2 pt-6 pb-2">
                {metrics?.weeklyVelocity?.map((day, idx) => {
                  const heightPercentage =
                    maxVelocity > 0 ? (day.completedCount / maxVelocity) * 100 : 0;
                  const dateObj = new Date(day.date);
                  const dayFormatted = dateObj.toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "short",
                  });
                  const isToday = idx === 6;

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-[11px] font-bold text-slate-700">
                        {day.completedCount}
                      </span>
                      <div className="w-full max-w-[32px] bg-slate-100 rounded-t-lg h-28 relative flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isToday ? "bg-blue-600" : "bg-blue-400 hover:bg-blue-500"
                          }`}
                          style={{ height: `${Math.max(heightPercentage, 6)}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] whitespace-nowrap font-medium ${
                          isToday ? "text-blue-700 font-bold" : "text-slate-400"
                        }`}
                      >
                        {isToday ? "Hoje" : dayFormatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 text-xs text-slate-500 flex items-center justify-between">
              <span>Média Semanal: <strong className="text-slate-800">{avgVelocity} tarefas / dia</strong></span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                {totalCompletedLast7Days} concluídas na semana
              </span>
            </div>
          </div>

          {/* Painel: Atenção a Tarefas Críticas (Em Atraso ou a Expirar) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Atenção: Tarefas Críticas ({metrics?.criticalTasks?.length || 0})
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Requer Intervenção
                </span>
              </div>

              {/* Lista de Tarefas Críticas */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {metrics?.criticalTasks && metrics.criticalTasks.length > 0 ? (
                  metrics.criticalTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onNavigateToTasks(selectedProject.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition hover:shadow-sm ${
                        task.isOverdue
                          ? "bg-rose-50/40 border-rose-200 hover:border-rose-300"
                          : "bg-amber-50/40 border-amber-200 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            task.isOverdue
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {task.isOverdue ? "Prazo Expirado" : "Expira Hoje"}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 line-clamp-1 mb-1">
                        {task.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          {task.assignee?.name || "Não atribuída"}
                        </span>
                        <span className="font-medium text-slate-700">
                          {task.status === "IN_PROGRESS" ? "Em Progresso" : "A Fazer"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Nenhuma tarefa crítica pendente!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Todas as tarefas ativas estão dentro dos prazos acordados.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigateToTasks(selectedProject.id)}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition text-center flex items-center justify-center gap-1.5"
            >
              <span>Aceder à Gestão Detalhada de Tarefas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
