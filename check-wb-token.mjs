// Скрипт для проверки настройки WB токена
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

async function checkWBTokenSetup() {
  console.log('🔍 Проверка настройки WB токена...\n');
  
  try {
    // 1. Проверяем кабинеты
    console.log('📋 Шаг 1: Проверка кабинетов...');
    const cabinets = await prisma.cabinet.findMany({
      select: {
        id: true,
        name: true,
        apiToken: true,
        isActive: true,
        userId: true,
        _count: {
          select: {
            productCabinets: true
          }
        }
      }
    });
    
    console.log(`✅ Найдено кабинетов: ${cabinets.length}\n`);
    
    if (cabinets.length === 0) {
      console.log('❌ ПРОБЛЕМА: Нет кабинетов в системе');
      console.log('💡 Решение: Добавьте кабинет через /cabinets\n');
      return;
    }
    
    cabinets.forEach((cabinet, idx) => {
      console.log(`${idx + 1}. ${cabinet.name}`);
      console.log(`   ID: ${cabinet.id}`);
      console.log(`   Активен: ${cabinet.isActive ? '✅ Да' : '❌ Нет'}`);
      console.log(`   Токен: ${cabinet.apiToken ? '✅ Установлен' : '❌ Отсутствует'}`);
      console.log(`   Товаров: ${cabinet._count.productCabinets}`);
      console.log('');
    });
    
    const cabinetsWithToken = cabinets.filter(c => c.apiToken && c.isActive);
    if (cabinetsWithToken.length === 0) {
      console.log('❌ ПРОБЛЕМА: Нет активных кабинетов с токеном');
      console.log('💡 Решение:');
      console.log('   1. Получите токен в личном кабинете WB Seller');
      console.log('   2. Добавьте токен через /cabinets');
      console.log('   3. Активируйте кабинет\n');
      return;
    }
    
    console.log(`✅ Активных кабинетов с токеном: ${cabinetsWithToken.length}\n`);
    
    // 2. Проверяем товары
    console.log('📦 Шаг 2: Проверка товаров...');
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        wbNmId: true,
        status: true,
        productCabinets: {
          include: {
            cabinet: {
              select: {
                id: true,
                name: true,
                apiToken: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`✅ Найдено товаров: ${products.length}\n`);
    
    if (products.length === 0) {
      console.log('⚠️ Нет товаров в системе');
      console.log('💡 Создайте товар для тестирования\n');
      return;
    }
    
    const publishedProducts = products.filter(p => p.wbNmId);
    console.log(`📊 Статистика товаров:`);
    console.log(`   Всего: ${products.length}`);
    console.log(`   Опубликовано на WB: ${publishedProducts.length}`);
    console.log(`   Не опубликовано: ${products.length - publishedProducts.length}\n`);
    
    // 3. Детальный анализ товаров
    console.log('🔍 Шаг 3: Анализ привязки товаров к кабинетам...\n');
    
    let readyForTest = 0;
    let needsCabinet = 0;
    let needsToken = 0;
    let needsPublish = 0;
    
    products.forEach((product, idx) => {
      const cabinet = product.productCabinets?.[0]?.cabinet;
      const hasToken = cabinet?.apiToken && cabinet?.isActive;
      const isPublished = !!product.wbNmId;
      
      const isReady = hasToken && isPublished;
      
      if (isReady) readyForTest++;
      if (!cabinet) needsCabinet++;
      if (cabinet && !hasToken) needsToken++;
      if (!isPublished) needsPublish++;
      
      const status = isReady ? '✅' : '❌';
      
      console.log(`${status} ${idx + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   nmID: ${product.wbNmId || '❌ не опубликован'}`);
      console.log(`   Статус: ${product.status}`);
      
      if (cabinet) {
        console.log(`   Кабинет: ${cabinet.name}`);
        console.log(`   Токен: ${hasToken ? '✅ Есть' : '❌ Нет'}`);
      } else {
        console.log(`   Кабинет: ❌ Не привязан`);
      }
      
      if (!isReady) {
        console.log(`   ⚠️ Проблемы:`);
        if (!cabinet) console.log(`      - Нет привязки к кабинету`);
        if (cabinet && !cabinet.apiToken) console.log(`      - У кабинета нет токена`);
        if (cabinet && !cabinet.isActive) console.log(`      - Кабинет неактивен`);
        if (!isPublished) console.log(`      - Товар не опубликован на WB`);
      }
      
      console.log('');
    });
    
    // 4. Итоговый отчет
    console.log('=' .repeat(80));
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:\n');
    
    console.log(`✅ Готовы к тестированию: ${readyForTest} товаров`);
    console.log(`❌ Требуют настройки: ${products.length - readyForTest} товаров\n`);
    
    if (needsCabinet > 0) {
      console.log(`⚠️ ${needsCabinet} товаров без кабинета`);
      console.log(`   Решение: Привяжите товары к кабинету\n`);
    }
    
    if (needsToken > 0) {
      console.log(`⚠️ ${needsToken} товаров с кабинетом без токена`);
      console.log(`   Решение: Добавьте токен WB API в кабинет\n`);
    }
    
    if (needsPublish > 0) {
      console.log(`⚠️ ${needsPublish} товаров не опубликованы на WB`);
      console.log(`   Решение: Опубликуйте товары на Wildberries\n`);
    }
    
    if (readyForTest > 0) {
      console.log('🎉 ОТЛИЧНО! Есть товары готовые к тестированию:');
      console.log(`   http://localhost:3000/test-ai-optimization\n`);
      
      const readyProducts = products.filter(p => {
        const cabinet = p.productCabinets?.[0]?.cabinet;
        return cabinet?.apiToken && cabinet?.isActive && p.wbNmId;
      });
      
      console.log('📋 Готовые товары:');
      readyProducts.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name} (nmID: ${p.wbNmId})`);
      });
      console.log('');
    } else {
      console.log('❌ Нет товаров готовых к тестированию');
      console.log('\n💡 Что нужно сделать:');
      console.log('   1. Добавьте токен WB API в кабинет (/cabinets)');
      console.log('   2. Привяжите товары к кабинету');
      console.log('   3. Опубликуйте товары на Wildberries\n');
    }
    
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWBTokenSetup();
