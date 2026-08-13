'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function NovaSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({
      password,
      data: { needs_password_change: false },
    })
    setLoading(false)

    if (error) {
      setError('Não foi possível salvar a senha. Tente novamente.')
      return
    }

    router.push('/')
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
          <h1 className="text-xl font-extrabold text-secondary mb-1 text-center">Defina sua senha</h1>
          <p className="text-sm text-outline text-center mb-8">Escolha uma senha segura para sua conta.</p>

          {sessionReady === null && (
            <div className="flex flex-col items-center gap-3 py-6 text-outline">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Verificando sessão...</p>
            </div>
          )}

          {sessionReady === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-5 text-center">
              <p className="text-sm font-medium text-red-700">Você precisa fazer login primeiro.</p>
              <a href="/auth/login" className="text-sm text-primary underline mt-2 inline-block">Ir para o login</a>
            </div>
          )}

          {sessionReady === true && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Nova senha</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    className="input pr-12"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirmar senha</label>
                <input
                  type={show ? 'text' : 'password'}
                  className="input"
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Salvando...' : 'Salvar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
