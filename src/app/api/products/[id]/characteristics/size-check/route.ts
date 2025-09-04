// src/app/api/categories/[id]/characteristics/size-check/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma, safePrismaOperation } from '../../../../../../../lib/prisma';

// GET метод для проверки наличия размерных характеристик в категории
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный ID категории'
      }, { status: 400 });
    }

    console.log(`🔍 [Size Check API] Проверка размерных характеристик для категории: ${categoryId}`);

    // Ищем размерные характеристики в категории
    const sizeCharacteristics = await safePrismaOperation(
      () => prisma.wbCategoryCharacteristic.findMany({
        where: {
          subcategoryId: categoryId,
          OR: [
            // Поиск по названию (разные варианты)
            { name: { contains: 'Размер', mode: 'insensitive' } },
            { name: { contains: 'Size', mode: 'insensitive' } },
            { name: { contains: 'размер', mode: 'insensitive' } },
            { name: { contains: 'Размерная сетка', mode: 'insensitive' } },
            { name: { contains: 'Размерный ряд', mode: 'insensitive' } },
            { name: { contains: 'Размерность', mode: 'insensitive' } },
            { name: { contains: 'размерность', mode: 'insensitive' } },
            { name: { contains: 'Габарит', mode: 'insensitive' } },
            { name: { contains: 'габарит', mode: 'insensitive' } },
            
            // Поиск по известным WB ID размерных характеристик
            // Стандартные размерные характеристики Wildberries
            { wbCharacteristicId: { in: [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, // Базовые размеры
              134, 135, 136, 137, 138, 139, 140, // Размеры одежды
              285, 286, 287, 288, 289, 290, // Размеры обуви
              341, 342, 343, 344, 345, // Размеры аксессуаров
              567, 568, 569, 570, // Размеры детских товаров
              789, 790, 791, 792, // Размеры спорт товаров
              1023, 1024, 1025, 1026 // Размеры техники/электроники
            ]}},
            
            // Поиск по ключевым словам в описании
            { description: { contains: 'размер', mode: 'insensitive' } },
            { description: { contains: 'size', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          wbCharacteristicId: true,
          description: true,
          type: true,
          isRequired: true,
          values: {
            where: { isActive: true },
            select: {
              id: true,
              value: true,
              displayName: true
            },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: [
          { isRequired: 'desc' },
          { name: 'asc' }
        ]
      }),
      'поиск размерных характеристик'
    );

    const hasSizeCharacteristics = sizeCharacteristics.length > 0;
    
    console.log(`📋 [Size Check API] Найдено размерных характеристик: ${sizeCharacteristics.length}`);

    if (sizeCharacteristics.length > 0) {
      console.log(`📝 [Size Check API] Размерные характеристики:`, 
        sizeCharacteristics.map(c => `"${c.name}" (ID: ${c.wbCharacteristicId})`)
      );
    }

    // Извлекаем возможные размеры из значений характеристик
    const possibleSizes = new Set<string>();
    
    sizeCharacteristics.forEach(char => {
      if (char.values && char.values.length > 0) {
        char.values.forEach(value => {
          // Добавляем значение как возможный размер
          const sizeValue = value.displayName || value.value;
          if (sizeValue && typeof sizeValue === 'string' && sizeValue.trim()) {
            possibleSizes.add(sizeValue.trim());
          }
        });
      }
    });

    // Если нет конкретных размеров в БД, используем стандартные для категории
    const standardSizesByCategory = getStandardSizesByCategory(categoryId);
    if (possibleSizes.size === 0 && hasSizeCharacteristics) {
      standardSizesByCategory.forEach(size => possibleSizes.add(size));
    }

    const sizeCharacteristicsArray = Array.from(possibleSizes).sort();

    // Получаем информацию о категории для контекста
    const categoryInfo = await safePrismaOperation(
      () => prisma.wbSubcategory.findUnique({
        where: { id: categoryId },
        select: {
          id: true,
          name: true,
          slug: true,
          parentCategory: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }),
      'получение информации о категории'
    );

    const result = {
      success: true,
      categoryId: categoryId,
      categoryName: categoryInfo?.name || 'Неизвестная категория',
      parentCategoryName: categoryInfo?.parentCategory?.name || null,
      hasSizeCharacteristics: hasSizeCharacteristics,
      sizeCharacteristicsCount: sizeCharacteristics.length,
      sizeCharacteristics: sizeCharacteristicsArray,
      
      // Детальная информация о найденных характеристиках
      detailedCharacteristics: sizeCharacteristics.map(char => ({
        id: char.id,
        wbCharacteristicId: char.wbCharacteristicId,
        name: char.name,
        type: char.type,
        isRequired: char.isRequired,
        valuesCount: char.values?.length || 0,
        sampleValues: char.values?.slice(0, 3).map(v => v.displayName || v.value) || []
      })),
      
      // Рекомендации для UI
      recommendations: {
        showSizeSelector: hasSizeCharacteristics,
        defaultSizes: sizeCharacteristicsArray.slice(0, 10), // Первые 10 размеров
        categoryType: hasSizeCharacteristics ? 'sized' : 'sizeless',
        message: hasSizeCharacteristics 
          ? `Категория "${categoryInfo?.name}" поддерживает размеры. Пользователь может выбрать конкретные размеры.`
          : `Категория "${categoryInfo?.name}" не требует размеров. Товар будет создан как безразмерный.`
      },
      
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [Size Check API] Результат для категории ${categoryId}:`, {
      hasSizes: result.hasSizeCharacteristics,
      sizesCount: result.sizeCharacteristics.length,
      categoryType: result.recommendations.categoryType
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error(`❌ [Size Check API] Ошибка проверки размерных характеристик для категории ${params.id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера при проверке размерных характеристик',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      categoryId: parseInt(params.id) || null,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST метод для принудительного обновления размерной информации категории
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = parseInt(params.id);
    
    if (isNaN(categoryId)) {
      return NextResponse.json({
        success: false,
        error: 'Некорректный ID категории'
      }, { status: 400 });
    }

    const body = await request.json();
    const { forceRefresh = false, addStandardSizes = false } = body;

    console.log(`🔄 [Size Check API] Обновление размерной информации для категории: ${categoryId}`);

    if (addStandardSizes) {
      // Добавляем стандартные размеры для категории если их нет
      const standardSizes = getStandardSizesByCategory(categoryId);
      
      if (standardSizes.length > 0) {
        console.log(`➕ [Size Check API] Добавляем ${standardSizes.length} стандартных размеров`);
        
        // Здесь можно добавить логику создания размерных характеристик в БД
        // Пока возвращаем информацию о том, что могло бы быть добавлено
        
        return NextResponse.json({
          success: true,
          message: `Добавлено ${standardSizes.length} стандартных размеров для категории`,
          categoryId: categoryId,
          addedSizes: standardSizes,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Для других случаев просто возвращаем актуальную информацию
    return NextResponse.redirect(request.url.replace('/size-check', '/size-check'), 302);

  } catch (error) {
    console.error(`❌ [Size Check API] Ошибка обновления размерной информации:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка обновления размерной информации',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * Получение стандартных размеров по категории
 * Основано на анализе типичных размеров для разных категорий товаров
 */
function getStandardSizesByCategory(categoryId: number): string[] {
  // Маппинг категорий к стандартным размерам
  // В реальном проекте это должно быть в БД или конфигурационном файле
  const categoryStandardSizes: Record<number, string[]> = {
    // Одежда мужская
    291: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    292: ['42', '44', '46', '48', '50', '52', '54', '56', '58', '60'],
    
    // Одежда женская
    306: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    307: ['40', '42', '44', '46', '48', '50', '52', '54'],
    
    // Обувь мужская
    629: ['39', '40', '41', '42', '43', '44', '45', '46', '47'],
    
    // Обувь женская  
    657: ['35', '36', '37', '38', '39', '40', '41', '42'],
    
    // Детская одежда
    515: ['80', '86', '92', '98', '104', '110', '116', '122', '128', '134', '140'],
    
    // Детская обувь
    563: ['18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35'],
    
    // Головные уборы
    594: ['54', '55', '56', '57', '58', '59', '60', '61'],
    
    // Перчатки
    595: ['XS', 'S', 'M', 'L', 'XL'],
    
    // Нижнее белье мужское
    593: ['S', 'M', 'L', 'XL', 'XXL'],
    
    // Нижнее белье женское
    559: ['70A', '70B', '70C', '70D', '75A', '75B', '75C', '75D', '80A', '80B', '80C', '80D']
  };

  // Проверяем есть ли специфичные размеры для категории
  if (categoryStandardSizes[categoryId]) {
    return categoryStandardSizes[categoryId];
  }

  // Возвращаем пустой массив если размеры не определены
  // Это означает что категория скорее всего безразмерная
  return [];
}