import { createBrowserClient } from '@supabase/ssr'

// Конфигурация с таймаутами
const SUPABASE_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'wb-automation-tool'
    }
  },
  db: {
    schema: 'public'
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_CONFIG
  )
}