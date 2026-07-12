'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ChevronRight, Loader2, Shield, Clock, UserCog } from 'lucide-react'

const STEPS = [
  { label: 'Dados', icon: '👤' },
  { label: 'Financeiro', icon: '💳' },
  { label: 'Treino', icon: '🏋️' },
  { label: 'Saúde', icon: '❤️' },
  { label: 'Preferências', icon: '⭐' },
]

interface Props {
  academias: { id: string; nome: string }[]
}

export function NovoAlunoForm({ academias }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Step 0: Dados básicos
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    senha: '',
    // Step 1: Financeiro
    plano_contratado: '',
    valor_plano: '',
    data_inicio: '',
    data_renovacao: '',
    horario_contato_preferido: '',
    academia_id: '',
    // Step 2: Treino
    nivel: '',
    autonomia: '',
    horario_treino: '',
    objetivo: '',
    disciplina: '',
    motivacao_principal: '',
    dificuldade_principal: '',
    // Step 3: Saúde
    dores_lesoes: '',
    limitacoes: '',
    exercicios_que_incomodam: '',
    pontos_atencao: '',
    // Step 4: Preferências
    exercicios_preferidos: '',
    exercicios_que_odeia: '',
    perfil_comportamental: [] as string[],
  })

  function set(field: string, value: string | string[]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function togglePerfil(trait: string) {
    setForm(prev => ({
      ...prev,
      perfil_comportamental: prev.perfil_comportamental.includes(trait)
        ? prev.perfil_comportamental.filter(t => t !== trait)
        : [...prev.perfil_comportamental, trait]
    }))
  }

  async function handleSubmit() {
    if (!form.nome || !form.email) { setError('Nome e e-mail são obrigatórios.'); return }
    setLoading(true)
    setError('')

    try {
      const senha = form.senha || Math.random().toString(36).slice(-10) + 'A1!'

      const res = await fetch('/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          form.email,
          senha,
          nome:           form.nome,
          telefone:       form.telefone || null,
          data_nascimento: form.data_nascimento || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar usuário')
      if (!json.usuario) throw new Error('Usuário não retornado')

      const usuarioId = json.usuario.id

      // Cria registro de aluno
      const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .insert({
          usuario_id:                usuarioId,
          academia_id:               form.academia_id || null,
          plano_contratado:          form.plano_contratado || null,
          valor_plano:               form.valor_plano ? parseFloat(form.valor_plano) : null,
          data_inicio:               form.data_inicio || null,
          data_renovacao:            form.data_renovacao || null,
          horario_contato_preferido: form.horario_contato_preferido || null,
          nivel:                     (form.nivel as 'iniciante' | 'intermediario' | 'avancado') || null,
          autonomia:                 form.autonomia || null,
          horario_treino:            form.horario_treino || null,
          objetivo:                  form.objetivo || null,
          disciplina:                form.disciplina || null,
          motivacao_principal:       form.motivacao_principal || null,
          dificuldade_principal:     form.dificuldade_principal || null,
          dores_lesoes:              form.dores_lesoes || null,
          limitacoes:                form.limitacoes || null,
          exercicios_que_incomodam:  form.exercicios_que_incomodam || null,
          exercicios_preferidos:     form.exercicios_preferidos || null,
          exercicios_que_odeia:      form.exercicios_que_odeia || null,
          pontos_atencao:            form.pontos_atencao || null,
          perfil_comportamental:     form.perfil_comportamental.length > 0 ? form.perfil_comportamental : null,
        } as any)
        .select('id')
        .single()

      if (alunoError) throw new Error(alunoError.message)

      // Score inicial (trigger já pode ter criado — upsert para não duplicar)
      await supabase.from('scores').upsert(
        { aluno_id: aluno!.id, pontos_total: 0, xp: 0, nivel: 1, sequencia_atual: 0, sequencia_max: 0, aderencia_mes: 0 } as any,
        { onConflict: 'aluno_id' }
      )

      router.push(`/alunos/${aluno!.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Erro ao cadastrar aluno')
    } finally {
      setLoading(false)
    }
  }

  const traitsComportamentais = [
    'Disciplinado', 'Precisa de incentivo', 'Automotivado', 'Ansioso',
    'Perfeccionista', 'Consistente', 'Irregular', 'Competitivo',
  ]

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all ${
                i === step
                  ? 'bg-primary-dark text-white shadow-button'
                  : i < step
                  ? 'bg-green-500 text-white cursor-pointer'
                  : 'bg-outline-variant text-outline cursor-not-allowed'
              }`}
            >
              {i < step ? <CheckCircle2 size={18} /> : i + 1}
            </button>
            <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-primary-dark' : 'text-outline'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-green-400' : 'bg-outline-variant'}`} />}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 0: Dados básicos */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-extrabold mb-1">Informações Básicas</h2>
            <p className="text-sm text-outline mb-6">Inicie o cadastro com os dados de identificação do aluno.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome Completo</label>
                <input className="input" placeholder="Ex: João da Silva" value={form.nome} onChange={e => set('nome', e.target.value)} required />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" placeholder="joao@exemplo.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="label">Telefone / WhatsApp</label>
                <input className="input" placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
              </div>
              <div>
                <label className="label">Data de Nascimento</label>
                <input className="input" type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
              </div>
              <div>
                <label className="label">Senha inicial</label>
                <input className="input" type="text" placeholder="Senha temporária" value={form.senha} onChange={e => set('senha', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Financeiro */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-extrabold mb-1">Informações Financeiras</h2>
            <p className="text-sm text-outline mb-6">Plano, valores e datas de vigência.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Plano Contratado</label>
                <select className="input" value={form.plano_contratado} onChange={e => set('plano_contratado', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Semi-presencial">Semi-presencial</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Família">Família</option>
                </select>
              </div>
              <div>
                <label className="label">Valor do Plano (R$)</label>
                <input className="input" type="number" placeholder="0.00" value={form.valor_plano} onChange={e => set('valor_plano', e.target.value)} />
              </div>
              <div>
                <label className="label">Data de Início</label>
                <input className="input" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
              </div>
              <div>
                <label className="label">Data de Renovação</label>
                <input className="input" type="date" value={form.data_renovacao} onChange={e => set('data_renovacao', e.target.value)} />
              </div>
              <div>
                <label className="label">Horário de Contato</label>
                <input className="input" placeholder="Ex: manhã, 8h–10h" value={form.horario_contato_preferido} onChange={e => set('horario_contato_preferido', e.target.value)} />
              </div>
              <div>
                <label className="label">Academia</label>
                <select className="input" value={form.academia_id} onChange={e => set('academia_id', e.target.value)}>
                  <option value="">Nenhuma / domiciliar</option>
                  {academias.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Treino */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-extrabold mb-1">Perfil de Treino</h2>
            <p className="text-sm text-outline mb-6">Nível, autonomia e características de treino.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nível</label>
                <select className="input" value={form.nivel} onChange={e => set('nivel', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>
              <div>
                <label className="label">Autonomia</label>
                <select className="input" value={form.autonomia} onChange={e => set('autonomia', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="baixa">Baixa – precisa de acompanhamento</option>
                  <option value="media">Média – alguma experiência</option>
                  <option value="alta">Alta – treina sozinho bem</option>
                </select>
              </div>
              <div>
                <label className="label">Horário de Treino</label>
                <input className="input" placeholder="Ex: manhã, 6h30" value={form.horario_treino} onChange={e => set('horario_treino', e.target.value)} />
              </div>
              <div>
                <label className="label">Frequência / Semana</label>
                <select className="input" value={form.disciplina} onChange={e => set('disciplina', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="2x">2x por semana</option>
                  <option value="3x">3x por semana</option>
                  <option value="4x">4x por semana</option>
                  <option value="5x">5x por semana</option>
                  <option value="6x+">6x ou mais</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Objetivo Principal</label>
                <input className="input" placeholder="Ex: Hipertrofia, emagrecimento, performance..." value={form.objetivo} onChange={e => set('objetivo', e.target.value)} />
              </div>
              <div>
                <label className="label">Motivação Principal</label>
                <input className="input" placeholder="O que te motiva a treinar?" value={form.motivacao_principal} onChange={e => set('motivacao_principal', e.target.value)} />
              </div>
              <div>
                <label className="label">Maior Dificuldade</label>
                <input className="input" placeholder="O que mais atrapalha?" value={form.dificuldade_principal} onChange={e => set('dificuldade_principal', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Saúde */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-extrabold mb-1">Saúde e Limitações</h2>
            <p className="text-sm text-outline mb-6">Dores, lesões e restrições físicas.</p>
            <div className="space-y-4">
              <div>
                <label className="label">Dores e Lesões</label>
                <textarea className="input min-h-[80px]" placeholder="Ex: dor no joelho direito, hérnia L4-L5..." value={form.dores_lesoes} onChange={e => set('dores_lesoes', e.target.value)} />
              </div>
              <div>
                <label className="label">Limitações</label>
                <textarea className="input min-h-[80px]" placeholder="Ex: não consegue fazer agachamento livre, limitação de amplitude..." value={form.limitacoes} onChange={e => set('limitacoes', e.target.value)} />
              </div>
              <div>
                <label className="label">Exercícios que Incomodam</label>
                <input className="input" placeholder="Ex: supino reto, leg press..." value={form.exercicios_que_incomodam} onChange={e => set('exercicios_que_incomodam', e.target.value)} />
              </div>
              <div>
                <label className="label">Pontos de Atenção (uso interno)</label>
                <textarea className="input min-h-[80px]" placeholder="Informações relevantes para o treinador..." value={form.pontos_atencao} onChange={e => set('pontos_atencao', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Preferências */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-extrabold mb-1">Preferências</h2>
            <p className="text-sm text-outline mb-6">Exercícios favoritos, o que odeia e perfil comportamental.</p>
            <div className="space-y-4">
              <div>
                <label className="label">Exercícios Preferidos</label>
                <input className="input" placeholder="Ex: rosca direta, supino inclinado, corrida..." value={form.exercicios_preferidos} onChange={e => set('exercicios_preferidos', e.target.value)} />
              </div>
              <div>
                <label className="label">Exercícios que Odeia</label>
                <input className="input" placeholder="Ex: abdominal sênior, burpee..." value={form.exercicios_que_odeia} onChange={e => set('exercicios_que_odeia', e.target.value)} />
              </div>
              <div>
                <label className="label">Perfil Comportamental</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {traitsComportamentais.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => togglePerfil(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        form.perfil_comportamental.includes(t)
                          ? 'bg-primary-dark text-white border-primary-dark'
                          : 'bg-white border-outline-variant text-secondary hover:border-primary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline-variant">
          <div className="flex items-center gap-4 text-xs text-outline">
            <span className="flex items-center gap-1"><Shield size={12} /> Status: Rascunho</span>
            <span className="flex items-center gap-1"><Clock size={12} /> ~2 min restante</span>
          </div>
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary px-6">
                Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary px-6">
                Próximo Passo <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary px-8">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { icon: '🔒', label: 'STATUS', value: 'Rascunho' },
          { icon: '⏱', label: 'TEMPO ESTIMADO', value: '2 min restante' },
          { icon: '🔐', label: 'ENCRIPTAÇÃO', value: 'Ativa' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-4 text-center shadow-card">
            <p className="text-lg mb-1">{item.icon}</p>
            <p className="text-[10px] font-semibold text-outline uppercase tracking-wider">{item.label}</p>
            <p className="text-xs font-bold text-secondary">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
