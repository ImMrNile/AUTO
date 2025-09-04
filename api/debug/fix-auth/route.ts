// Диагностика и исправление проблем с аутентификацией

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [Fix Auth] === НАЧАЛО FIX AUTH ===');
    
    // Проверяем подключение к БД
    console.log('🔧 [Fix Auth] Проверяем подключение к БД...');
    try {
      // Сначала подключаемся
      await prisma.$connect();
      console.log('✅ [Fix Auth] Prisma connected successfully');
      
      // Затем тестируем запрос
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ [Fix Auth] Подключение к БД успешно');
    } catch (dbError) {
      console.error('❌ [Fix Auth] Ошибка подключения к БД:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Ошибка подключения к базе данных',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    const cookieStore = cookies();
    const currentToken = cookieStore.get('session_token')?.value;
    
    console.log('🔧 [Fix Auth] Текущий токен сессии:', currentToken ? `${currentToken.substring(0, 10)}...` : 'отсутствует');
    
    // Получаем информацию о текущих сессиях
    const allSessions = await prisma.session.findMany({
      select: { 
        id: true, 
        token: true, 
        userId: true, 
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('🔧 [Fix Auth] Найдено сессий в БД:', allSessions.length);
    
    // Ищем пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 5
    });
    
    console.log('🔧 [Fix Auth] Найдено пользователей в БД:', allUsers.length);
    
    // Проверяем, есть ли текущая сессия в БД
    let currentSession = null;
    if (currentToken) {
      currentSession = await prisma.session.findUnique({
        where: { token: currentToken },
        include: { user: true }
      });
      console.log('🔧 [Fix Auth] Текущая сессия в БД:', currentSession ? 'найдена' : 'не найдена');
    }
    
    // Берем первого активного пользователя для восстановления сессии
    const activeUser = allUsers.find(user => user.isActive);
    console.log('🔧 [Fix Auth] Активный пользователь для восстановления:', activeUser?.email);
    
    if (!activeUser) {
      return NextResponse.json({
        success: false,
        error: 'Нет активных пользователей в системе',
        diagnostics: {
          totalUsers: allUsers.length,
          totalSessions: allSessions.length,
          currentToken: currentToken ? `${currentToken.substring(0, 10)}...` : null,
          currentSessionExists: !!currentSession
        }
      }, { status: 404 });
    }
    
    // Создаем новую сессию для активного пользователя
    console.log('🔧 [Fix Auth] Создаем новую сессию для пользователя:', activeUser.email);
    
    // Удаляем старые сессии пользователя
    await prisma.session.deleteMany({
      where: { userId: activeUser.id }
    });
    
    const newToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    const newSession = await prisma.session.create({
      data: {
        userId: activeUser.id,
        token: newToken,
        expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || 'fix-auth',
        userAgent: request.headers.get('user-agent') || 'auth-fix-tool'
      }
    });
    
    console.log('✅ [Fix Auth] Новая сессия создана:', newToken.substring(0, 10) + '...');
    
    // Обновляем время последнего входа
    await prisma.user.update({
      where: { id: activeUser.id },
      data: { lastLoginAt: new Date() }
    });
    
    const response = NextResponse.json({
      success: true,
      message: 'Аутентификация исправлена',
      user: {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        role: activeUser.role
      },
      diagnostics: {
        totalUsers: allUsers.length,
        totalSessions: allSessions.length,
        oldToken: currentToken ? `${currentToken.substring(0, 10)}...` : null,
        newToken: `${newToken.substring(0, 10)}...`,
        currentSessionExists: !!currentSession,
        deletedOldSessions: true
      }
    });
    
    // Устанавливаем новый cookie
    response.cookies.set('session_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
      sameSite: 'lax'
    });
    
    console.log('✅ [Fix Auth] Cookie установлен, аутентификация восстановлена');
    
    return response;
    
  } catch (error) {
    console.error('❌ [Fix Auth] Критическая ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при исправлении аутентификации',
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

export async function GET() {
  try {
    console.log('🔧 [Fix Auth] === ДИАГНОСТИКА AUTH ===');
    
    const cookieStore = cookies();
    const currentToken = cookieStore.get('session_token')?.value;
    
    // Проверяем подключение к БД
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Получаем информацию о текущих сессиях
    const allSessions = await prisma.session.findMany({
      select: { 
        id: true, 
        token: true, 
        userId: true, 
        expiresAt: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Ищем пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 5
    });
    
    // Проверяем текущую сессию
    let currentSession = null;
    if (currentToken) {
      currentSession = await prisma.session.findUnique({
        where: { token: currentToken },
        include: { user: true }
      });
    }
    
    return NextResponse.json({
      success: true,
      diagnostics: {
        databaseConnected: true,
        currentToken: currentToken ? `${currentToken.substring(0, 10)}...` : null,
        currentSessionExists: !!currentSession,
        currentSessionExpired: currentSession ? currentSession.expiresAt < new Date() : null,
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.isActive).length,
        totalSessions: allSessions.length,
        activeSessions: allSessions.filter(s => s.expiresAt > new Date()).length,
        users: allUsers.map(u => ({
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt
        })),
        sessions: allSessions.map(s => ({
          tokenPreview: `${s.token.substring(0, 10)}...`,
          userEmail: s.user.email,
          expiresAt: s.expiresAt,
          isExpired: s.expiresAt < new Date(),
          createdAt: s.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ [Fix Auth] Ошибка диагностики:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка диагностики аутентификации',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
