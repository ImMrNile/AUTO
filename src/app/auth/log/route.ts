import { NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/auth/auth-service'
import { createServerSupabaseClient } from '../../../../lib/supabase/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { action, email, entityType, entityId, details } = data
    
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    await AuthService.logAction(
      user?.id || null,
      action,
      entityType || 'auth',
      entityId,
      { email, ...details },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}