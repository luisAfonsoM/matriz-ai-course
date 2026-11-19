"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlaneLanding,
  Clock,
  AlertCircle,
  ClipboardList,
  Compass,
  Plus,
  ArrowRight,
  Fan,
  Calendar,
  CloudLightning,
  UserCheck,
  Plane,
  Gauge,
  Rocket,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AVIATION_LABELS } from "@/lib/labels";

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
      <div className="bg-white rounded-2xl border border-navy-200 p-12 text-center shadow-xs">
        <Plane className="w-12 h-12 text-navy-300 mx-auto mb-3 transform -rotate-45" />
        <h3 className="text-base font-bold text-navy-900">{AVIATION_LABELS.empty.noMissions}</h3>
        <p className="text-xs text-navy-500 mt-1 max-w-sm mx-auto">
          {AVIATION_LABELS.empty.noMissionsSub}
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
      {/* CABEÇALHO ANALÍTICO: SELETOR DE MISSÃO & BARRA DE PROGRESSO */}
      <div className="bg-white rounded-2xl border border-navy-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-500 whitespace-nowrap flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-aero-600" />
              Missão Ativa:
            </span>
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full sm:w-auto min-w-[260px] px-3 py-2 text-sm font-semibold bg-navy-50 border border-navy-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 transition"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => selectedProject?.id && fetchMetrics(selectedProject.id)}
              title="Calibrar instrumentos da torre"
              className="p-2 text-navy-500 hover:text-aero-600 hover:bg-navy-50 rounded-lg border border-navy-200 transition"
            >
              <Fan className={`w-4 h-4 ${loading ? "animate-turbine-spin text-aero-600" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTasks(selectedProject?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-navy-700 hover:text-aero-600 bg-navy-50 hover:bg-aero-50 border border-navy-200 rounded-lg transition"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Ver Checklists</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            {currentUser?.role === "PROJECT_MANAGER" && (
              <button
                data-testid="btn-new-task"
                onClick={() => onOpenCreateTask && selectedProject?.id && onOpenCreateTask(selectedProject.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-aero-600 hover:bg-aero-700 rounded-lg shadow-xs transition duration-150 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Tarefa</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE PROGRESSO GLOBAL (DIVISÃO POR ZERO TRATADA) */}
        <div className="pt-3 border-t border-navy-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-navy-600">
              {AVIATION_LABELS.metrics.projectProgress}:{" "}
              <strong className="text-navy-900">
                {metrics ? `${metrics.completedTasks}/${metrics.totalTasks} checklists aterradas` : "A calcular..."}
              </strong>
            </span>
            <span className="text-aero-700 font-bold text-sm">
              {metrics ? `${metrics.progressPercentage}%` : "0%"}
            </span>
          </div>
          <div className="w-full bg-navy-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                metrics?.progressPercentage === 100 ? "bg-hud-500" : "bg-aero-600"
              }`}
              style={{ width: `${metrics?.progressPercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ERRO AO CARREGAR MÉTRICAS */}
      {error && (
        <div className="p-4 bg-storm-50 border border-storm-200 rounded-xl text-xs text-storm-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-storm-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* GRELHA DE 4 KPI CARDS COM INSTRUMENTOS DE COCKPIT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Itens */}
        <div className="bg-white p-5 rounded-2xl border border-navy-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-navy-400 uppercase tracking-wider mb-1">
              {AVIATION_LABELS.metrics.totalTasks}
            </p>
            <p className="text-3xl font-extrabold text-navy-900">
              {loading ? "..." : metrics?.totalTasks ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-navy-100 text-navy-700 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Aterradas (DONE) */}
        <div className="bg-white p-5 rounded-2xl border border-hud-100 shadow-xs flex items-center justify-between bg-hud-50/20">
          <div>
            <p className="text-[11px] font-bold text-hud-700 uppercase tracking-wider mb-1">
              {AVIATION_LABELS.status.DONE} (Concluídas)
            </p>
            <p className="text-3xl font-extrabold text-hud-600">
              {loading ? "..." : metrics?.completedTasks ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-hud-100 text-hud-600 flex items-center justify-center">
            <PlaneLanding className="w-6 h-6" />
          </div>
        </div>

        {/* Em Voo (IN_PROGRESS) */}
        <div className="bg-white p-5 rounded-2xl border border-aero-100 shadow-xs flex items-center justify-between bg-aero-50/20">
          <div>
            <p className="text-[11px] font-bold text-aero-700 uppercase tracking-wider mb-1">
              {AVIATION_LABELS.status.IN_PROGRESS}
            </p>
            <p className="text-3xl font-extrabold text-aero-600">
              {loading ? "..." : metrics?.inProgressTasks ?? 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-aero-100 text-aero-600 flex items-center justify-center">
            <Plane className="w-6 h-6 transform -rotate-45" />
          </div>
        </div>

        {/* Em Turbulência / Atraso (isOverdue) */}
        <div
          className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between transition ${
            (metrics?.overdueTasksCount || 0) > 0
              ? "bg-storm-50 border-storm-300 text-storm-900"
              : "bg-white border-navy-200 text-navy-700"
          }`}
        >
          <div>
            <p
              className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                (metrics?.overdueTasksCount || 0) > 0 ? "text-storm-700" : "text-navy-400"
              }`}
            >
              {AVIATION_LABELS.metrics.overdueCount}
            </p>
            <p
              className={`text-3xl font-extrabold ${
                (metrics?.overdueTasksCount || 0) > 0 ? "text-storm-600" : "text-navy-900"
              }`}
            >
              {loading ? "..." : metrics?.overdueTasksCount ?? 0}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              (metrics?.overdueTasksCount || 0) > 0
                ? "bg-storm-100 text-storm-600 animate-pulse"
                : "bg-navy-100 text-navy-400"
            }`}
          >
            <CloudLightning className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CASO-LIMITE: HANGAR VAZIO (EC01) */}
      {metrics && metrics.totalTasks === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-200 p-10 text-center shadow-xs">
          <Plane className="w-12 h-12 text-navy-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-navy-900">
            {AVIATION_LABELS.empty.emptyHangar}
          </h3>
          <p className="text-xs text-navy-500 max-w-md mx-auto mt-1 mb-5">
            Estruture o plano de voo da equipa adicionando o primeiro item com piloto responsável, prioridade e prazo.
          </p>
          <button
            onClick={() => onNavigateToTasks(selectedProject.id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-aero-600 hover:bg-aero-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Criar Primeira Checklist da Missão
          </button>
        </div>
      ) : (
        /* PAINÉIS: VELOCIDADE DE CRUZEIRO & VOOS CRÍTICOS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel: Velocidade de Cruzeiro (Últimos 7 dias) */}
          <div className="bg-white rounded-2xl border border-navy-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-aero-600" />
                  <h3 className="font-bold text-navy-900 text-sm">
                    {AVIATION_LABELS.metrics.velocityTitle}
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-navy-400 uppercase">
                  {AVIATION_LABELS.metrics.velocitySubtitle}
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
                      <span className="text-[11px] font-bold text-navy-800">
                        {day.completedCount}
                      </span>
                      <div className="w-full max-w-[32px] bg-navy-100 rounded-t-lg h-28 relative flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isToday ? "bg-aero-600" : "bg-aero-400 hover:bg-aero-500"
                          }`}
                          style={{ height: `${Math.max(heightPercentage, 6)}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] whitespace-nowrap font-medium ${
                          isToday ? "text-aero-700 font-bold" : "text-navy-400"
                        }`}
                      >
                        {isToday ? "Hoje" : dayFormatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-navy-100 mt-4 text-xs text-navy-500 flex items-center justify-between">
              <span>Ritmo de Voo: <strong className="text-navy-900">{avgVelocity} itens / dia</strong></span>
              <span className="text-hud-700 font-semibold bg-hud-50 px-2 py-0.5 rounded border border-hud-200 text-[10px]">
                {totalCompletedLast7Days} aterradas na semana
              </span>
            </div>
          </div>

          {/* Painel: Atenção a Voos Críticos & Turbulência */}
          <div className="bg-white rounded-2xl border border-navy-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-navy-100 mb-3">
                <div className="flex items-center gap-2">
                  <CloudLightning className="w-4 h-4 text-storm-600" />
                  <h3 className="font-bold text-navy-900 text-sm">
                    {AVIATION_LABELS.metrics.criticalTitle} ({metrics?.criticalTasks?.length || 0})
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-storm-600 bg-storm-50 px-2 py-0.5 rounded border border-storm-200">
                  Intervenção Imediata
                </span>
              </div>

              {/* Lista de Voos Críticos */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {metrics?.criticalTasks && metrics.criticalTasks.length > 0 ? (
                  metrics.criticalTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onNavigateToTasks(selectedProject.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition hover:shadow-xs ${
                        task.isOverdue
                          ? "bg-storm-50/60 border-storm-200 hover:border-storm-300"
                          : "bg-runway-50/60 border-runway-200 hover:border-runway-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            task.isOverdue
                              ? "bg-storm-100 text-storm-700"
                              : "bg-runway-100 text-runway-700"
                          }`}
                        >
                          {task.isOverdue ? "Prazo Expirado (UTC)" : "Expira Hoje"}
                        </span>
                        <span className="text-[10px] text-navy-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString("pt-PT")}
                        </span>
                      </div>
                      <h4 className="font-semibold text-navy-900 line-clamp-1 mb-1">
                        {task.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-navy-500">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-navy-400" />
                          {task.assignee?.name || AVIATION_LABELS.crew.unassigned}
                        </span>
                        <span className="font-medium text-navy-800">
                          {task.status === "IN_PROGRESS" ? "Em Voo" : "No Hangar"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-navy-400">
                    <PlaneLanding className="w-8 h-8 text-hud-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-navy-800">Céu limpo: nenhum voo crítico pendente!</p>
                    <p className="text-[11px] text-navy-400 mt-0.5">
                      Todos os itens ativos estão perfeitamente dentro dos prazos de voo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigateToTasks(selectedProject.id)}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold text-aero-700 hover:text-aero-800 bg-aero-50 hover:bg-aero-100 border border-aero-200 rounded-lg transition text-center flex items-center justify-center gap-1.5"
            >
              <span>Aceder ao Hangar & Checklists</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
