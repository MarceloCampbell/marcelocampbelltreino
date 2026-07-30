'use client'

import { SyncProvider } from '@/lib/sync-context'
import { SyncIndicator } from '@/components/shared/SyncIndicator'
import { OnboardingTour } from '@/components/aluno/OnboardingTour'
import { PwaVersionCheck } from '@/components/shared/PwaVersionCheck'
import { ReactNode } from 'react'

export function AlunoClientProviders({ children }: { children: ReactNode }) {
  return (
    <SyncProvider>
      <PwaVersionCheck />
      {children}
      <SyncIndicator />
      <OnboardingTour />
    </SyncProvider>
  )
}
