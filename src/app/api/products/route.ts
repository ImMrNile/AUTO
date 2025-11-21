// src/app/api/products/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ ДУБЛИРОВАНИЯ

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safePrismaOperation } from '@/lib/prisma-utils';
import { uploadService } from '@/lib/services/uploadService';
import { AuthService } from '@/lib/auth/auth-service';
import { UnifiedAISystem } from '@/lib/services/unifiedAISystem';
import { UserWbTokenService } from '@/lib/services/userWbTokenService';
import { deleteCached } from '@/lib/cache/redis';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET метод для получения списка товаров
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
        wbNmId: true,
        status: true,
        originalImage: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    return NextResponse.json(
      { error: 'Ошибка получения товаров' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let productId: string | undefined = undefined;
  let taskId: string | undefined = undefined;
  
  // Функция для обновления статуса задачи
  const updateTaskStatus = async (status: 'CREATING' | 'ANALYZING' | 'PUBLISHING' | 'COMPLETED' | 'ERROR', progress: number, currentStage: string, productIdForTask?: string) => {
    if (!taskId) return;
    try {
      await prisma.productCreationTask.update({
        where: { id: taskId },
        data: { 
          status, 
          progress, 
          currentStage, 
          productId: productIdForTask || undefined,
          updatedAt: new Date() 
        }
      });
      console.log(`📊 Обновлен статус задачи ${taskId}: ${currentStage} (${progress}%)`);
    } catch (error) {
      console.error('❌ Ошибка обновления статуса задачи:', error);
    }
  };
  
  try {
    console.log(`🚀 [API ${requestId}] Начало создания товара с единой системой ИИ в ${new Date().toISOString()}`);

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Парсинг данных из FormData
    const formData = await request.formData();
    
    // 🔍 ДИАГНОСТИКА: Проверяем все поля FormData
    console.log('🔍 Анализ FormData:');
    const formDataEntries = Array.from(formData.entries());
    const imageFields = formDataEntries.filter(([key]) => key.includes('image') || key === 'image');
    const otherFields = formDataEntries.filter(([key]) => !key.includes('image') && key !== 'image');
    
    console.log(`📋 Общие поля (${otherFields.length}):`, 
      Object.fromEntries(otherFields.map(([k, v]) => [k, typeof v === 'string' ? v.substring(0, 50) + (v.length > 50 ? '...' : '') : `[${v.constructor?.name}]`]))
    );
    console.log(`🖼️ Поля изображений (${imageFields.length}):`, 
      Object.fromEntries(imageFields.map(([k, v]) => [k, v instanceof File ? `File: ${v.name} (${v.size} bytes, ${v.type})` : `[${typeof v}] ${v}`]))
    );
    
    // 🔥 ИЗВЛЕКАЕМ taskId из FormData
    taskId = (formData.get('taskId') as string) || undefined;
    if (taskId) {
      console.log(`📋 Получен taskId из формы: ${taskId}`);
      await updateTaskStatus('CREATING', 5, 'Начало обработки');
    }
    
    const productData = {
      name: (formData.get('name') as string) || '',
      originalPrice: (formData.get('originalPrice') as string) || '',
      discountPrice: (formData.get('discountPrice') as string) || '',
      costPrice: (formData.get('costPrice') as string) || '',
      packageContents: (formData.get('packageContents') as string) || '',
      dimensions: (() => {
        try {
          const dimensions = formData.get('dimensions');
          return dimensions ? JSON.parse(dimensions as string) : { length: 25, width: 20, height: 10, weight: 0.3 };
        } catch {
          return { length: 25, width: 20, height: 10, weight: 0.3 };
        }
      })(),
      referenceUrl: (formData.get('referenceUrl') as string) || '',
      cabinetId: (formData.get('cabinetId') as string) || '',
      vendorCode: (formData.get('vendorCode') as string) || '',
      barcode: (formData.get('barcode') as string) || '',
      hasVariantSizes: formData.get('hasVariantSizes') === 'true',
      variantSizes: (() => {
        try {
          const variantSizesData = formData.get('variantSizes');
          return variantSizesData ? JSON.parse(variantSizesData as string) : [];
        } catch {
          return [];
        }
      })(),
      description: (formData.get('description') as string) || '',
      mainImage: (() => {
        const imageFile = formData.get('image') as File;
        console.log('🔍 Парсинг главного изображения из formData:', {
          exists: !!imageFile,
          name: imageFile?.name || 'НЕТ',
          size: imageFile?.size || 0,
          type: imageFile?.type || 'неизвестно'
        });
        return imageFile && imageFile.size > 0 ? imageFile : null;
      })(),
      imageComments: (formData.get('imageComments') as string) || '',
      categoryId: (formData.get('categoryId') as string) || '',
      categoryName: (formData.get('categoryName') as string) || '',
      parentCategoryName: (formData.get('parentCategoryName') as string) || '',
      additionalImagesCount: parseInt((formData.get('additionalImagesCount') as string) || '0'),
    };

    console.log(`📦 Анализ товара: "${productData.name}" в категории ${productData.categoryName}`);

    // Валидация обязательных полей
    const validationErrors = [];
    if (!productData.name.trim()) validationErrors.push('название товара');
    if (!productData.originalPrice.trim()) validationErrors.push('оригинальная цена');
    if (!productData.discountPrice.trim()) validationErrors.push('цена со скидкой');
    if (!productData.packageContents.trim()) validationErrors.push('комплектация');
    if (!productData.categoryId.trim()) validationErrors.push('категория');
    
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: `Отсутствуют обязательные поля: ${validationErrors.join(', ')}`
      }, { status: 400 });
    }

    // Получение кабинетов пользователя
    const cabinets = await safePrismaOperation(
      () => prisma.cabinet.findMany({
        where: { userId: user.id, isActive: true }
      }),
      'получение кабинетов'
    );

    if (cabinets.length === 0) {
      return NextResponse.json({ 
        error: 'У пользователя нет активных кабинетов'
      }, { status: 400 });
    }
    
    // Автовыбор кабинета если не указан
    if (!productData.cabinetId) {
      productData.cabinetId = cabinets[0].id;
      console.log(`Автовыбран кабинет: ${cabinets[0].name}`);
    }

    // Загрузка основного изображения
    await updateTaskStatus('CREATING', 10, 'Загрузка изображений');
    
    let mainImageUrl = null;
    console.log('🖼️ Проверка главного изображения:', {
      hasMainImage: !!productData.mainImage,
      imageType: productData.mainImage?.constructor?.name,
      imageSize: productData.mainImage?.size || 'неизвестно'
    });
    
    if (productData.mainImage) {
      try {
        mainImageUrl = await uploadService.uploadFile(productData.mainImage);
        console.log('✅ Главное изображение загружено:', mainImageUrl);
      } catch (imageError) {
        console.error('❌ Ошибка загрузки главного изображения:', imageError);
        await updateTaskStatus('ERROR', 0, 'Ошибка загрузки изображения');
        return NextResponse.json({ 
          error: 'Ошибка загрузки главного изображения'
        }, { status: 500 });
      }
    } else {
      console.warn('⚠️ Главное изображение НЕ предоставлено');
    }

    // Загрузка дополнительных изображений
    const additionalImageUrls: string[] = [];
    console.log(`🖼️ Проверка дополнительных изображений: ожидается ${productData.additionalImagesCount}`);
    
    // Отладка: выводим все ключи FormData
    const formDataKeys = Array.from(formData.keys());
    console.log(`🔍 Все ключи в FormData (${formDataKeys.length}):`, formDataKeys.filter(k => k.includes('Image')));
    
    for (let i = 0; i < productData.additionalImagesCount; i++) {
      const additionalImage = formData.get(`additionalImage${i}`) as File;
      console.log(`🖼️ Дополнительное изображение ${i}:`, {
        exists: !!additionalImage,
        type: additionalImage?.constructor?.name,
        size: additionalImage?.size || 'неизвестно',
        name: additionalImage?.name || 'нет имени'
      });
      
      if (additionalImage && additionalImage.size > 0) {
        try {
          const additionalImageUrl = await uploadService.uploadFile(additionalImage);
          additionalImageUrls.push(additionalImageUrl);
          console.log(`✅ Дополнительное изображение ${i + 1} загружено:`, additionalImageUrl);
        } catch (imageError) {
          console.warn(`⚠️ Ошибка загрузки дополнительного изображения ${i + 1}:`, imageError);
        }
      }
    }

    console.log(`📸 Итого загружено изображений:`, {
      main: mainImageUrl ? 1 : 0,
      additional: additionalImageUrls.length,
      total: (mainImageUrl ? 1 : 0) + additionalImageUrls.length
    });

    // 🔥 ИСПРАВЛЕНИЕ: Получаем правильный ID категории для характеристик
    console.log(`🔍 Получаем правильный ID категории для характеристик...`);
    console.log(`   - productData.categoryId: ${productData.categoryId} (тип: ${typeof productData.categoryId})`);
    console.log(`   - productData.categoryName: ${productData.categoryName}`);
    
    // Сначала пробуем использовать categoryId как есть (если это уже ID)
    let correctCategoryId = parseInt(productData.categoryId);
    console.log(`🔍 Исходный categoryId: ${correctCategoryId} (тип: ${typeof correctCategoryId})`);
    
    // Если categoryId больше 1000, это скорее всего wbSubjectId, нужно найти соответствующий ID
    if (correctCategoryId > 1000) {
      console.log(`⚠️ categoryId ${correctCategoryId} выглядит как wbSubjectId, ищем соответствующий ID...`);
      
      try {
        const category = await safePrismaOperation(
          () => prisma.wbSubcategory.findFirst({
            where: { wbSubjectId: correctCategoryId },
            select: { id: true, name: true, wbSubjectId: true }
          }),
          'поиск категории по wbSubjectId'
        );
        
        if (category) {
          console.log(`✅ Найдена категория: ${category.name} (ID: ${category.id}, wbSubjectId: ${category.wbSubjectId})`);
          const oldCategoryId = correctCategoryId;
          correctCategoryId = category.id;
          console.log(`🔄 ПРЕОБРАЗОВАНИЕ: wbSubjectId ${oldCategoryId} → ID ${correctCategoryId}`);
          console.log(`✅ ПРЕОБРАЗОВАНИЕ УСПЕШНО: ${oldCategoryId} → ${correctCategoryId}`);
        } else {
          console.warn(`⚠️ Категория с wbSubjectId ${correctCategoryId} не найдена, используем исходное значение`);
        }
      } catch (error) {
        console.error(`❌ Ошибка поиска категории по wbSubjectId:`, error);
        console.warn(`⚠️ Используем исходное значение: ${correctCategoryId}`);
      }
    } else {
      console.log(`✅ categoryId ${correctCategoryId} уже является ID, используем как есть`);
    }
    
    console.log(`✅ Итоговый categoryId для товара: ${correctCategoryId}`);

    // Создание товара в базе данных
    await updateTaskStatus('CREATING', 30, 'Создание товара в БД');
    
    const product = await safePrismaOperation(
      () => prisma.product.create({
        data: {
          name: productData.name,
          price: parseFloat(productData.originalPrice), // Цена без скидки
          discountPrice: parseFloat(productData.discountPrice), // Цена со скидкой
          costPrice: productData.costPrice ? parseFloat(productData.costPrice) : null, // Себестоимость
          status: 'DRAFT',
          originalImage: mainImageUrl,
          referenceUrl: productData.referenceUrl || null,
          dimensions: {
            length: productData.dimensions.length,
            width: productData.dimensions.width,
            height: productData.dimensions.height,
            weight: productData.dimensions.weight // Вес в кг (без конвертации)
          },
          workflowId: `unified-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          processingMethod: 'unified_ai_system_v3_gpt5',
          wbData: {
            vendorCode: productData.vendorCode,
            barcode: productData.barcode,
            packageContents: productData.packageContents,
            hasVariantSizes: productData.hasVariantSizes,
            variantSizes: productData.variantSizes,
            description: productData.description,
            imageComments: productData.imageComments,
            originalPrice: parseFloat(productData.originalPrice),
            discountPrice: parseFloat(productData.discountPrice),
            costPrice: productData.costPrice ? parseFloat(productData.costPrice) : null,
            categoryId: parseInt(productData.categoryId), // Оставляем исходный wbSubjectId для совместимости
            categoryName: productData.categoryName,
            parentCategoryName: productData.parentCategoryName,
            // 📸 СОХРАНЯЕМ ВСЕ ФОТОГРАФИИ
            images: {
              main: mainImageUrl,
              additional: additionalImageUrls.filter((url): url is string => url !== null)
            }
          },
          userId: user.id,
          subcategoryId: correctCategoryId // Используем правильный ID для связи с характеристиками
        }
      }),
      'создание товара в БД'
    );
    
    productId = product.id;
    console.log(`✅ Товар создан в БД с ID: ${productId}`);
    
    // Создание связи товара с кабинетом
    await safePrismaOperation(
      () => prisma.productCabinet.create({
        data: {
          productId: product.id,
          cabinetId: productData.cabinetId,
          isSelected: true
        }
      }),
      'создание связи с кабинетом'
    );

    console.log('✅ Связь с кабинетом создана');

    // Подготовка данных для ИИ анализа
    const productImages = [mainImageUrl, ...additionalImageUrls].filter((url): url is string => url !== null);
    
    console.log(`📸 Подготовка изображений для ИИ:`, {
      mainImageUrl: mainImageUrl ? 'загружено' : 'НЕТ',
      additionalCount: additionalImageUrls.length,
      totalImages: productImages.length
    });
    
    if (productImages.length === 0) {
      console.warn(`⚠️ ВНИМАНИЕ: Нет изображений для анализа ИИ! Качество анализа может быть снижено.`);
    }
    
    const aiInput = {
      productName: productData.name,
      productImages,
      categoryId: correctCategoryId, // Используем правильный ID
      packageContents: productData.packageContents,
      referenceUrl: productData.referenceUrl,
      price: parseFloat(productData.discountPrice),
      dimensions: productData.dimensions,
      hasVariantSizes: productData.hasVariantSizes,
      variantSizes: productData.variantSizes,
      aiPromptComment: productData.imageComments,
      userId: user.id, // Добавлено для получения поисковых запросов
      preserveUserData: {
        preserveUserData: true,
        userProvidedPackageContents: productData.packageContents,
        userProvidedDimensions: productData.dimensions,
        specialInstructions: `Сохранить пользовательские данные: "${productData.packageContents}"`
      }
    };
    
    console.log(`✅ Итоговый categoryId для ИИ: ${correctCategoryId}`);

    // 🔥 НОВАЯ ЛОГИКА: ИИ анализ БЕЗ сохранения в БД
    await updateTaskStatus('ANALYZING', 50, 'ИИ анализ характеристик', productId);
    
    let aiResult = null;
    let aiAnalysisStatus = 'failed';
    
    try {
      console.log(`🤖 [API ${requestId}] Запуск единой системы ИИ анализа (предварительный) в ${new Date().toISOString()}...`);
      
      const unifiedAISystem = new UnifiedAISystem();
      console.log(`⏳ [API ${requestId}] Ожидание результатов ИИ анализа...`);
      
      aiResult = await unifiedAISystem.analyzeProductComplete(aiInput);
      
      console.log(`✅ [API ${requestId}] ИИ анализ завершен, обновляем статус...`);
      aiAnalysisStatus = 'completed';
      await updateTaskStatus('ANALYZING', 90, 'Сохранение результатов анализа', productId);
      console.log(`✅ [API ${requestId}] Статус обновлен на 90%`);
      
      console.log('✅ ИИ анализ завершен');
      console.log(`📊 Результаты анализа:`);
      console.log(`   - Характеристик заполнено: ${aiResult.qualityMetrics.characteristicsFillRate}%`);
      console.log(`   - Описание: ${aiResult.qualityMetrics.seoDescriptionLength} символов`);
      console.log(`   - Название: ${aiResult.qualityMetrics.seoTitleLength} символов`);
      console.log(`   - Качество приемлемо: ${aiResult.qualityMetrics.isQualityAcceptable ? 'ДА' : 'НЕТ'}`);
      console.log(`   - Общий балл: ${aiResult.analysisReport.finalScore}/100`);
      console.log(`   - Время выполнения: ${aiResult.analysisReport.totalProcessingTime}мс`);
      console.log(`   - Стоимость: $${aiResult.analysisReport.totalCost.toFixed(4)}`);
      
      // 💾 Сохранение ИИ данных в БД
      console.log('💾 Сохранение ИИ данных в БД...');
      try {
        await safePrismaOperation(
          () => prisma.product.update({
            where: { id: productId },
            data: {
              generatedName: aiResult!.seoTitle || productData.name,
              seoDescription: aiResult!.seoDescription || '',
              aiCharacteristics: {
                characteristics: aiResult!.characteristics || [],
                qualityMetrics: aiResult!.qualityMetrics,
                analysisReport: aiResult!.analysisReport,
                confidence: aiResult!.confidence,
                warnings: aiResult!.warnings || [],
                recommendations: aiResult!.recommendations || [],
                systemVersion: 'unified_ai_v3_gpt5',
                processedAt: new Date().toISOString()
              }
            }
          }),
          'сохранение ИИ данных'
        );
        console.log('✅ ИИ данные сохранены в БД');
      } catch (saveError) {
        console.error('❌ Ошибка сохранения ИИ данных:', saveError);
      }
      
    } catch (aiError) {
      console.error('❌ Ошибка единой системы ИИ:', aiError);
      aiAnalysisStatus = 'failed';
    }

    // 🔥 ИСПРАВЛЕНИЕ: Загружаем ВСЕ характеристики категории для фронтенда
    console.log('📋 Загрузка всех характеристик категории для фронтенда...');
    let allCategoryCharacteristics: any[] = [];
    
    try {
      const fullCategory = await safePrismaOperation(
        () => prisma.wbSubcategory.findUnique({
          where: { id: correctCategoryId }, // Используем правильный ID
          include: {
            characteristics: {
              include: {
                values: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' }
                }
              },
              orderBy: [
                { isRequired: 'desc' },
                { sortOrder: 'asc' },
                { name: 'asc' }
              ]
            }
          }
        }),
        'загрузка всех характеристик категории'
      );
      
      allCategoryCharacteristics = fullCategory?.characteristics || [];
      console.log(`✅ Загружено ${allCategoryCharacteristics.length} характеристик категории (ID: ${correctCategoryId})`);
    } catch (error) {
      console.warn('⚠️ Ошибка загрузки характеристик категории:', error);
    }

    // ✅ ИИ данные сохранены в БД, возвращаем фронтенду для просмотра
    console.log('✅ ИИ данные сохранены в БД и готовы к просмотру');

    const totalProcessingTime = Date.now() - startTime;
    console.log(`⏱️ Общее время обработки: ${totalProcessingTime}мс`);

    // 🔥 ОБЪЕДИНЕНИЕ: Создаем полный список характеристик (ИИ + пустые)
    console.log('🔄 Объединение ИИ характеристик с полным списком категории...');
    const aiCharacteristics = aiResult?.characteristics || [];
    const mergedCharacteristics = allCategoryCharacteristics.map((categoryChar: any) => {
      // Ищем соответствующую ИИ характеристику
      const aiChar = aiCharacteristics.find((ai: any) => 
        ai.id === categoryChar.wbCharacteristicId || 
        ai.id === categoryChar.id ||
        ai.name?.toLowerCase().trim() === categoryChar.name?.toLowerCase().trim()
      );
      
      return {
        id: categoryChar.wbCharacteristicId || categoryChar.id,
        wbCharacteristicId: categoryChar.wbCharacteristicId,
        name: categoryChar.name,
        value: aiChar?.value || null,
        confidence: aiChar?.confidence || 0,
        reasoning: aiChar?.reasoning || '',
        type: categoryChar.type,
        isRequired: categoryChar.isRequired,
        maxLength: categoryChar.maxLength,
        minValue: categoryChar.minValue,
        maxValue: categoryChar.maxValue,
        description: categoryChar.description,
        values: (categoryChar.values || []).map((v: any) => ({
          id: v.wbValueId || v.id,
          value: v.value,
          displayName: v.displayName || v.value
        })),
        isFilled: !!(aiChar?.value),
        source: aiChar?.source || 'none',
        showInUI: true,
        isEditable: true
      };
    });

    console.log(`✅ Объединено: ${mergedCharacteristics.length} характеристик (${aiCharacteristics.length} от ИИ)`);

    // ✅ Завершаем задачу
    console.log(`🎯 [API ${requestId}] Обновляем статус на COMPLETED...`);
    await updateTaskStatus('COMPLETED', 100, 'Товар создан и проанализирован', productId);
    console.log(`✅ [API ${requestId}] Статус обновлен на COMPLETED`);

    // ✅ Формирование ответа с сохраненными ИИ данными
    const responseData: any = {
      success: true,
      message: aiAnalysisStatus === 'completed' 
        ? 'Товар создан и проанализирован ИИ! Данные сохранены в БД.'
        : 'Товар создан. ИИ анализ не удался - заполните характеристики вручную',
      productId,
      processingTime: totalProcessingTime,
      
      // Базовые данные товара
      data: {
        name: productData.name,
        vendorCode: productData.vendorCode,
        barcode: productData.barcode,
        packageContents: productData.packageContents,
        price: {
          original: parseFloat(productData.originalPrice),
          discount: parseFloat(productData.discountPrice),
          cost: productData.costPrice ? parseFloat(productData.costPrice) : null
        },
        category: {
          id: parseInt(productData.categoryId),
          name: productData.categoryName,
          parentName: productData.parentCategoryName
        },
        images: {
          main: mainImageUrl,
          additional: additionalImageUrls
        },
        dimensions: productData.dimensions,
        hasVariantSizes: productData.hasVariantSizes,
        variantSizes: productData.variantSizes,
        status: 'DRAFT' // Всегда DRAFT до публикации
      },
      
      // 🔥 ИИ данные для предварительного просмотра (автоматически сохранены в БД)
      aiPreview: aiResult ? {
        characteristics: aiResult.characteristics || [],
        seoTitle: aiResult.seoTitle || productData.name,
        seoDescription: aiResult.seoDescription || '',
        qualityMetrics: aiResult.qualityMetrics,
        analysisReport: aiResult.analysisReport,
        confidence: aiResult.confidence,
        warnings: aiResult.warnings || [],
        recommendations: aiResult.recommendations || [],
        systemVersion: 'unified_ai_v3_gpt5',
        processedAt: new Date().toISOString()
      } : null,

      // ✅ ИСПРАВЛЕНИЕ: Отдаем ВСЕ характеристики категории (заполненные + пустые)
      aiCharacteristics: {
        characteristics: mergedCharacteristics, // Теперь все 27 характеристик
        qualityScore: aiResult?.qualityMetrics?.overallScore || 0,
        confidence: aiResult?.confidence || 0,
        warnings: aiResult?.warnings || [],
        recommendations: aiResult?.recommendations || [],
        analysisReport: aiResult?.analysisReport,
        qualityMetrics: aiResult?.qualityMetrics,
        systemVersion: 'unified_ai_preview_full',
        processedAt: new Date().toISOString(),
        
        // Статистика объединения
        totalCharacteristics: mergedCharacteristics.length,
        filledByAI: aiCharacteristics.length,
        emptyCharacteristics: mergedCharacteristics.length - aiCharacteristics.length
      },

      // Дублируем ключевые поля верхнего уровня для удобного доступа на фронте
      characteristics: mergedCharacteristics, // Все характеристики вместо только ИИ
      generatedName: aiResult?.seoTitle || productData.name,
      seoDescription: aiResult?.seoDescription || '',
      price: parseFloat(productData.originalPrice),
      discountPrice: productData.discountPrice ? parseFloat(productData.discountPrice) : null,
      costPrice: productData.costPrice ? parseFloat(productData.costPrice) : null,
      stock: 0, // По умолчанию 0, пользователь заполнит
      
      // Статус анализа
      aiAnalysisStatus,
      needsUserConfirmation: false // Данные уже сохранены автоматически
    };

    // 🔥 Системная информация об ИИ обработке (для отладки)
    if (aiResult) {
      responseData.systemInfo = {
        version: 'unified_ai_system_v3_gpt5',
        workflow: 'preview_first', // Новый workflow - сначала предпросмотр, потом публикация
        agents: [
          'GPT-5-mini Research Agent',
          'GPT-5-mini Characteristics Agent', 
          'GPT-5-mini/GPT-5 SEO Agent (Smart Fallback)'
        ],
        performance: {
          totalCharacteristics: aiResult.characteristics.length,
          filledCharacteristics: aiResult.characteristics.filter((c: any) => c.value && String(c.value).trim() !== '').length,
          processingTime: aiResult.analysisReport.totalProcessingTime,
          totalCost: aiResult.analysisReport.totalCost,
          confidence: aiResult.confidence
        }
      };
    }

    // ============ ИНВАЛИДАЦИЯ КЕША ============
    const cacheKey = `products:${user.id}:all`;
    await deleteCached(cacheKey);
    console.log(`🗑️ Кеш товаров инвалидирован после создания товара`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Критическая ошибка API:', error);
    
    const totalProcessingTime = Date.now() - startTime;

    // Обновляем статус задачи на ERROR
    await updateTaskStatus('ERROR', 0, 'Ошибка создания товара');

    // Детализированная обработка ошибок
    let errorMessage = 'Внутренняя ошибка сервера';
    let errorDetails = '';
    let suggestion = 'Попробуйте позже или обратитесь в поддержку';
    let errorCategory = 'unknown';
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('database server')) {
        errorMessage = 'Временные проблемы с базой данных';
        errorCategory = 'database';
        suggestion = 'База данных временно недоступна. Попробуйте через несколько минут.';
      } else if (error.message.includes('timeout') || error.message.includes('connection')) {
        errorMessage = 'Проблемы с подключением';
        errorCategory = 'network';
        suggestion = 'Проверьте интернет-соединение и попробуйте снова';
      } else if (error.message.includes('Категория') || error.message.includes('не найдена')) {
        errorMessage = 'Ошибка загрузки характеристик категории';
        errorCategory = 'category';
        suggestion = 'Выберите другую категорию или обратитесь в поддержку';
      } else if (error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'Проблема с конфигурацией ИИ';
        errorCategory = 'ai_config';
        suggestion = 'Обратитесь к администратору';
      } else {
        errorDetails = error.message;
        errorCategory = 'application';
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorCategory,
      details: errorDetails,
      suggestion,
      processingTime: totalProcessingTime,
      productId: productId || null,
      systemUsed: 'unified_ai_system_v3_gpt5',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
