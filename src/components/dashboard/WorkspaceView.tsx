"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar, NavTab } from "@/components/layout/TopBar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { ProjectManagement } from "@/components/projects/ProjectManagement";
import { TaskManagement } from "@/components/tasks/TaskManagement";
import { Lock } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
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
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Modo de Apenas Leitura</p>
                <p className="text-xs text-amber-700">
                  Inicie sessão para poder criar ou editar projetos e tarefas de acordo com o seu perfil.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm whitespace-nowrap transition"
            >
              Aceder ao Login
            </Link>
          </div>
        )}

        {/* ECRÃ 1: PAINEL INICIAL (DASHBOARD) */}
        {activeTab === "DASHBOARD" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Painel Analítico de Acompanhamento
              </h2>
              <p className="text-xs text-slate-500">
                Visão consolidada em tempo real: percentagem de conclusão, contagens por estado, velocidade semanal e alertas de atraso.
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

        {/* ECRÃ 2: PROJETOS (LISTAGEM, PESQUISA, CRIAÇÃO, EDIÇÃO E ELIMINAÇÃO) */}
        {activeTab === "PROJECTS" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Gestão de Projetos
              </h2>
              <p className="text-xs text-slate-500">
                Carteira de projetos da organização: pesquisa por nome, ciclo de vida e eliminação em cascata sem dados órfãos.
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

        {/* ECRÃ 3: DETALHE DO PROJETO & TAREFAS ASSOCIADAS */}
        {activeTab === "PROJECT_DETAIL" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Detalhe do Projeto & Tarefas
              </h2>
              <p className="text-xs text-slate-500">
                Tarefas de trabalho do projeto selecionado: filtros de estado e prioridade, prazos e registo de atividades.
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

        {/* ECRÃ 4: TODAS AS TAREFAS */}
        {activeTab === "TASKS" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Gestão Global de Tarefas
              </h2>
              <p className="text-xs text-slate-500">
                Navegue pelas tarefas de qualquer projeto, filtre por estado ou prioridade e atribua colaboradores.
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

      {/* RODAPÉ DISCRETO */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>
            <strong>Matriz</strong> — Plataforma de Gestão de Projetos e Acompanhamento de Equipas (PoC MVP).
          </p>
          <p>
            Desenvolvido com Abordagem Agêntica (Agentic Approach).
          </p>
        </div>
      </footer>
    </div>
  );
}
