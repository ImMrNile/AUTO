// src/app/api/products/route.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ ДУБЛИРОВАНИЯ

import { NextResponse } from 'next/server';
import { prisma, safePrismaOperation } from '@/lib/prisma';
import { uploadService } from '@/lib/services/uploadService';
import { AuthService } from '@/lib/auth/auth-service';
import { unifiedAISystem } from '@/lib/services/unifiedAISystem';

export async function POST(request: NextResponse) {
  const startTime = Date.now();
  let productId: string | undefined = undefined;
  
  try {
    console.log('🚀 Начало создания товара с единой системой ИИ');

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован'
      }, { status: 401 });
    }

    // Парсинг данных из FormData
    const formData = await request.formData();
    
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
      mainImage: formData.get('image') as File || null,
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
    let mainImageUrl = null;
    if (productData.mainImage) {
      try {
        mainImageUrl = await uploadService.uploadFile(productData.mainImage);
        console.log('✅ Главное изображение загружено');
      } catch (imageError) {
        console.error('❌ Ошибка загрузки изображения:', imageError);
        return NextResponse.json({ 
          error: 'Ошибка загрузки главного изображения'
        }, { status: 500 });
      }
    }

    // Загрузка дополнительных изображений
    const additionalImageUrls: string[] = [];
    for (let i = 0; i < productData.additionalImagesCount; i++) {
      const additionalImage = formData.get(`additionalImage${i}`) as File;
      if (additionalImage) {
        try {
          const additionalImageUrl = await uploadService.uploadFile(additionalImage);
          additionalImageUrls.push(additionalImageUrl);
        } catch (imageError) {
          console.warn(`⚠️ Ошибка загрузки дополнительного изображения ${i + 1}:`, imageError);
        }
      }
    }

    console.log(`📸 Загружено изображений: основное + ${additionalImageUrls.length} дополнительных`);

    // Создание товара в базе данных
    const product = await safePrismaOperation(
      () => prisma.product.create({
        data: {
          name: productData.name,
          price: parseFloat(productData.discountPrice),
          status: 'DRAFT',
          originalImage: mainImageUrl,
          referenceUrl: productData.referenceUrl || null,
          dimensions: {
            length: productData.dimensions.length,
            width: productData.dimensions.width,
            height: productData.dimensions.height,
            weight: productData.dimensions.weight * 1000 // Переводим в граммы
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
            categoryId: parseInt(productData.categoryId),
            categoryName: productData.categoryName,
            parentCategoryName: productData.parentCategoryName
          },
          userId: user.id,
          subcategoryId: parseInt(productData.categoryId)
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
    const aiInput = {
      productName: productData.name,
      productImages: [mainImageUrl, ...additionalImageUrls].filter((url): url is string => url !== null),
      categoryId: parseInt(productData.categoryId),
      packageContents: productData.packageContents,
      referenceUrl: productData.referenceUrl,
      price: parseFloat(productData.discountPrice),
      dimensions: productData.dimensions,
      hasVariantSizes: productData.hasVariantSizes,
      variantSizes: productData.variantSizes,
      aiPromptComment: productData.imageComments,
      preserveUserData: {
        preserveUserData: true,
        userProvidedPackageContents: productData.packageContents,
        userProvidedDimensions: productData.dimensions,
        specialInstructions: `Сохранить пользовательские данные: "${productData.packageContents}"`
      }
    };

    // 🔥 НОВАЯ ЛОГИКА: ИИ анализ БЕЗ сохранения в БД
    let aiResult = null;
    let aiAnalysisStatus = 'failed';
    
    try {
      console.log('🤖 Запуск единой системы ИИ анализа (предварительный)...');
      
      aiResult = await unifiedAISystem.analyzeProductComplete(aiInput);
      
      aiAnalysisStatus = 'completed';
      
      console.log('✅ ИИ анализ завершен (данные НЕ сохранены в БД)');
      console.log(`📊 Предварительные результаты анализа:`);
      console.log(`   - Характеристик заполнено: ${aiResult.qualityMetrics.characteristicsFillRate}%`);
      console.log(`   - Описание: ${aiResult.qualityMetrics.seoDescriptionLength} символов`);
      console.log(`   - Название: ${aiResult.qualityMetrics.seoTitleLength} символов`);
      console.log(`   - Качество приемлемо: ${aiResult.qualityMetrics.isQualityAcceptable ? 'ДА' : 'НЕТ'}`);
      console.log(`   - Общий балл: ${aiResult.analysisReport.finalScore}/100`);
      console.log(`   - Время выполнения: ${aiResult.analysisReport.totalProcessingTime}мс`);
      console.log(`   - Стоимость: $${aiResult.analysisReport.totalCost.toFixed(4)}`);
      console.log(`   ⚠️ Данные будут сохранены после подтверждения пользователем`);
      
    } catch (aiError) {
      console.error('❌ Ошибка единой системы ИИ:', aiError);
      aiAnalysisStatus = 'failed';
    }

    // 🔥 НОВАЯ ЛОГИКА: НЕ сохраняем ИИ данные в БД, возвращаем фронтенду
    console.log('⚠️ ИИ данные НЕ сохраняются в БД - ждем подтверждения пользователя');

    const totalProcessingTime = Date.now() - startTime;
    console.log(`⏱️ Общее время обработки: ${totalProcessingTime}мс`);

    // 🔥 НОВАЯ ЛОГИКА: Формирование ответа с ИИ данными для фронтенда
    const responseData: any = {
      success: true,
      message: aiAnalysisStatus === 'completed' 
        ? 'Товар создан, ИИ анализ завершен. Проверьте данные и нажмите "Опубликовать"'
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
      
      // 🔥 ИИ данные для предварительного просмотра (НЕ сохранены в БД)
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

      // ✅ Совместимость со старым фронтом: отдаем данные как будто они уже в БД
      // Никаких записей в БД не делаем, только возвращаем для рендера
      aiCharacteristics: aiResult ? {
        characteristics: aiResult.characteristics || [],
        qualityScore: aiResult.qualityMetrics?.overallScore,
        confidence: aiResult.confidence,
        warnings: aiResult.warnings || [],
        recommendations: aiResult.recommendations || [],
        analysisReport: aiResult.analysisReport,
        qualityMetrics: aiResult.qualityMetrics,
        systemVersion: 'unified_ai_preview',
        processedAt: new Date().toISOString()
      } : null,

      // Дублируем ключевые поля верхнего уровня для удобного доступа на фронте
      characteristics: aiResult?.characteristics || [],
      generatedName: aiResult?.seoTitle || productData.name,
      seoDescription: aiResult?.seoDescription || '',
      
      // Статус анализа
      aiAnalysisStatus,
      needsUserConfirmation: true // Указываем что нужно подтверждение
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

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Критическая ошибка API:', error);
    
    const totalProcessingTime = Date.now() - startTime;

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