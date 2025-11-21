// API для управления API ключами пользователя

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - получить все API ключи пользователя
export async function GET() {
  try {
    console.log('🔑 [API Keys] === НАЧАЛО GET /api/account/api-keys ===');
    
    // Подключаемся к БД
    await prisma.$connect();
    
    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Получаем API ключи пользователя
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true
      }
    });

    console.log('✅ [API Keys] Найдено ключей:', apiKeys.length);

    return NextResponse.json({
      success: true,
      apiKeys: apiKeys.map(key => ({
        ...key,
        key: maskApiKey(key.key) // Маскируем ключ для безопасности
      }))
    });

  } catch (error) {
    console.error('❌ [API Keys] Ошибка при получении API ключей:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении API ключей',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// POST - создать новый API ключ
export async function POST(request: NextRequest) {
  try {
    console.log('🔑 [API Keys] === НАЧАЛО POST /api/account/api-keys ===');
    
    // Подключаемся к БД
    await prisma.$connect();
    
    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Название API ключа обязательно'
      }, { status: 400 });
    }

    // Проверяем количество существующих ключей (лимит)
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId: user.id }
    });

    if (existingKeysCount >= 10) {
      return NextResponse.json({
        success: false,
        error: 'Достигнут максимальный лимит API ключей (10)'
      }, { status: 400 });
    }

    // Проверяем уникальность названия
    const existingKey = await prisma.apiKey.findFirst({
      where: { 
        userId: user.id,
        name: name.trim()
      }
    });

    if (existingKey) {
      return NextResponse.json({
        success: false,
        error: 'API ключ с таким названием уже существует'
      }, { status: 400 });
    }

    // Генерируем новый API ключ
    const apiKey = generateApiKey();

    // Создаем новый API ключ в БД
    const newApiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim(),
        key: apiKey,
        isActive: true,
        permissions: {}
      }
    });

    console.log('✅ [API Keys] Новый API ключ создан:', {
      id: newApiKey.id,
      name: newApiKey.name,
      userId: newApiKey.userId
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        key: apiKey, // Показываем полный ключ только при создании
        isActive: newApiKey.isActive,
        createdAt: newApiKey.createdAt
      },
      message: 'API ключ успешно создан. Сохраните его в безопасном месте - он больше не будет показан полностью.'
    });

  } catch (error) {
    console.error('❌ [API Keys] Ошибка при создании API ключа:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании API ключа',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// DELETE - удалить API ключ
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔑 [API Keys] === НАЧАЛО DELETE /api/account/api-keys ===');
    
    // Подключаемся к БД
    await prisma.$connect();
    
    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({
        success: false,
        error: 'ID API ключа обязателен'
      }, { status: 400 });
    }

    // Проверяем, что ключ принадлежит пользователю
    const apiKey = await prisma.apiKey.findFirst({
      where: { 
        id: keyId,
        userId: user.id
      }
    });

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API ключ не найден'
      }, { status: 404 });
    }

    // Удаляем API ключ
    await prisma.apiKey.delete({
      where: { id: keyId }
    });

    console.log('✅ [API Keys] API ключ удален:', {
      id: apiKey.id,
      name: apiKey.name
    });

    return NextResponse.json({
      success: true,
      message: 'API ключ успешно удален'
    });

  } catch (error) {
    console.error('❌ [API Keys] Ошибка при удалении API ключа:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении API ключа',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// Функция генерации API ключа
function generateApiKey(): string {
  const prefix = 'wb_';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = prefix;
  
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return key;
}

// Функция маскировки API ключа
function maskApiKey(key: string): string {
  if (!key) return '***';
  if (key.length <= 8) return '*'.repeat(key.length);
  
  const prefix = key.startsWith('wb_') ? 'wb_' : key.substring(0, 3);
  const suffix = key.substring(key.length - 4);
  const middle = '*'.repeat(Math.max(key.length - prefix.length - 4, 8));
  
  return prefix + middle + suffix;
}
