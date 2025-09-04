// src/app/api/auth/convert-supabase-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Convert Session] Конвертируем Supabase сессию в локальную');
    
    // Проверяем подключение к БД с улучшенной диагностикой
    try {
      await prisma.$connect();
      console.log('✅ [Convert Session] Подключение к БД успешно');
    } catch (dbError: any) {
      console.error('❌ [Convert Session] Ошибка подключения к БД:', dbError);
      
      // Детальная диагностика ошибки БД
      if (dbError.code === 'P1001') {
        console.error('🚨 [Convert Session] Не удается подключиться к серверу PostgreSQL');
      } else if (dbError.code === 'P1017') {
        console.error('🚨 [Convert Session] Сервер отклонил подключение');
      }
      
      return NextResponse.json({
        success: false,
        error: 'Ошибка подключения к базе данных',
        details: dbError.message,
        code: dbError.code
      }, { status: 500 });
    }
    
    // Получаем Supabase пользователя
    const supabase = createClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
    
    console.log('🔍 [Convert Session] Supabase пользователь:', {
      hasUser: !!supabaseUser,
      userId: supabaseUser?.id,
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
    
    // Ищем или создаем пользователя в нашей БД
    console.log('🔍 [Convert Session] Поиск пользователя в БД...');
    
    let user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id }
    });
    
    if (!user) {
      console.log('🔄 [Convert Session] Создаем нового пользователя...');
      
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
      
      console.log('✅ [Convert Session] Пользователь создан:', user.email);
    } else {
      console.log('✅ [Convert Session] Пользователь найден:', user.email);
      
      // Обновляем время последнего входа
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    }
    
    // Удаляем старые сессии этого пользователя
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });
    
    // Создаем новую сессию
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });
    
    console.log('✅ [Convert Session] Локальная сессия создана:', token.substring(0, 10) + '...');
    
    const response = NextResponse.json({
      success: true,
      message: 'Сессия успешно конвертирована',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
    // Устанавливаем cookie с нашей сессией
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
      sameSite: 'lax'
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ [Convert Session] Критическая ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка конвертации сессии',
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