// src/app/api/auth/repair-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { prisma } from '../../../../../lib/prisma';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [Repair Session] Восстанавливаем сессию...');
    
    // 1. Проверяем текущий cookie
    const cookieStore = cookies();
    const currentToken = cookieStore.get('session_token')?.value;
    
    console.log('🔧 [Repair Session] Текущий token в cookie:', currentToken ? currentToken.substring(0, 10) + '...' : 'отсутствует');
    
    // 2. Проверяем, есть ли этот токен в БД
    if (currentToken) {
      const existingSession = await prisma.session.findUnique({
        where: { token: currentToken },
        include: { user: true }
      });
      
      console.log('🔧 [Repair Session] Сессия в БД:', existingSession ? 'найдена' : 'НЕ НАЙДЕНА');
      
      if (existingSession && existingSession.expiresAt > new Date()) {
        console.log('✅ [Repair Session] Активная сессия уже есть:', existingSession.user.email);
        return NextResponse.json({
          success: true,
          message: 'Сессия уже активна',
          user: {
            id: existingSession.user.id,
            email: existingSession.user.email,
            name: existingSession.user.name
          }
        });
      }
    }
    
    // 3. Получаем пользователя из Supabase
    const supabase = createClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
    
    console.log('🔧 [Repair Session] Supabase пользователь:', {
      hasUser: !!supabaseUser,
      email: supabaseUser?.email,
      error: error?.message
    });
    
    if (error || !supabaseUser) {
      return NextResponse.json({
        success: false,
        error: 'Нет активной Supabase сессии',
        details: error?.message
      }, { status: 401 });
    }
    
    // 4. Ищем пользователя в нашей БД
    let user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id }
    });
    
    console.log('🔧 [Repair Session] Пользователь в БД:', user ? user.email : 'не найден');
    
    if (!user) {
      // Создаем пользователя если не существует
      user = await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email || `user-${supabaseUser.id}@unknown.com`,
          name: supabaseUser.user_metadata?.name || supabaseUser.email || 'Пользователь',
          role: 'USER',
          isActive: true,
          lastLoginAt: new Date()
        }
      });
      console.log('✅ [Repair Session] Создан новый пользователь:', user.email);
    }
    
    // 5. Удаляем все старые сессии пользователя
    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: user.id }
    });
    console.log(`🧹 [Repair Session] Удалено старых сессий: ${deletedSessions.count}`);
    
    // 6. Создаем новую сессию
    const newToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    const newSession = await prisma.session.create({
      data: {
        userId: user.id,
        token: newToken,
        expiresAt,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });
    
    console.log('✅ [Repair Session] Создана новая сессия:', newToken.substring(0, 10) + '...');
    
    // 7. Обновляем время последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    const response = NextResponse.json({
      success: true,
      message: 'Сессия успешно восстановлена',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      sessionInfo: {
        tokenPreview: newToken.substring(0, 10) + '...',
        expiresAt: expiresAt.toISOString(),
        deletedOldSessions: deletedSessions.count
      }
    });
    
    // 8. Устанавливаем новый cookie
    response.cookies.set('session_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
      sameSite: 'lax'
    });
    
    console.log('✅ [Repair Session] Cookie установлен');
    
    return response;
    
  } catch (error) {
    console.error('❌ [Repair Session] Критическая ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка восстановления сессии',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// Функция генерации токена
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
