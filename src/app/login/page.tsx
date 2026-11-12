"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, AlertCircle, ShieldCheck, UserCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setError("A sua sessão expirou ou deixou de ser válida. Por favor autentique-se novamente.");
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
        setError(data.message || "Falha na autenticação. Verifique os seus dados.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Não foi possível estabelecer ligação ao servidor. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@matriz.local"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Palavra-passe
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {loading ? "A autenticar..." : "Entrar no Sistema"}
        </button>
      </form>

      {/* Atalhos Rápidos para Demonstração de Perfis */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 text-center">
          Acesso Rápido de Demonstração (PoC)
        </p>
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => handleLogin(undefined, "luis.ferreira@matriz.local", "password123")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Luís Ferreira
            </span>
            <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
              Gestor de Projeto
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLogin(undefined, "ana.silva@matriz.local", "password123")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Ana Silva
            </span>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
              Membro de Equipa
            </span>
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Palavra-passe padrão: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">password123</code>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Matriz</h1>
        </div>
        <h2 className="mt-4 text-center text-lg font-medium text-slate-600">
          Início de Sessão & Controlo de Acessos
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-slate-400">A carregar formulário...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

