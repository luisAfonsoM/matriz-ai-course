"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderGit2,
  ListTodo,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  ChevronDown,
} from "lucide-react";

export type NavTab = "DASHBOARD" | "PROJECTS" | "TASKS" | "PROJECT_DETAIL";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "PROJECT_MANAGER" | "TEAM_MEMBER";
}

interface TopBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: CurrentUser | null;
  onSwitchUser?: (email: string) => Promise<void>;
  dbStatus?: string;
}

export function TopBar({
  activeTab,
  onTabChange,
  currentUser,
  onSwitchUser,
  dbStatus = "online",
}: TopBarProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const demoAccounts = [
    { name: "Luís Ferreira", email: "luis.ferreira@matriz.local", role: "Gestor de Projeto" },
    { name: "Ana Silva", email: "ana.silva@matriz.local", role: "Membro de Equipa" },
    { name: "Carlos Ramos", email: "carlos.ramos@matriz.local", role: "Membro de Equipa" },
  ];

  async function handleQuickSwitch(email: string) {
    if (onSwitchUser) {
      setSwitching(true);
      await onSwitchUser(email);
      setSwitching(false);
      setIsSwitcherOpen(false);
    } else {
      // Login via API direto
      setSwitching(true);
      try {
        await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "password123" }),
        });
        window.location.reload();
      } catch (err) {
        console.error("Erro ao alternar utilizador:", err);
      } finally {
        setSwitching(false);
        setIsSwitcherOpen(false);
      }
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 py-3">
        {/* LOGO E BADGE */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div
            onClick={() => onTabChange("DASHBOARD")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600 group-hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center shadow-sm transition">
              M
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                  Matriz
                </h1>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  PoC MVP
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Gestão de Projetos & Acompanhamento de Equipas
              </p>
            </div>
          </div>

          {/* STATUS DB NO MOBILE */}
          <div className="flex md:hidden items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                dbStatus === "online" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="text-[10px] font-bold uppercase text-slate-400">{dbStatus}</span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ECRÃS (Abas Coerentes com o Wireframe) */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => onTabChange("DASHBOARD")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "DASHBOARD"
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Painel Inicial</span>
          </button>

          <button
            onClick={() => onTabChange("PROJECTS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "PROJECTS"
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Projetos</span>
          </button>

          <button
            onClick={() => onTabChange("TASKS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "TASKS" || activeTab === "PROJECT_DETAIL"
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tarefas</span>
          </button>
        </nav>

        {/* UTILIZADOR, MOCK SWITCHER & LOGOUT */}
        <div className="flex items-center justify-end gap-2.5">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    {currentUser.role === "PROJECT_MANAGER" ? "Gestor" : "Membro"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* DROPDOWN DO MOCK SWITCHER */}
              {isSwitcherOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Sessão Ativa
                    </p>
                    <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 ${
                        currentUser.role === "PROJECT_MANAGER"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {currentUser.role === "PROJECT_MANAGER" ? (
                        <>
                          <ShieldCheck className="w-3 h-3" /> Gestor de Projeto
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3" /> Membro de Equipa
                        </>
                      )}
                    </span>
                  </div>

                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Alternar Perfil (Mock Switcher)
                    </p>
                    <div className="space-y-1">
                      {demoAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          disabled={switching || acc.email === currentUser.email}
                          onClick={() => handleQuickSwitch(acc.email)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                            acc.email === currentUser.email
                              ? "bg-slate-100 text-slate-400 cursor-default"
                              : "hover:bg-blue-50 hover:text-blue-700 text-slate-700"
                          }`}
                        >
                          <span className="font-medium truncate">{acc.name}</span>
                          <span className="text-[10px] text-slate-400">{acc.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <form action="/api/v1/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium flex items-center gap-1.5 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Terminar Sessão (Logout)</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" /> Iniciar Sessão
            </Link>
          )}

          {/* STATUS DB NO DESKTOP */}
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                dbStatus === "online" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {dbStatus}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
