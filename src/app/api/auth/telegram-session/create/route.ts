import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Создание новой Telegram сессии для QR-кода
 */
export async function POST(request: NextRequest) {
  try {
    // Генерируем уникальный session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Сессия действительна 5 минут
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Создаем запись в БД
    await prisma.telegramSession.create({
      data: {
        sessionId,
        expiresAt,
        authenticated: false
      }
    });

    console.log(`✅ [Telegram Session] Создана новая сессия: ${sessionId}`);

    return NextResponse.json({
      sessionId,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('❌ [Telegram Session] Ошибка создания сессии:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
