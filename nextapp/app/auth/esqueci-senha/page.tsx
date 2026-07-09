'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/nova-senha`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card p-10">
          <div className="flex justify-center mb-8">
            <svg width={56} height={56} viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="36" fill="#424242" />
              <circle cx="36" cy="36" r="30" fill="none" stroke="#64A1EE" strokeWidth="3" />
              <text x="36" y="46" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="26" fill="#64A1EE">MC</text>
            </svg>
          </div>

          {sent ? (
            <div className="text-center">
              <p className="text-xl font-extrabold text-secondary mb-2">E-mail enviado!</p>
              <p className="text-sm text-outline mb-6">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <Link href="/auth/login" className="btn-primary w-full justify-center">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-secondary mb-1 text-center">Redefinir senha</h1>
              <p className="text-sm text-outline text-center mb-8">
                Informe seu e-mail e enviaremos um link de redefinição.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">E-mail</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>
              <p className="text-center text-sm text-outline mt-6">
                <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
