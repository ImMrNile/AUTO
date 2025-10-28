// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AuthService } from '../../../../../lib/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 [Logout API] Запрос на выход из системы');
    
    // Выход из Supabase (новая система)
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('⚠️ [Logout API] Ошибка выхода из Supabase:', error);
      } else {
        console.log('✅ [Logout API] Выход из Supabase успешен');
      }
    } catch (supabaseError) {
      console.warn('⚠️ [Logout API] Ошибка Supabase logout:', supabaseError);
    }
    
    // Выход из старой системы (для обратной совместимости)
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (sessionToken) {
      console.log('🚪 [Logout API] Удаляем старую сессию из БД');
      try {
        await AuthService.destroySession(sessionToken);
      } catch (destroyError) {
        console.warn('⚠️ [Logout API] Ошибка при удалении сессии, но продолжаем:', destroyError);
      }
    }
    
    const response = NextResponse.json({
      success: true,
      message: 'Вы успешно вышли из системы'
    });
    
    // Удаляем cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/'
    });
    
    console.log('✅ [Logout API] Logout завершен');
    return response;
    
  } catch (error) {
    console.error('❌ [Logout API] Ошибка logout:', error);
    
    // Даже при ошибке возвращаем успех и очищаем cookie
    const response = NextResponse.json({
      success: true,
      message: 'Вы вышли из системы'
    });
    
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/'
    });
    
    return response;
  }
}