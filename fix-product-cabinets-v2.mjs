// Улучшенный скрипт для привязки товаров к кабинетам
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

async function fixProductCabinets() {
  console.log('🔧 Проверка и исправление привязок товаров к кабинетам...\n');
  
  try {
    // 1. Найти товары с wbNmId (опубликованные) без привязки к кабинету С ТОКЕНОМ
    const products = await prisma.product.findMany({
      where: {
        wbNmId: {
          not: null
        }
      },
      include: {
        productCabinets: {
          include: {
            cabinet: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📦 Найдено опубликованных товаров: ${products.length}\n`);
    
    let needsFix = 0;
    let alreadyOk = 0;
    let fixed = 0;
    let errors = 0;
    
    for (const product of products) {
      const cabinet = product.productCabinets?.[0]?.cabinet;
      const hasValidCabinet = cabinet?.apiToken && cabinet?.isActive;
      
      if (hasValidCabinet) {
        alreadyOk++;
        continue;
      }
      
      needsFix++;
      
      try {
        // Найти первый активный кабинет пользователя с токеном
        const validCabinet = await prisma.cabinet.findFirst({
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
        
        if (!validCabinet) {
          console.log(`⚠️ ${product.name}`);
          console.log(`   Нет активного кабинета с токеном`);
          console.log('');
          errors++;
          continue;
        }
        
        // Проверить существует ли уже связь с этим кабинетом
        const existingLink = await prisma.productCabinet.findFirst({
          where: {
            productId: product.id,
            cabinetId: validCabinet.id
          }
        });
        
        if (existingLink) {
          console.log(`⏭️ ${product.name}`);
          console.log(`   Уже привязан к: ${validCabinet.name}`);
          console.log('');
          fixed++;
          continue;
        }
        
        // Удалить старые неправильные связи (если есть)
        if (product.productCabinets.length > 0) {
          await prisma.productCabinet.deleteMany({
            where: {
              productId: product.id
            }
          });
          console.log(`🗑️ Удалены старые привязки для: ${product.name}`);
        }
        
        // Создать новую правильную привязку
        await prisma.productCabinet.create({
          data: {
            productId: product.id,
            cabinetId: validCabinet.id,
            isSelected: true
          }
        });
        
        console.log(`✅ ${product.name}`);
        console.log(`   Привязан к кабинету: ${validCabinet.name}`);
        console.log(`   nmID: ${product.wbNmId}`);
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
    console.log(`✅ Уже правильно настроено: ${alreadyOk}`);
    console.log(`🔧 Исправлено: ${fixed}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`📦 Всего проверено: ${products.length}\n`);
    
    if (fixed > 0 || alreadyOk > 0) {
      const ready = alreadyOk + fixed;
      console.log(`🎉 Готово к тестированию: ${ready} товаров\n`);
      console.log('Проверьте:');
      console.log('   node check-wb-token.mjs\n');
      console.log('Или откройте:');
      console.log('   http://localhost:3000/test-ai-optimization\n');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductCabinets();
