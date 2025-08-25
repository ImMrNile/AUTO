// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '../../../../../lib/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 [Logout API] Запрос на выход из системы');
    
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (sessionToken) {
      console.log('🚪 [Logout API] Удаляем сессию из БД');
      await AuthService.destroySession(sessionToken);
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
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при выходе из системы'
    }, { status: 500 });
  }
}