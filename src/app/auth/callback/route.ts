// src/app/auth/callback/route.ts - Роут для подтверждения email и аутентификации

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Если есть ошибка от Supabase
  if (error) {
    console.error('❌ [Callback] Ошибка от Supabase:', error, error_description)
    return NextResponse.redirect(`${origin}/auth/login?error=${error_description || 'Ошибка подтверждения'}`)
  }

  if (code) {
    const supabase = createClient()
    
    // Обмениваем код на сессию
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('❌ [Callback] Ошибка обмена кода:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/login?error=Не удалось подтвердить email`)
    }

    if (data?.user) {
      console.log('✅ [Callback] Email подтвержден для пользователя:', data.user.email)
      
      try {
        // Проверяем существует ли пользователь в нашей БД
        let user = await prisma.user.findFirst({
          where: { supabaseId: data.user.id }
        })

        // Если пользователя нет - создаем
        if (!user) {
          console.log('👤 [Callback] Создание пользователя в БД...')
          user = await prisma.user.create({
            data: {
              supabaseId: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Пользователь',
              role: 'USER',
              isActive: true,
              emailVerified: new Date(),
              balance: 0
            }
          })
          console.log('✅ [Callback] Пользователь создан:', user.id)
        }

        // Проверяем есть ли кабинеты
        const cabinets = await prisma.cabinet.findMany({
          where: { userId: user.id },
          take: 1
        })

        // Если нет кабинетов - редирект на онбординг
        if (cabinets.length === 0) {
          console.log('📋 [Callback] Нет кабинетов, редирект на онбординг')
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        // Если есть кабинеты - редирект на главную
        console.log('🏠 [Callback] Редирект на главную страницу')
        return NextResponse.redirect(`${origin}/`)
        
      } catch (dbError) {
        console.error('⚠️ [Callback] Ошибка работы с БД:', dbError)
        // Если ошибка БД - все равно редирект на онбординг
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  // Если нет кода - редирект на логин
  return NextResponse.redirect(`${origin}/auth/login?error=Не удалось подтвердить email`)
}