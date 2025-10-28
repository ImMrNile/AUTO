import { NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth/auth-service'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { action, email, entityType, entityId, details } = data
    
    // Логирование действий
    console.log('📝 Action logged:', {
      action,
      entityType: entityType || 'auth',
      entityId,
      email,
      details
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}