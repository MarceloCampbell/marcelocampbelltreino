'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, TrendingUp, Scale, X, ChevronRight } from 'lucide-react'

const TOUR_KEY = 'mc_onboarding_v1'

const steps = [
  {
    icon: Dumbbell,
    color: 'text-primary bg-primary/10',
    title: 'Seu treino, sempre à mão',
    desc: 'Acesse sua rotina de treino a qualquer momento, mesmo sem internet. Tudo organizado do jeito que seu professor montou para você.',
  },
  {
    icon: TrendingUp,
    color: 'text-green-600 bg-green-50',
    title: 'Acompanhe sua evolução',
    desc: 'Veja gráficos da sua carga semana a semana por exercício. Cada treino registrado é um dado a mais na sua jornada.',
  },
  {
    icon: Scale,
    color: 'text-purple-600 bg-purple-50',
    title: 'Registre suas cargas',
    desc: 'Durante o treino, marque cada série e anote a carga usada. Na próxima vez, você verá a última carga registrada para não perder o fio.',
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the page loads first
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const s = steps[step]
  const Icon = s.icon

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5 pb-0">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-8 text-center">
          <div className={`w-20 h-20 rounded-2xl ${s.color} flex items-center justify-center mx-auto mb-6`}>
            <Icon size={36} />
          </div>
          <h2 className="text-xl font-extrabold text-secondary mb-3">{s.title}</h2>
          <p className="text-sm text-outline leading-relaxed">{s.desc}</p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center gap-3">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 rounded-xl text-sm text-outline hover:text-secondary transition-colors font-medium"
          >
            Pular
          </button>
          <button
            onClick={next}
            className="flex-1 py-2.5 rounded-xl btn-primary text-sm justify-center"
          >
            {step < steps.length - 1 ? (
              <>Próximo <ChevronRight size={16} /></>
            ) : (
              'Começar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
