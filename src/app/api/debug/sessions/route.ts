// src/app/api/debug/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Session Debug] Отладка сессий...');
    
    // 1. Проверяем cookie
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    // 2. Получаем все сессии из БД
    const allSessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Последние 20 сессий
    });
    
    // 3. Получаем всех пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        supabaseId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 10 // Последние 10 пользователей
    });
    
    // 4. Статистика
    const now = new Date();
    const activeSessions = allSessions.filter(s => s.expiresAt > now);
    const expiredSessions = allSessions.filter(s => s.expiresAt <= now);
    const currentUserSession = sessionToken ? allSessions.find(s => s.token === sessionToken) : null;
    
    console.log('🔍 [Session Debug] Статистика:', {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: expiredSessions.length,
      currentSessionFound: !!currentUserSession
    });
    
    return NextResponse.json({
      success: true,
      debug: {
        currentCookie: {
          hasToken: !!sessionToken,
          tokenPreview: sessionToken ? sessionToken.substring(0, 10) + '...' : null,
          isFoundInDB: !!currentUserSession,
          sessionStatus: currentUserSession 
            ? (currentUserSession.expiresAt > now ? 'ACTIVE' : 'EXPIRED')
            : 'NOT_FOUND'
        },
        statistics: {
          totalSessions: allSessions.length,
          activeSessions: activeSessions.length,
          expiredSessions: expiredSessions.length,
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter(u => u.isActive).length
        },
        recentSessions: allSessions.map(s => ({
          id: s.id,
          tokenPreview: s.token.substring(0, 10) + '...',
          userId: s.userId,
          userEmail: s.user.email,
          isActive: s.expiresAt > now,
          expiresAt: s.expiresAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
          ipAddress: s.ipAddress,
          isCurrent: s.token === sessionToken
        })),
        users: allUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          supabaseId: u.supabaseId,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt?.toISOString(),
          createdAt: u.createdAt.toISOString(),
          hasActiveSessions: activeSessions.some(s => s.userId === u.id)
        }))
      },
      recommendations: !currentUserSession ? [
        'Текущая сессия не найдена в БД',
        'Выполните POST /api/auth/repair-session для восстановления',
        'Или войдите заново через Telegram'
      ] : currentUserSession.expiresAt <= now ? [
        'Текущая сессия истекла',
        'Выполните POST /api/auth/repair-session для обновления'
      ] : []
    });
    
  } catch (error) {
    console.error('❌ [Session Debug] Ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка отладки сессий',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}