"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Gauge,
  Plane,
  ClipboardList,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  ChevronDown,
  Radio,
} from "lucide-react";
import { AVIATION_LABELS } from "@/lib/labels";

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
    { name: "Luís Ferreira", email: "luis.ferreira@matriz.local", role: "Comandante (Gestor de Projeto)" },
    { name: "Ana Silva", email: "ana.silva@matriz.local", role: "Piloto (Membro de Equipa)" },
    { name: "Carlos Ramos", email: "carlos.ramos@matriz.local", role: "Piloto (Membro de Equipa)" },
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
    <header className="bg-white border-b border-navy-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 py-3">
        {/* LOGO E MARCA AERONÁUTICA */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div
            onClick={() => onTabChange("DASHBOARD")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Ícone de Aeronave / Marca */}
            <span className="w-8 h-8 rounded-lg bg-aero-600 group-hover:bg-aero-700 text-white flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none">
              <Plane className="w-4 h-4 transform -rotate-45" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-navy-900 group-hover:text-aero-600 transition">
                  {AVIATION_LABELS.brand.name}
                </h1>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-aero-50 text-aero-700 border border-aero-200">
                  {AVIATION_LABELS.brand.badge}
                </span>
              </div>
              <p className="text-[10px] text-navy-500 hidden sm:block">
                {AVIATION_LABELS.brand.tagline}
              </p>
            </div>
          </div>

          {/* TRANSPONDER STATUS NO MOBILE */}
          <div className="flex md:hidden items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                dbStatus === "online" ? "bg-hud-500" : "bg-storm-500"
              }`}
            />
            <span className="text-[10px] font-bold uppercase text-navy-500">
              {dbStatus === "online" ? "Radar Ativo" : "Offline"}
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ECRÃS (Cockpit & Instrumentos) */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            data-testid="nav-dashboard"
            onClick={() => onTabChange("DASHBOARD")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "DASHBOARD"
                ? "bg-aero-50 text-aero-700 border border-aero-200 shadow-xs"
                : "text-navy-700 hover:text-navy-900 hover:bg-navy-100"
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-aero-600" />
            <span>{AVIATION_LABELS.nav.dashboard}</span>
          </button>

          <button
            data-testid="nav-projects"
            onClick={() => onTabChange("PROJECTS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "PROJECTS"
                ? "bg-aero-50 text-aero-700 border border-aero-200 shadow-xs"
                : "text-navy-700 hover:text-navy-900 hover:bg-navy-100"
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-aero-600" />
            <span>{AVIATION_LABELS.nav.projects}</span>
          </button>

          <button
            data-testid="nav-tasks"
            onClick={() => onTabChange("TASKS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeTab === "TASKS" || activeTab === "PROJECT_DETAIL"
                ? "bg-aero-50 text-aero-700 border border-aero-200 shadow-xs"
                : "text-navy-700 hover:text-navy-900 hover:bg-navy-100"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-aero-600" />
            <span>Tarefas</span>
          </button>
        </nav>

        {/* UTILIZADOR, MOCK SWITCHER & LOGOUT */}
        <div className="flex items-center justify-end gap-2.5">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg text-left transition"
              >
                <div className="w-7 h-7 rounded-full bg-aero-100 text-aero-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-navy-900 leading-tight line-clamp-1">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-navy-500 font-medium leading-tight">
                    {currentUser.role === "PROJECT_MANAGER" ? "Gestor" : "Membro"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-navy-400" />
              </button>

              {/* DROPDOWN DO MOCK SWITCHER */}
              {isSwitcherOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-navy-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-navy-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                      Oficial em Comando
                    </p>
                    <p className="text-xs font-bold text-navy-900">{currentUser.name}</p>
                    <p className="text-[11px] text-navy-500">{currentUser.email}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 ${
                        currentUser.role === "PROJECT_MANAGER"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-aero-100 text-aero-700"
                      }`}
                    >
                      {currentUser.role === "PROJECT_MANAGER" ? (
                        <>
                          <ShieldCheck className="w-3 h-3" /> Comandante (Gestor)
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3 h-3" /> Piloto (Membro)
                        </>
                      )}
                    </span>
                  </div>

                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400 mb-1">
                      Troca de Piloto (Mock Switcher)
                    </p>
                    <div className="space-y-1">
                      {demoAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          disabled={switching || acc.email === currentUser.email}
                          onClick={() => handleQuickSwitch(acc.email)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                            acc.email === currentUser.email
                              ? "bg-navy-100 text-navy-400 cursor-default"
                              : "hover:bg-aero-50 hover:text-aero-700 text-navy-800"
                          }`}
                        >
                          <span className="font-medium truncate">{acc.name}</span>
                          <span className="text-[10px] text-navy-400">{acc.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-navy-100 mt-1 pt-1 px-2">
                    <form action="/api/v1/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-1.5 text-xs text-storm-600 hover:bg-storm-50 rounded-lg font-medium flex items-center gap-1.5 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Abandonar Torre (Logout)</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-aero-600 text-white hover:bg-aero-700 rounded-lg shadow-xs transition"
            >
              <LogIn className="w-3.5 h-3.5" /> Entrar na Torre
            </Link>
          )}

          {/* TRANSPONDER STATUS NO DESKTOP */}
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-navy-200">
            <Radio className={`w-3.5 h-3.5 ${dbStatus === "online" ? "text-hud-600 animate-pulse" : "text-storm-600"}`} />
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                dbStatus === "online" ? "bg-hud-500" : "bg-storm-500"
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-600">
              {dbStatus === "online" ? "Transponder Ativo" : "Radar Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
