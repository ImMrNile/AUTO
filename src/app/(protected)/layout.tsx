import { createClient } from './../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthService } from './../../../lib/auth/auth-service'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const currentUser = await AuthService.getCurrentUser()

  if (!currentUser || !currentUser.isActive) {
    redirect('/auth/login')
  }

  // УБРАЛИ проверку кабинетов из layout - она теперь на клиенте в page.tsx

  return (
    <>
      {children}
    </>
  )
}