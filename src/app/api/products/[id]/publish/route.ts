// app/api/products/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Получен запрос на публикацию товара');
    
    const body = await request.json();
    const { productId, cabinetIds } = body;
    
    console.log('📦 Данные публикации:', {
      productId,
      cabinetIds,
      cabinetsCount: cabinetIds?.length || 0
    });

    // Валидация обязательных полей
    if (!productId || !cabinetIds || !Array.isArray(cabinetIds) || cabinetIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать ID товара и список кабинетов для публикации'
      }, { status: 400 });
    }

    // Получение userId (в реальном приложении из токена авторизации)
    const userId = request.headers.get('x-user-id') || 'default-user-id';

    // Проверяем, что товар существует и принадлежит пользователю
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: userId
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
    if (product.status !== 'ANALYZED') {
      return NextResponse.json({
        success: false,
        error: 'Товар должен быть проанализирован ИИ перед публикацией'
      }, { status: 400 });
    }

    // Проверяем, что все указанные кабинеты существуют и принадлежат пользователю
    const cabinets = await prisma.cabinet.findMany({
      where: {
        id: { in: cabinetIds },
        userId: userId,
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

        // В реальном приложении здесь должна быть отправка задачи в очередь
        // для фактической публикации на Wildberries
        console.log(`📋 Публикация добавлена в очередь: ${publication.id}`);
        
      } catch (error) {
        console.error(`❌ Ошибка создания публикации для кабинета ${cabinet.name}:`, error);
        
        // Продолжаем с другими кабинетами, но записываем ошибку
        publications.push({
          cabinetId: cabinet.id,
          cabinetName: cabinet.name,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    // Обновляем статус товара
    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'QUEUED_FOR_PUBLICATION',
        updatedAt: new Date()
      }
    });

    const successCount = publications.filter(p => p.status !== 'FAILED').length;
    const failureCount = publications.filter(p => p.status === 'FAILED').length;

    console.log(`✅ Публикация завершена: ${successCount} успешно, ${failureCount} с ошибками`);

    // Возвращаем результат
    return NextResponse.json({
      success: true,
      message: `Товар поставлен в очередь на публикацию в ${successCount} кабинет(ах)`,
      data: {
        productId: productId,
        totalCabinets: cabinetIds.length,
        successfulPublications: successCount,
        failedPublications: failureCount,
        publications: publications,
        productStatus: 'QUEUED_FOR_PUBLICATION'
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