// src/app/api/init/route.ts - Инициализация фоновых задач при старте сервера
import { NextResponse } from 'next/server';
import { initBackgroundTasks } from '../../../../lib/startup/initBackgroundTasks';
import { prisma } from '../../../../lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

let isInitialized = false;

export async function GET() {
  if (isInitialized) {
    return NextResponse.json({ 
      status: 'already_initialized',
      message: 'Background task processor already initialized'
    });
  }

  try {
    console.log('🚀 [Init API] Запуск инициализации фоновых задач...');
    
    // Ждем подключения Prisma
    await prisma.$connect();
    console.log('✅ [Init API] Prisma подключен');
    
    // Запускаем инициализацию фоновых задач
    await initBackgroundTasks();
    
    isInitialized = true;
    
    return NextResponse.json({ 
      status: 'initialized',
      message: 'Background task processor initialized successfully'
    });
  } catch (error) {
    console.error('❌ [Init API] Ошибка инициализации фоновых задач:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
