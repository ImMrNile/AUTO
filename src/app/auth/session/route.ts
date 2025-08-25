import { createClient } from './../../../../lib/supabase/server'
import { AuthService } from './../../../../lib/auth/auth-service'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await AuthService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}