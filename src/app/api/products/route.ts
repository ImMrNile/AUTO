// src/app/api/products/route.ts - API для создания продуктов с Enhanced System (ИСПРАВЛЕННАЯ ВЕРСИЯ)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { uploadService } from '../../../../lib/services/uploadService';
import { AuthService } from '../../../../lib/auth/auth-service';
import { fromPrismaJson, toPrismaJson } from '../../../../lib/utils/json';

// Импорты сервисов
import { EnhancedCharacteristicsIntegrationService } from '../../../../lib/services/enhancedCharacteristicsService';

// Создаем экземпляр сервиса
const enhancedCharacteristicsIntegrationService = new EnhancedCharacteristicsIntegrationService();

/**
 * Функция проверки подключения к базе данных (встроенная)
 */
async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    const latency = Date.now() - startTime;
    console.log('✅ [DB] Database health check passed, latency:', latency + 'ms');
    
    return { connected: true, latency };
    
  } catch (error) {
    console.error('❌ [DB] Database health check failed:', error);
    
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// POST - создание нового продукта
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let productId: string | undefined = undefined;
  
  try {
    // Диагностика подключения к базе данных
    console.log('🔍 Проверка подключения к базе данных...');
    
    // Проверяем переменные окружения
    console.log('🔧 Переменные окружения:');
    console.log('   - DATABASE_URL:', process.env.DATABASE_URL ? 'установлена' : 'НЕ установлена');
    console.log('   - DIRECT_URL:', process.env.DIRECT_URL ? 'установлена' : 'НЕ установлена');
    console.log('   - NODE_ENV:', process.env.NODE_ENV || 'не установлена');
    
    try {
      const connectionStatus = await checkDatabaseConnection();
      if (connectionStatus.connected) {
        console.log('✅ Подключение к базе данных успешно');
      } else {
        console.error('❌ Подключение к базе данных не удалось:', connectionStatus.error);
      }
    } catch (dbError: any) {
      console.error('❌ Ошибка проверки подключения к базе данных:', dbError);
      console.error('🔧 Код ошибки:', dbError.code);
      console.error('💡 Сообщение:', dbError.message);
      
      if (dbError.code === 'P1001') {
        console.error('🚨 Проблема: Не удается подключиться к серверу базы данных');
        console.error('💡 Рекомендации:');
        console.error('   - Проверьте доступность сервера aws-1-eu-north-1.pooler.supabase.com');
        console.error('   - Проверьте настройки файрвола');
        console.error('   - Проверьте переменные окружения DATABASE_URL и DIRECT_URL');
      }
      
      if (dbError.code === 'P1017') {
        console.error('🚨 Проблема: Сервер отклонил подключение');
        console.error('💡 Рекомендации:');
        console.error('   - Проверьте правильность учетных данных');
        console.error('   - Проверьте лимиты подключений');
      }
    }

    // Авторизация пользователя с улучшенной обработкой ошибок
    let user = null;
    try {
      user = await AuthService.getCurrentUser();
    } catch (authError) {
      console.error('❌ Ошибка авторизации:', authError);
      
      return NextResponse.json({ 
        error: 'Ошибка авторизации',
        details: authError instanceof Error ? authError.message : 'Неизвестная ошибка',
        suggestion: 'Попробуйте перезагрузить страницу или войти заново'
      }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован',
        suggestion: 'Войдите в систему для создания товара'
      }, { status: 401 });
    }

    console.log('🚀 Начало обработки запроса на создание продукта');

    // Парсим данные запроса
    const formData = await request.formData();
    
    // Диагностика: выводим все полученные поля
    console.log('🔍 Диагностика formData:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value} (тип: ${typeof value})`);
    }
    
    // Безопасное извлечение данных формы с проверкой на null/undefined
    const productData = {
      name: (formData.get('name') as string) || '',
      originalPrice: (formData.get('originalPrice') as string) || '',
      discountPrice: (formData.get('discountPrice') as string) || '',
      costPrice: (formData.get('costPrice') as string) || '',
      packageContents: (formData.get('packageContents') as string) || '',
      length: (() => {
        const dimensions = formData.get('dimensions');
        if (dimensions && typeof dimensions === 'string') {
          try {
            const parsed = JSON.parse(dimensions);
            return parsed.length?.toString() || '';
          } catch (e) {
            return '';
          }
        }
        return '';
      })(),
      width: (() => {
        const dimensions = formData.get('dimensions');
        if (dimensions && typeof dimensions === 'string') {
          try {
            const parsed = JSON.parse(dimensions);
            return parsed.width?.toString() || '';
          } catch (e) {
            return '';
          }
        }
        return '';
      })(),
      height: (() => {
        const dimensions = formData.get('dimensions');
        if (dimensions && typeof dimensions === 'string') {
          try {
            const parsed = JSON.parse(dimensions);
            return parsed.height?.toString() || '';
          } catch (e) {
            return '';
          }
        }
        return '';
      })(),
      weight: (() => {
        const dimensions = formData.get('dimensions');
        if (dimensions && typeof dimensions === 'string') {
          try {
            const parsed = JSON.parse(dimensions);
            return parsed.weight?.toString() || '';
          } catch (e) {
            return '';
          }
        }
        return '';
      })(),
      referenceUrl: (formData.get('referenceUrl') as string) || '',
      cabinetId: (formData.get('cabinetId') as string) || '',
      vendorCode: (formData.get('vendorCode') as string) || '',
      autoGenerateVendorCode: formData.get('autoGenerateVendorCode') === 'true',
      barcode: (formData.get('barcode') as string) || '',
      hasVariantSizes: formData.get('hasVariantSizes') === 'true',
      variantSizes: (() => {
        try {
          const variantSizesData = formData.get('variantSizes');
          if (variantSizesData && typeof variantSizesData === 'string') {
            return JSON.parse(variantSizesData);
          }
          return [];
        } catch (error) {
          console.warn('⚠️ Ошибка парсинга variantSizes, используем пустой массив:', error);
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

    console.log('📥 Получены данные формы:', productData);

    // Строгая валидация всех обязательных полей
    const validationErrors = [];
    
    if (!productData.name || productData.name.trim() === '') {
      validationErrors.push('название товара');
    }
    
    if (!productData.originalPrice || productData.originalPrice.trim() === '') {
      validationErrors.push('оригинальная цена');
    }
    
    if (!productData.discountPrice || productData.discountPrice.trim() === '') {
      validationErrors.push('цена со скидкой');
    }
    
    if (!productData.packageContents || productData.packageContents.trim() === '') {
      validationErrors.push('комплектация');
    }
    
    if (!productData.length || productData.length.trim() === '') {
      validationErrors.push('длина');
    }
    
    if (!productData.width || productData.width.trim() === '') {
      validationErrors.push('ширина');
    }
    
    if (!productData.height || productData.height.trim() === '') {
      validationErrors.push('высота');
    }
    
    if (!productData.weight || productData.weight.trim() === '') {
      validationErrors.push('вес');
    }
    
    if (!productData.vendorCode || productData.vendorCode.trim() === '') {
      validationErrors.push('артикул');
    }
    
    if (!productData.barcode || productData.barcode.trim() === '') {
      validationErrors.push('штрихкод');
    }
    
    if (!productData.categoryId || productData.categoryId.trim() === '') {
      validationErrors.push('категория');
    }
    
    if (!productData.mainImage) {
      validationErrors.push('главное изображение');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Ошибка валидации:', validationErrors);
      return NextResponse.json({ 
        error: `Отсутствуют обязательные поля: ${validationErrors.join(', ')}`,
        receivedData: {
          name: productData.name,
          originalPrice: productData.originalPrice,
          discountPrice: productData.discountPrice,
          packageContents: productData.packageContents,
          dimensions: {
            length: productData.length,
            width: productData.width,
            height: productData.height,
            weight: productData.weight
          },
          vendorCode: productData.vendorCode,
          barcode: productData.barcode,
          categoryId: productData.categoryId,
          hasMainImage: !!productData.mainImage
        }
      }, { status: 400 });
    }

    // Проверяем корректность данных без установки дефолтных значений
    console.log('✅ Все обязательные поля заполнены пользователем');
    console.log(`📐 Размеры: ${productData.length}×${productData.width}×${productData.height} см`);
    console.log(`⚖️ Вес: ${productData.weight} кг`);
    console.log(`📦 Комплектация: ${productData.packageContents}`);
    console.log(`🏷️ Артикул: ${productData.vendorCode}`);
    console.log(`📊 Штрихкод: ${productData.barcode}`);
    console.log(`📂 Категория: ${productData.categoryName} (ID: ${productData.categoryId})`);

    // Получаем кабинеты из БД
    let cabinets = [];
    try {
      cabinets = await prisma.cabinet.findMany({
        where: { userId: user.id, isActive: true }
      });
      console.log(`✅ Получено ${cabinets.length} кабинетов для пользователя`);
    } catch (dbError) {
      console.error('❌ Ошибка получения кабинетов из БД:', dbError);
      return NextResponse.json({ 
        error: 'Ошибка получения кабинетов из базы данных',
        details: dbError instanceof Error ? dbError.message : 'Неизвестная ошибка'
      }, { status: 500 });
    }

    if (cabinets.length === 0) {
      console.error('❌ Нет доступных кабинетов для пользователя:', {
        userId: user.id,
        userEmail: user.email,
        cabinetsCount: cabinets.length
      });
      return NextResponse.json({ 
        error: 'Нет доступных кабинетов для пользователя',
        userId: user.id,
        userEmail: user.email
      }, { status: 400 });
    }
    
    console.log('✅ Доступные кабинеты:', cabinets.map(c => ({ id: c.id, name: c.name })));

    // Используем первый доступный кабинет если не выбран
    if (!productData.cabinetId || productData.cabinetId.trim() === '') {
      if (cabinets.length > 0) {
        productData.cabinetId = cabinets[0].id;
        console.log('⚠️ CabinetId не указан, используем первый доступный кабинет:', productData.cabinetId);
      } else {
        console.error('❌ Нет доступных кабинетов для пользователя');
        return NextResponse.json({ 
          error: 'Нет доступных кабинетов для пользователя',
          userId: user.id,
          availableCabinets: cabinets.length
        }, { status: 400 });
      }
    }

    // Проверяем корректность артикула и штрихкода
    if (productData.vendorCode.length < 8 || productData.vendorCode.length > 13) {
      return NextResponse.json({ 
        error: 'Артикул должен содержать от 8 до 13 символов',
        receivedVendorCode: productData.vendorCode,
        vendorCodeLength: productData.vendorCode.length
      }, { status: 400 });
    }

    if (productData.barcode.length !== 13) {
      return NextResponse.json({ 
        error: 'Штрихкод должен содержать ровно 13 символов',
        receivedBarcode: productData.barcode,
        barcodeLength: productData.barcode.length
      }, { status: 400 });
    }
    
    console.log('✅ Артикул и штрихкод соответствуют требованиям');

    // Получаем характеристики категории из БД для ИИ
    let categoryCharacteristics = [];
    try {
      categoryCharacteristics = await prisma.wbCategoryCharacteristic.findMany({
        where: { subcategoryId: parseInt(productData.categoryId) },
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
      });
      console.log(`✅ Получено ${categoryCharacteristics.length} характеристик для категории ${productData.categoryName}`);
      
      // Логируем характеристики для отладки
      console.log('🔍 Характеристики категории для ИИ:');
      categoryCharacteristics.forEach((char, index) => {
        console.log(`  ${index + 1}. ${char.name} (ID: ${char.wbCharacteristicId || char.id}, тип: ${char.type}, ${char.isRequired ? 'обязательная' : 'опциональная'})`);
        if (char.values && char.values.length > 0) {
          console.log(`     Варианты: ${char.values.slice(0, 3).map(v => v.value).join(', ')}${char.values.length > 3 ? '...' : ''}`);
        }
      });
      
    } catch (charError) {
      console.warn('⚠️ Ошибка получения характеристик категории:', charError);
      categoryCharacteristics = [];
    }

    console.log('📊 Данные для Enhanced System с двумя ценами успешно обработаны:', {
      productName: productData.name,
      priceInfo: {
        original: parseFloat(productData.originalPrice),
        discount: parseFloat(productData.discountPrice),
        final: parseFloat(productData.discountPrice)
      },
      hasDiscount: parseFloat(productData.originalPrice) > parseFloat(productData.discountPrice),
      discountPercent: parseFloat(productData.originalPrice) > parseFloat(productData.discountPrice) 
        ? Math.round(((parseFloat(productData.originalPrice) - parseFloat(productData.discountPrice)) / parseFloat(productData.originalPrice)) * 100)
        : 0,
      categoryId: parseInt(productData.categoryId),
      categoryName: productData.categoryName,
      parentCategoryName: productData.parentCategoryName,
      vendorCode: productData.vendorCode,
      barcode: productData.barcode,
      hasVariantSizes: productData.hasVariantSizes,
      variantSizesCount: productData.variantSizes.length,
      characteristicsCount: categoryCharacteristics.length,
      autoPublish: false
    });

    // Создаем продукт в БД с реальными данными
    try {
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          price: parseFloat(productData.discountPrice),
          status: 'DRAFT',
          originalImage: null, // Будет обновлено после обработки изображений
          referenceUrl: productData.referenceUrl || null,
          dimensions: {
            length: parseFloat(productData.length),
            width: parseFloat(productData.width),
            height: parseFloat(productData.height),
            weight: parseFloat(productData.weight) * 1000 // Конвертируем кг в граммы для БД
          },
          workflowId: `enhanced-dual-price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          processingMethod: 'enhanced_system_dual_price',
          wbData: {
            vendorCode: productData.vendorCode,
            barcode: productData.barcode,
            packageContents: productData.packageContents,
            hasVariantSizes: productData.hasVariantSizes,
            variantSizes: productData.variantSizes,
            description: productData.description || '',
            imageComments: productData.imageComments || '',
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
      });
      productId = product.id;
      console.log('✅ Продукт успешно создан в БД:', productId);
      
      // Создаем связь с кабинетом
      try {
        await prisma.productCabinet.create({
          data: {
            productId: product.id,
            cabinetId: productData.cabinetId,
            isSelected: true
          }
        });
        console.log('✅ Связь с кабинетом создана');
      } catch (cabinetError) {
        console.warn('⚠️ Ошибка создания связи с кабинетом:', cabinetError);
      }
    } catch (dbError) {
      console.error('❌ Ошибка создания продукта в БД:', dbError);
      return NextResponse.json({ 
        error: 'Ошибка создания продукта в базе данных',
        details: dbError instanceof Error ? dbError.message : 'Неизвестная ошибка'
      }, { status: 500 });
    }

    // Обработка изображений
    let mainImageUrl = null;
    let additionalImageUrls = [];
    
    if (productData.mainImage) {
      console.log('🖼️ Обработка главного изображения...');
      try {
        mainImageUrl = await uploadService.uploadFile(productData.mainImage);
        console.log('✅ Главное изображение загружено:', mainImageUrl);
      } catch (imageError) {
        console.error('❌ Ошибка загрузки главного изображения:', imageError);
        return NextResponse.json({ 
          error: 'Ошибка загрузки главного изображения',
          details: imageError instanceof Error ? imageError.message : 'Неизвестная ошибка'
        }, { status: 500 });
      }
    }

    // Обработка дополнительных изображений
    if (productData.additionalImagesCount > 0) {
      console.log(`🖼️ Обработка ${productData.additionalImagesCount} дополнительных изображений...`);
      
      for (let i = 0; i < productData.additionalImagesCount; i++) {
        const additionalImage = formData.get(`additionalImage${i}`) as File;
        if (additionalImage) {
          try {
            const additionalImageUrl = await uploadService.uploadFile(additionalImage);
            additionalImageUrls.push(additionalImageUrl);
            console.log(`✅ Дополнительное изображение ${i + 1} загружено:`, additionalImageUrl);
          } catch (imageError) {
            console.warn(`⚠️ Ошибка загрузки дополнительного изображения ${i + 1}:`, imageError);
          }
        }
      }
    }
    
    // Обновляем URL изображения в БД
    if (mainImageUrl) {
      try {
        await prisma.product.update({
          where: { id: productId },
          data: { originalImage: mainImageUrl }
        });
        console.log('✅ URL главного изображения обновлен в БД');
      } catch (updateError) {
        console.warn('⚠️ Ошибка обновления URL изображения в БД:', updateError);
      }
    }

    // Запускаем Enhanced System для анализа продукта
    console.log('🚀 Запуск Enhanced System для анализа продукта...');
    console.log('🔍 [API] Передаем в Enhanced System данные о категории:', {
      categoryId: parseInt(productData.categoryId),
      categoryName: productData.categoryName,
      parentCategoryName: productData.parentCategoryName,
      categoryIdType: typeof productData.categoryId,
      categoryIdValue: productData.categoryId
    });
    
    let enhancedResult = null;
    try {
      // Подготавливаем характеристики для ИИ в правильном формате
      const characteristicsForAI = categoryCharacteristics.map(char => ({
        id: char.wbCharacteristicId || char.id,
        name: char.name,
        type: char.type,
        isRequired: char.isRequired,
        description: char.description,
        maxLength: char.maxLength,
        minValue: char.minValue,
        maxValue: char.maxValue,
        values: (char.values || []).map(v => ({
          id: v.wbValueId || v.id,
          value: v.value,
          displayName: v.displayName || v.value
        }))
      }));

      enhancedResult = await enhancedCharacteristicsIntegrationService.analyzeProductWithEnhancedSystem({
        productName: productData.name,
        productImages: [mainImageUrl, ...additionalImageUrls].filter((url): url is string => url !== null),
        categoryId: parseInt(productData.categoryId),
        packageContents: productData.packageContents,
        referenceUrl: productData.referenceUrl || '',
        price: parseFloat(productData.discountPrice),
        dimensions: {
          length: parseFloat(productData.length),
          width: parseFloat(productData.width),
          height: parseFloat(productData.height),
          weight: parseFloat(productData.weight)
        },
        hasVariantSizes: productData.hasVariantSizes,
        variantSizes: productData.variantSizes,
        aiPromptComment: productData.imageComments || '',
        // ПЕРЕДАЕМ ХАРАКТЕРИСТИКИ КАТЕГОРИИ В ИИ
        additionalCharacteristics: characteristicsForAI,
        preserveUserData: {
          preserveUserData: true,
          userProvidedPackageContents: productData.packageContents,
          userProvidedDimensions: {
            length: parseFloat(productData.length),
            width: parseFloat(productData.width),
            height: parseFloat(productData.height),
            weight: parseFloat(productData.weight)
          },
          specialInstructions: `
            КРИТИЧЕСКИ ВАЖНО - ЗАПОЛНЯЙ ТОЛЬКО ЭТИ ХАРАКТЕРИСТИКИ:
            
            ДОСТУПНЫЕ ХАРАКТЕРИСТИКИ (${characteristicsForAI.length} шт):
            ${characteristicsForAI.map(char => 
              `- ${char.name} (ID: ${char.id}, тип: ${char.type.toUpperCase()}${char.isRequired ? ', ОБЯЗАТЕЛЬНАЯ' : ''})`
            ).join('\n            ')}
            
            НЕ ИЗМЕНЯЙ:
            1. Комплектация: "${productData.packageContents}"
            2. Вес товара: ${productData.weight} кг  
            3. Размеры: ${productData.length}×${productData.width}×${productData.height} см
            
            ЗАПОЛНЯЙ ТОЛЬКО:
            - Характеристики из списка выше
            - НЕ придумывай новые характеристики
            - НЕ заполняй габаритные характеристики
            - НЕ заполняй характеристики цвета
            
            ЦЕЛЬ: Заполнить максимум характеристик ИЗ ДОСТУПНОГО СПИСКА!
          `
        }
      });
      
      console.log('Enhanced System завершена успешно');
      console.log(`   - Характеристик заполнено: ${enhancedResult.characteristics.length}`);
      console.log(`   - Качество анализа: ${enhancedResult.qualityMetrics.overallScore}%`);
      console.log(`   - Уверенность: ${enhancedResult.confidence}%`);
    } catch (enhancedError) {
      console.error('Ошибка Enhanced System:', enhancedError);
      
      // Fallback: создаем базовый продукт без AI анализа
      console.log('Fallback: создаем продукт без AI анализа');
      
      try {
        await prisma.product.update({
          where: { id: productId },
          data: {
            status: 'DRAFT',
            errorMessage: `Enhanced System недоступна: ${enhancedError instanceof Error ? enhancedError.message : 'Неизвестная ошибка'}. Продукт создан в базовом режиме.`
          }
        });
        console.log('Продукт создан в базовом режиме (DRAFT)');
      } catch (fallbackError) {
        console.error('Ошибка fallback обновления:', fallbackError);
      }
    }

    // Сохраняем результаты AI анализа в БД (если есть)
    if (enhancedResult) {
      try {
        await prisma.product.update({
          where: { id: productId },
          data: {
            status: 'READY',
            generatedName: enhancedResult.seoTitle,
            seoDescription: enhancedResult.seoDescription,
            aiCharacteristics: toPrismaJson({
              characteristics: enhancedResult.characteristics,
              keywords: enhancedResult.suggestedKeywords || [],
              advantages: enhancedResult.competitiveAdvantages || [],
              tnvedCode: enhancedResult.tnvedCode,
              confidence: enhancedResult.confidence,
              warnings: enhancedResult.warnings || [],
              qualityScore: enhancedResult.qualityMetrics.overallScore,
              recommendations: enhancedResult.recommendations,
              analysisReport: enhancedResult.analysisReport,
              qualityMetrics: enhancedResult.qualityMetrics
            })
          }
        });
        console.log('Результаты AI анализа сохранены в БД');
      } catch (aiUpdateError) {
        console.warn('Ошибка сохранения AI анализа в БД:', aiUpdateError);
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`Продукт успешно обработан за ${processingTime}мс`);

    return NextResponse.json({
      success: true,
      message: 'Продукт успешно создан и проанализирован',
      productId,
      processingTime,
      data: {
        name: productData.name,
        vendorCode: productData.vendorCode,
        barcode: productData.barcode,
        price: {
          original: parseFloat(productData.originalPrice),
          discount: parseFloat(productData.discountPrice)
        },
        category: {
          id: productData.categoryId,
          name: productData.categoryName,
          parentName: productData.parentCategoryName
        },
        dimensions: {
          length: parseFloat(productData.length),
          width: parseFloat(productData.width),
          height: parseFloat(productData.height),
          weight: parseFloat(productData.weight)
        },
        packageContents: productData.packageContents,
        hasVariantSizes: productData.hasVariantSizes,
        variantSizes: productData.variantSizes
      }
    });

  } catch (error) {
    console.error('Критическая ошибка создания продукта:', error);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Улучшенная обработка различных типов ошибок
    let errorMessage = 'Внутренняя ошибка сервера';
    let errorDetails = '';
    let suggestion = 'Попробуйте позже или обратитесь в поддержку';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('connection')) {
        errorMessage = 'Проблемы с подключением к серверу';
        suggestion = 'Проверьте интернет-соединение и попробуйте снова';
      } else if (error.message.includes('database') || error.message.includes('prisma')) {
        errorMessage = 'Ошибка базы данных';
        suggestion = 'Попробуйте позже или обратитесь в поддержку';
      } else if (error.message.includes('validation') || error.message.includes('parse')) {
        errorMessage = 'Ошибка валидации данных';
        suggestion = 'Проверьте правильность введенных данных';
      } else if (error.message.includes('upload') || error.message.includes('file')) {
        errorMessage = 'Ошибка загрузки файлов';
        suggestion = 'Проверьте размер и формат файлов';
      } else {
        errorDetails = error.message;
      }
    }

    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      suggestion,
      processingTime
    }, { status: 500 });
  }
}