// app/api/products/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🚀 Получен запрос на публикацию товара');
    
    // Безопасное извлечение данных из тела запроса
    let body;
    try {
      const textBody = await request.text();
      console.log('📦 Raw body length:', textBody?.length || 0);
      
      if (!textBody || textBody.trim() === '') {
        body = { cabinetIds: [] };
      } else {
        body = JSON.parse(textBody);
      }
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Некорректный формат данных запроса'
      }, { status: 400 });
    }
    
    let { cabinetIds } = body;
    const productId = params.id;
    
    console.log('📦 Данные публикации:', {
      productId,
      cabinetIds,
      cabinetsCount: cabinetIds?.length || 0
    });

    // Валидация productId
    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'ID товара не указан'
      }, { status: 400 });
    }

    // Авторизация - используем AuthService
    const { AuthService } = await import('../../../../../lib/auth/auth-service');
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Проверяем, что товар существует и принадлежит пользователю
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: user.id
      },
      include: {
        subcategory: true
      }
    });

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден или у вас нет доступа к нему'
      }, { status: 404 });
    }

    // Проверяем статус товара
    if (!['READY', 'ANALYZED', 'DRAFT'].includes(product.status)) {
      return NextResponse.json({
        success: false,
        error: `Товар в статусе "${product.status}" не может быть опубликован`
      }, { status: 400 });
    }

    // Если кабинеты не указаны, используем все связанные с товаром
    if (!cabinetIds || !Array.isArray(cabinetIds) || cabinetIds.length === 0) {
      console.log('⚠️ Кабинеты не указаны, используем связанные с товаром...');
      
      // Получаем кабинеты связанные с товаром
      const linkedCabinets = await prisma.productCabinet.findMany({
        where: { productId: productId },
        include: { cabinet: true }
      });
      
      const activeCabinetIds = linkedCabinets
        .filter(pc => pc.cabinet.isActive)
        .map(pc => pc.cabinet.id);
      
      if (activeCabinetIds.length === 0) {
        // Если нет связанных кабинетов, получаем все доступные пользователю
        const userCabinets = await prisma.cabinet.findMany({
          where: {
            userId: user.id,
            isActive: true
          }
        });
        
        cabinetIds = userCabinets.map(c => c.id);
      } else {
        cabinetIds = activeCabinetIds;
      }
      
      if (cabinetIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'У пользователя нет активных кабинетов для публикации'
        }, { status: 400 });
      }
      
      console.log(`✅ Используем ${cabinetIds.length} кабинетов`);
    }

    // Проверяем, что все указанные кабинеты существуют и принадлежат пользователю
    const cabinets = await prisma.cabinet.findMany({
      where: {
        id: { in: cabinetIds },
        userId: user.id,
        isActive: true
      }
    });

    if (cabinets.length !== cabinetIds.length) {
      const foundIds = cabinets.map(c => c.id);
      const missingIds = cabinetIds.filter(id => !foundIds.includes(id));
      
      return NextResponse.json({
        success: false,
        error: `Кабинеты не найдены или неактивны: ${missingIds.join(', ')}`
      }, { status: 400 });
    }

    console.log(`✅ Найдено ${cabinets.length} активных кабинетов для публикации`);

    // Создаем записи публикации для каждого кабинета
    const publications = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const cabinet of cabinets) {
      console.log(`📤 Создание публикации для кабинета: ${cabinet.name}`);
      
      try {
        // Проверяем, нет ли уже публикации в этом кабинете
        const existingPublication = await prisma.productPublication.findUnique({
          where: {
            productId_cabinetId: {
              productId: productId,
              cabinetId: cabinet.id
            }
          }
        });

        let publication;
        
        if (existingPublication) {
          // Обновляем существующую публикацию
          publication = await prisma.productPublication.update({
            where: { id: existingPublication.id },
            data: {
              status: 'QUEUED',
              errorMessage: null,
              price: product.price,
              updatedAt: new Date()
            }
          });
          console.log(`🔄 Обновлена существующая публикация: ${publication.id}`);
        } else {
          // Создаем новую публикацию
          publication = await prisma.productPublication.create({
            data: {
              productId: productId,
              cabinetId: cabinet.id,
              status: 'QUEUED',
              price: product.price
            }
          });
          console.log(`✨ Создана новая публикация: ${publication.id}`);
        }

        publications.push({
          id: publication.id,
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          status: publication.status
        });

        successCount++;
        console.log(`📋 Публикация добавлена в очередь: ${publication.id}`);
        
      } catch (error) {
        console.error(`❌ Ошибка создания публикации для кабинета ${cabinet.name}:`, error);
        
        publications.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
        
        failureCount++;
      }
    }

    // Обновляем статус товара только если есть успешные публикации
    if (successCount > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          status: 'QUEUED_FOR_PUBLICATION',
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ Публикация завершена: ${successCount} успешно, ${failureCount} с ошибками`);

    // Возвращаем результат
    return NextResponse.json({
      success: true,
      message: successCount > 0 
        ? `Товар поставлен в очередь на публикацию в ${successCount} кабинет(ах)${failureCount > 0 ? ` (${failureCount} ошибок)` : ''}`
        : 'Не удалось создать ни одной публикации',
      data: {
        productId: productId,
        productName: product.name,
        totalCabinets: cabinetIds.length,
        successfulPublications: successCount,
        failedPublications: failureCount,
        publications: publications,
        productStatus: successCount > 0 ? 'QUEUED_FOR_PUBLICATION' : product.status
      }
    });

  } catch (error) {
    console.error('❌ Критическая ошибка публикации товара:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при публикации товара',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}