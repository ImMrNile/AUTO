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

  return (
    <div>
      <nav style={{
        background: '#0f172a',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>WB Automation</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span>{currentUser.email}</span>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: '1px solid white',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Выход
            </button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  )
}