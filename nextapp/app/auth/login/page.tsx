'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage({ searchParams }: { searchParams: { error?: string; reset?: string } }) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const hasError = searchParams?.error === 'credenciais'
  const resetOk = searchParams?.reset === 'ok'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card p-10">
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center gap-3">
              <svg width={72} height={72} viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="36" fill="#424242" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="#64A1EE" strokeWidth="3" />
                <text x="36" y="46" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="26" fill="#64A1EE">MC</text>
              </svg>
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-secondary">Campbell Team</h1>
                <p className="text-xs font-medium text-primary uppercase tracking-widest mt-0.5">Consultoria Fitness</p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-outline mb-8">Acesse sua conta para continuar</p>

          <form
            method="POST"
            action="/api/auth/login"
            onSubmit={() => setLoading(true)}
            className="space-y-5"
          >
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                name="email"
                className="input"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-secondary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {hasError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                E-mail ou senha incorretos. Verifique seus dados.
              </div>
            )}
            {resetOk && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                Senha redefinida com sucesso. Faça login.
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <p className="text-center text-sm text-outline">
              <Link href="/auth/esqueci-senha" className="text-primary font-semibold hover:underline">
                Esqueci minha senha
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-outline mt-6">
          © {new Date().getFullYear()} Campbell Consultoria Fitness
        </p>
      </div>
    </div>
  )
}
