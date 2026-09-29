'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Music2, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Senha incorreta. Tente novamente.');
      }

      // Successful login
      router.push(from);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Card */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-8 transition-all">
        {/* Header Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
            <Music2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Repertório Católico</h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Acesso Restrito ao Painel Admin
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold block">Erro de autenticação</span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Senha de Administrador
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                required
                autoFocus
                className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Verificando credenciais...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>Entrar no Painel</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500/80" />
            Sistema de Gestão de Músicas e Celebrações
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse text-center text-slate-400">
            Carregando tela de acesso...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
