// Скрипт для автоматической привязки товаров к кабинетам
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

async function fixProductCabinets() {
  console.log('🔧 Автоматическая привязка товаров к кабинетам...\n');
  
  try {
    // 1. Найти товары без привязки
    const productsWithoutCabinet = await prisma.product.findMany({
      where: {
        productCabinets: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        userId: true,
        wbNmId: true
      }
    });
    
    console.log(`📦 Найдено товаров без кабинета: ${productsWithoutCabinet.length}\n`);
    
    if (productsWithoutCabinet.length === 0) {
      console.log('✅ Все товары уже привязаны к кабинетам!');
      return;
    }
    
    let fixed = 0;
    let errors = 0;
    
    for (const product of productsWithoutCabinet) {
      try {
        // Найти первый активный кабинет пользователя с токеном
        const cabinet = await prisma.cabinet.findFirst({
          where: {
            userId: product.userId,
            isActive: true,
            apiToken: {
              not: null
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        });
        
        if (!cabinet) {
          console.log(`⚠️ ${product.name}`);
          console.log(`   Нет активного кабинета с токеном для пользователя`);
          errors++;
          continue;
        }
        
        // Проверить существует ли уже связь
        const existingLink = await prisma.productCabinet.findFirst({
          where: {
            productId: product.id,
            cabinetId: cabinet.id
          }
        });
        
        if (existingLink) {
          console.log(`⏭️ ${product.name}`);
          console.log(`   Уже привязан к кабинету: ${cabinet.name}`);
          console.log('');
          continue;
        }
        
        // Создать привязку
        await prisma.productCabinet.create({
          data: {
            productId: product.id,
            cabinetId: cabinet.id,
            isSelected: true
          }
        });
        
        console.log(`✅ ${product.name}`);
        console.log(`   Привязан к кабинету: ${cabinet.name}`);
        console.log(`   nmID: ${product.wbNmId || 'не опубликован'}`);
        console.log('');
        
        fixed++;
        
      } catch (error) {
        console.log(`❌ ${product.name}`);
        console.log(`   Ошибка: ${error.message}`);
        console.log('');
        errors++;
      }
    }
    
    console.log('=' .repeat(80));
    console.log('\n📊 РЕЗУЛЬТАТ:\n');
    console.log(`✅ Привязано товаров: ${fixed}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`📦 Всего обработано: ${productsWithoutCabinet.length}\n`);
    
    if (fixed > 0) {
      console.log('🎉 Отлично! Теперь проверьте:');
      console.log('   node check-wb-token.mjs\n');
      console.log('Или откройте:');
      console.log('   http://localhost:3000/test-ai-optimization\n');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductCabinets();
