"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar, NavTab } from "@/components/layout/TopBar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { ProjectManagement } from "@/components/projects/ProjectManagement";
import { TaskManagement } from "@/components/tasks/TaskManagement";
import { Lock } from "lucide-react";
import Link from "next/link";
import { AVIATION_LABELS } from "@/lib/labels";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "PROJECT_MANAGER" | "TEAM_MEMBER";
}

interface WorkspaceViewProps {
  currentUser: CurrentUser | null;
  initialCounts: {
    users: number;
    projects: number;
    tasks: number;
    comments: number;
  };
  dbStatus?: string;
}

export function WorkspaceView({
  currentUser,
  initialCounts,
  dbStatus = "online",
}: WorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<NavTab>("DASHBOARD");
  const [counts, setCounts] = useState(initialCounts);
  const [projects, setProjects] = useState<
    Array<{ id: string; title: string; startDate: string; targetDate: string }>
  >([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  // Recarregar contagens e lista de projetos sem refrescar a página (Zero Reload)
  const refreshWorkspace = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/projects?limit=50");
      if (res.ok) {
        const data = await res.json();
        const projectsList = data.projects || (Array.isArray(data) ? data : []);
        setProjects(
          projectsList.map((p: any) => ({
            id: p.id,
            title: p.title,
            startDate: p.startDate,
            targetDate: p.targetDate,
          }))
        );

        if (projectsList.length > 0 && !activeProjectId) {
          setActiveProjectId(projectsList[0].id);
        }

        const totalProjects = data.pagination?.total || projectsList.length;
        const totalTasks = projectsList.reduce(
          (acc: number, p: any) => acc + (p.totalTasks || p._count?.tasks || 0),
          0
        );

        setCounts((prev) => ({
          ...prev,
          projects: totalProjects,
          tasks: totalTasks,
        }));
      }
    } catch (err) {
      console.error("Erro ao sincronizar estado do workspace:", err);
    }
  }, [activeProjectId]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  return (
    <div className="min-h-screen bg-navy-50 text-navy-900 flex flex-col">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO E MOCK SWITCHER (Wireframe TopBar) */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        dbStatus={dbStatus}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* AVISO SE NÃO AUTENTICADO */}
        {!currentUser && (
          <div className="p-4 bg-runway-50 border border-runway-200 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-runway-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-navy-900">Modo de Apenas Leitura (Visitante de Voo)</p>
                <p className="text-xs text-navy-600">
                  Inicie sessão na torre para poder criar ou coordenar missões e checklists de acordo com o seu perfil.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 bg-runway-600 hover:bg-runway-700 text-white rounded-lg shadow-xs whitespace-nowrap transition"
            >
              Aceder à Torre
            </Link>
          </div>
        )}

        {/* ECRÃ 1: PAINEL INICIAL (TORRE DE CONTROLO / DASHBOARD) */}
        {activeTab === "DASHBOARD" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy-900">
                {AVIATION_LABELS.nav.dashboard} — Radar de Operações
              </h2>
              <p className="text-xs text-navy-500">
                Visão consolidada em tempo real: percentagem de voo concluído, checklists por estado, velocidade de cruzeiro e turbulências de prazo.
              </p>
            </div>
            <DashboardView
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={setActiveProjectId}
              currentUser={currentUser}
              onNavigateToTasks={(projId) => {
                if (projId) setActiveProjectId(projId);
                setActiveTab("PROJECT_DETAIL");
              }}
              onOpenCreateTask={(projId) => {
                if (projId) setActiveProjectId(projId);
                setActiveTab("PROJECT_DETAIL");
              }}
            />
          </section>
        )}

        {/* ECRÃ 2: GESTÃO DE MISSÕES (PROJETOS) */}
        {activeTab === "PROJECTS" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy-900">
                Esquadrão de {AVIATION_LABELS.nav.projects}
              </h2>
              <p className="text-xs text-navy-500">
                Coordenação de missões ativas, datas de descolagem e objetivos da organização.
              </p>
            </div>
            <ProjectManagement
              currentUser={currentUser}
              onSelectProject={(projId) => {
                setActiveProjectId(projId);
                setActiveTab("PROJECT_DETAIL");
              }}
              onMutation={refreshWorkspace}
            />
          </section>
        )}

        {/* ECRÃ 3: DETALHE DA MISSÃO & ITENS DE VOO (TAREFAS ASSOCIADAS) */}
        {activeTab === "PROJECT_DETAIL" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy-900">
                Detalhe da Missão & {AVIATION_LABELS.nav.tasks}
              </h2>
              <p className="text-xs text-navy-500">
                Itens de voo da missão selecionada: filtros de estado e prioridade, prazos e registo de telemetria.
              </p>
            </div>
            <TaskManagement
              projects={projects}
              activeProjectId={activeProjectId}
              onProjectChange={setActiveProjectId}
              currentUser={currentUser}
              onMutation={refreshWorkspace}
              onBackToProjects={() => setActiveTab("PROJECTS")}
              isDetailView={true}
            />
          </section>
        )}

        {/* ECRÃ 4: QUADRO KANBAN & CHECKLISTS DE VOO (TAREFAS) */}
        {activeTab === "TASKS" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-navy-900">
                {AVIATION_LABELS.nav.tasks} & Hangar
              </h2>
              <p className="text-xs text-navy-500">
                Quadro de fluxo operacional: itens no Hangar, Em Voo e Aterrados com movimentação visual.
              </p>
            </div>
            <TaskManagement
              projects={projects}
              activeProjectId={activeProjectId}
              onProjectChange={setActiveProjectId}
              currentUser={currentUser}
              onMutation={refreshWorkspace}
            />
          </section>
        )}
      </main>

      {/* RODAPÉ DO COCKPIT */}
      <footer className="border-t border-navy-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-navy-400">
          <p>
            <strong>{AVIATION_LABELS.brand.name}</strong> • {AVIATION_LABELS.brand.tagline} • Release Candidate v1.1.0-rc.2
          </p>
        </div>
      </footer>
    </div>
  );
}
