"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Plane,
  Compass,
  Radar,
  Wind,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setError("A sua autorização de voo expirou. Por favor efetue novo check-in na torre.");
    }
  }, [searchParams]);

  async function handleLogin(e?: React.FormEvent, customEmail?: string, customPassword?: string) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const submitEmail = customEmail || email;
    const submitPassword = customPassword || password;

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submitEmail, password: submitPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Falha na autenticação. Verifique os dados de acesso.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Sem sinal de radar com o servidor central. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-navy-200 rounded-2xl sm:px-10">
      {error && (
        <div className="mb-5 p-3.5 bg-storm-50 border border-storm-200 rounded-xl flex items-start gap-2.5 text-storm-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-storm-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-navy-800 uppercase tracking-wider mb-1.5">
            Identificador de Voo (Email)
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-navy-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="piloto@matriz.local"
              className="w-full pl-9 pr-3 py-2 text-sm bg-navy-50 border border-navy-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy-800 uppercase tracking-wider mb-1.5">
            Chave de Acesso (Palavra-passe)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-navy-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 text-sm bg-navy-50 border border-navy-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aero-500 focus:bg-white text-navy-900 transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-aero-600 hover:bg-aero-700 rounded-lg shadow-xs transition duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 motion-reduce:transform-none flex items-center justify-center gap-2"
        >
          <Plane className="w-4 h-4 transform -rotate-45" />
          <span>{loading ? "A comunicar com a torre..." : "Entrar no Sistema (Torre de Controlo)"}</span>
        </button>
      </form>

      {/* Atalhos Rápidos para Demonstração de Perfis */}
      <div className="mt-8 pt-6 border-t border-navy-100">
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3 text-center">
          Credenciais Pré-configuradas (Acesso Rápido)
        </p>
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => handleLogin(undefined, "luis.ferreira@matriz.local", "password123")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-navy-800 bg-navy-50 hover:bg-aero-50 hover:text-aero-700 border border-navy-200 rounded-xl transition"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-aero-600" />
              Luís Ferreira
            </span>
            <span className="text-[11px] bg-aero-100 text-aero-800 px-2 py-0.5 rounded-md font-semibold">
              Comandante (Gestor)
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLogin(undefined, "ana.silva@matriz.local", "password123")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-navy-800 bg-navy-50 hover:bg-hud-50 hover:text-hud-700 border border-navy-200 rounded-xl transition"
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-hud-600" />
              Ana Silva
            </span>
            <span className="text-[11px] bg-hud-100 text-hud-800 px-2 py-0.5 rounded-md font-semibold">
              Piloto (Membro)
            </span>
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] text-navy-400">
          Chave padrão de teste: <code className="bg-navy-100 px-1 py-0.5 rounded font-mono text-navy-700">password123</code>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-aero-50 via-navy-50 to-runway-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Painel Hero com Ilustração de Aviação */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-aero-600 to-aero-500 flex items-center justify-center text-white shadow-md shadow-aero-600/20 transform -rotate-3 transition hover:rotate-0">
              <Plane className="w-7 h-7 transform -rotate-45" />
            </div>
            {/* Ícones de Cockpit em Órbita */}
            <div className="absolute -top-1 -right-4 p-1 rounded-full bg-white shadow-xs border border-navy-200 text-aero-600">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="absolute -bottom-1 -left-4 p-1 rounded-full bg-white shadow-xs border border-navy-200 text-hud-600">
              <Radar className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-navy-900">
            Matriz
          </h1>
          <p className="mt-1 text-xs uppercase font-bold tracking-widest text-aero-700">
            Torre de Operações & Gestão de Missões
          </p>

          {/* Faixa / Pista de Sinalização */}
          <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-white/70 border border-navy-200 rounded-full text-[11px] text-navy-600 shadow-2xs">
            <Wind className="w-3.5 h-3.5 text-aero-600" />
            <span>Espaço aéreo aberto para gestão ágil de esquadrões</span>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-navy-400">A sincronizar com a torre...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
