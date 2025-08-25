// src/app/api/test-db/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    console.log('🧪 [DB Test] Тестирование подключения к базе данных...');
    
    // Проверяем различные варианты подключения
    const results = {
      connectionTest: null as any,
      queryTest: null as any,
      userCount: null as any,
      cabinetCount: null as any,
      sessionCount: null as any,
      error: null as string | null
    };

    try {
      // 1. Тест подключения
      console.log('1️⃣ Тестируем $connect()...');
      await prisma.$connect();
      results.connectionTest = 'SUCCESS';
      console.log('✅ $connect() успешно');
    } catch (error: any) {
      console.error('❌ $connect() ошибка:', error);
      results.connectionTest = 'FAILED: ' + error.message;
      results.error = error.message;
    }

    try {
      // 2. Тест простого запроса
      console.log('2️⃣ Тестируем $queryRaw...');
      await prisma.$queryRaw`SELECT 1 as test`;
      results.queryTest = 'SUCCESS';
      console.log('✅ $queryRaw успешно');
    } catch (error: any) {
      console.error('❌ $queryRaw ошибка:', error);
      results.queryTest = 'FAILED: ' + error.message;
      if (!results.error) results.error = error.message;
    }

    try {
      // 3. Тест подсчета пользователей
      console.log('3️⃣ Тестируем count users...');
      const userCount = await prisma.user.count();
      results.userCount = userCount;
      console.log(`✅ Найдено пользователей: ${userCount}`);
    } catch (error: any) {
      console.error('❌ count users ошибка:', error);
      results.userCount = 'FAILED: ' + error.message;
      if (!results.error) results.error = error.message;
    }

    try {
      // 4. Тест подсчета кабинетов
      console.log('4️⃣ Тестируем count cabinets...');
      const cabinetCount = await prisma.cabinet.count();
      results.cabinetCount = cabinetCount;
      console.log(`✅ Найдено кабинетов: ${cabinetCount}`);
    } catch (error: any) {
      console.error('❌ count cabinets ошибка:', error);
      results.cabinetCount = 'FAILED: ' + error.message;
      if (!results.error) results.error = error.message;
    }

    try {
      // 5. Тест подсчета сессий
      console.log('5️⃣ Тестируем count sessions...');
      const sessionCount = await prisma.session.count();
      results.sessionCount = sessionCount;
      console.log(`✅ Найдено сессий: ${sessionCount}`);
    } catch (error: any) {
      console.error('❌ count sessions ошибка:', error);
      results.sessionCount = 'FAILED: ' + error.message;
      if (!results.error) results.error = error.message;
    }

    // Общий результат
    const hasErrors = Object.values(results).some(v => 
      typeof v === 'string' && v.includes('FAILED')
    );

    console.log(`🧪 [DB Test] Результат тестирования: ${hasErrors ? 'ЕСТЬ ОШИБКИ' : 'ВСЕ РАБОТАЕТ'}`);

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Есть проблемы с подключением к БД' : 'База данных работает корректно',
      results,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'), // Скрываем пароль
      recommendations: hasErrors ? [
        'Проверьте правильность DATABASE_URL в .env.local',
        'Убедитесь что используется порт 5432 вместо 6543',
        'Проверьте доступность сервера aws-1-eu-north-1.pooler.supabase.com',
        'Попробуйте выполнить: npm run db:deploy или npx prisma db push'
      ] : []
    });

  } catch (error: any) {
    console.error('🧪 [DB Test] Критическая ошибка:', error);

    return NextResponse.json({
      success: false,
      message: 'Критическая ошибка тестирования БД',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'),
      recommendations: [
        'Проверьте .env.local файл',
        'Убедитесь что DATABASE_URL корректен',
        'Попробуйте перезапустить сервер разработки',
        'Проверьте доступность Supabase'
      ]
    }, { status: 500 });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.warn('Предупреждение при отключении от БД:', e);
    }
  }
}