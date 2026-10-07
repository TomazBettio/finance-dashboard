import { requireUser } from '@/lib/auth/session'
import { OnboardingForm } from './onboarding-form'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await requireUser()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <OnboardingForm userName={user.name} />
    </main>
  )
}
