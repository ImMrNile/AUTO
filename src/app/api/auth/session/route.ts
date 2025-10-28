import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 [API Session] === НАЧАЛО GET /api/auth/session ===');
    
    // ВАРИАНТ 1: Проверяем Supabase Auth (новая система)
    const supabase = createClient();
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser();
    
    console.log('🔐 [API Session] Supabase user:', supabaseUser ? supabaseUser.email : 'не найден');
    
    if (supabaseUser && !supabaseError) {
      console.log('✅ [API Session] Найдена сессия Supabase, ищем пользователя в БД...');
      console.log('🔍 [API Session] Supabase User ID:', supabaseUser.id);
      
      // Ищем пользователя по supabaseId
      let user = await prisma.user.findFirst({
        where: { supabaseId: supabaseUser.id }
      });
      
      console.log('🔍 [API Session] Результат поиска в БД:', user ? `Найден: ${user.email}` : 'НЕ НАЙДЕН');
      
      // Если пользователя нет - создаем автоматически
      if (!user) {
        console.log('👤 [API Session] Создаем пользователя автоматически...');
        try {
          user = await prisma.user.create({
            data: {
              supabaseId: supabaseUser.id,
              email: supabaseUser.email || '',
              name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Пользователь',
              role: 'USER',
              isActive: true,
              emailVerified: new Date(),
              balance: 0
            }
          });
          console.log('✅ [API Session] Пользователь создан автоматически:', user.email);
        } catch (createError) {
          console.error('❌ [API Session] Ошибка создания пользователя:', createError);
        }
      }
      
      if (user && user.isActive) {
        console.log('✅ [API Session] Пользователь найден через Supabase:', user.email);
        
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          avatarUrl: user.avatarUrl || undefined,
          role: user.role,
          isActive: user.isActive
        };
        
        return NextResponse.json({
          success: true,
          user: userData,
          message: 'Сессия активна (Supabase)'
        });
      }
    }
    
    console.log('🔐 [API Session] Supabase сессия не найдена, проверяем старую систему...');
    
    // ВАРИАНТ 2: Проверяем старую систему с session_token (для обратной совместимости)
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    console.log('🔐 [API Session] Session token:', sessionToken ? `${sessionToken.substring(0, 10)}...` : 'не найден');
    
    if (!sessionToken) {
      console.log('🔐 [API Session] Ни одна сессия не найдена');
      return NextResponse.json({
        success: false,
        user: null,
        message: 'Сессия не найдена'
      });
    }
    
    console.log('🔐 [API Session] Токен сессии найден, проверяем в БД...');
    
    // ОПТИМИЗАЦИЯ: Убрали проверку подключения - она блокирует пул соединений
    // Если Prisma работает, значит подключение есть
    
    // Ищем сессию в базе данных
    console.log('🔐 [API Session] Поиск сессии в БД с токеном:', sessionToken.substring(0, 10) + '...');
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true }
    });
    
    console.log('🔐 [API Session] Результат поиска сессии:', session ? { 
      sessionId: session.id, 
      userId: session.userId, 
      expiresAt: session.expiresAt,
      userEmail: session.user.email,
      userActive: session.user.isActive
    } : 'не найдена');
    
    if (!session) {
      console.log('🔐 [API Session] Сессия не найдена в БД');
      
      // 🆕 Проверим, есть ли вообще сессии в БД
      const allSessions = await prisma.session.findMany({
        select: { id: true, token: true, userId: true, expiresAt: true }
      });
      console.log('🔐 [API Session] Всего сессий в БД:', allSessions.length);
      if (allSessions.length > 0) {
        console.log('🔐 [API Session] Примеры сессий:', allSessions.slice(0, 3).map(s => ({
          id: s.id,
          tokenStart: s.token.substring(0, 10) + '...',
          userId: s.userId,
          expiresAt: s.expiresAt
        })));
      }
      
      return NextResponse.json({
        success: false,
        user: null,
        message: 'Сессия не найдена в базе данных'
      });
    }
    
    // Проверяем, не истекла ли сессия
    const now = new Date();
    console.log('🔐 [API Session] Проверка срока действия сессии:', {
      now: now.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isExpired: session.expiresAt < now
    });
    
    if (session.expiresAt < now) {
      console.log('🔐 [API Session] Сессия истекла');
      
      // Удаляем истекшую сессию
      await prisma.session.delete({
        where: { id: session.id }
      });
      
      return NextResponse.json({
        success: false,
        user: null,
        message: 'Сессия истекла'
      });
    }
    
    // Проверяем, активен ли пользователь
    if (!session.user.isActive) {
      console.log('🔐 [API Session] Пользователь неактивен');
      return NextResponse.json({
        success: false,
        user: null,
        message: 'Пользователь неактивен'
      });
    }
    
    console.log('✅ [API Session] Сессия валидна для пользователя:', session.user.email);
    
    const userData = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined,
      avatarUrl: session.user.avatarUrl || undefined,
      role: session.user.role,
      isActive: session.user.isActive
    };
    
    console.log('🔐 [API Session] Отправляем данные пользователя:', userData);
    
    return NextResponse.json({
      success: true,
      user: userData,
      message: 'Сессия активна'
    });
    
  } catch (error) {
    console.error('❌ [API Session] Критическая ошибка:', error);
    console.error('❌ [API Session] Stack trace:', error instanceof Error ? error.stack : 'Нет stack trace');
    
    return NextResponse.json({
      success: false,
      user: null,
      error: 'Ошибка сервера при проверке сессии',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
