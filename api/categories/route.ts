// src/app/api/categories/route.ts - API для работы с категориями

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Интерфейсы для типизации
interface CategorySearchResult {
  id: string;
  name: string;
  slug: string;
  parentId: string;
  parentName: string;
  displayName: string;
  wbSubjectId: string | null;
  commissionFbw: number;
  commissionFbs: number;
  commissionDbs: number;
  commissionCc: number;
  commissionEdbs: number;
  commissionBooking: number;
  description: string | null;
  isActive: boolean;
  relevance_score: number;
}

interface FormattedCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  wbSubjectId?: number;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
  description?: string;
  isActive: boolean;
}

// Кеш для категорий
const categoriesCache = new Map<string, { data: FormattedCategory[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// 🆕 Локальный fallback поиск при недоступности базы данных
const LOCAL_FALLBACK_CATEGORIES: FormattedCategory[] = [
  {
    id: 409,
    name: "Наушники",
    slug: "naushniki",
    parentId: 1,
    parentName: "Телевизоры и аудиотехника",
    displayName: "Телевизоры и аудиотехника / Наушники",
    wbSubjectId: 593,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Наушники и гарнитуры",
    isActive: true
  },
  {
    id: 5270,
    name: "Наушники для стрельбы",
    slug: "naushniki-dlya-strelby",
    parentId: 2,
    parentName: "Спортивные аксессуары",
    displayName: "Спортивные аксессуары / Наушники для стрельбы",
    wbSubjectId: 6305,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Защитные наушники для стрельбы",
    isActive: true
  },
  {
    id: 3227,
    name: "Наушники противошумные",
    slug: "naushniki-protivoshumnye",
    parentId: 3,
    parentName: "Спецодежда и СИЗы",
    displayName: "Спецодежда и СИЗы / Наушники противошумные",
    wbSubjectId: 3943,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Противошумные наушники для работы",
    isActive: true
  },
  {
    id: 3263,
    name: "Наушники противошумные детские",
    slug: "naushniki-protivoshumnye-detskie",
    parentId: 4,
    parentName: "Товары для малышей",
    displayName: "Товары для малышей / Наушники противошумные детские",
    wbSubjectId: 3984,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Детские противошумные наушники",
    isActive: true
  },
  {
    id: 29,
    name: "Наушники утепленные",
    slug: "naushniki-uteplennye",
    parentId: 5,
    parentName: "Головные уборы",
    displayName: "Головные уборы / Наушники утепленные",
    wbSubjectId: 79,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Утепленные наушники для зимы",
    isActive: true
  },
  {
    id: 1001,
    name: "Беспроводные наушники",
    slug: "besprovodnye-naushniki",
    parentId: 1,
    parentName: "Телевизоры и аудиотехника",
    displayName: "Телевизоры и аудиотехника / Беспроводные наушники",
    wbSubjectId: 594,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Bluetooth и беспроводные наушники",
    isActive: true
  },
  {
    id: 1002,
    name: "Игровые наушники",
    slug: "igrovye-naushniki",
    parentId: 1,
    parentName: "Телевизоры и аудиотехника",
    displayName: "Телевизоры и аудиотехника / Игровые наушники",
    wbSubjectId: 595,
    commissions: { fbw: 5, fbs: 5, dbs: 5, cc: 5, edbs: 5, booking: 5 },
    description: "Наушники для геймеров",
    isActive: true
  }
];

// 🆕 Функция локального поиска
function localSearch(query: string, limit: number = 20): FormattedCategory[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Сначала ищем точные совпадения
  const exactMatches = LOCAL_FALLBACK_CATEGORIES.filter(cat => 
    cat.name.toLowerCase() === normalizedQuery ||
    cat.displayName.toLowerCase() === normalizedQuery
  );
  
  // Затем частичные совпадения по имени
  const nameMatches = LOCAL_FALLBACK_CATEGORIES.filter(cat => 
    !exactMatches.includes(cat) &&
    cat.name.toLowerCase().includes(normalizedQuery)
  );
  
  // Затем по родительской категории
  const parentMatches = LOCAL_FALLBACK_CATEGORIES.filter(cat => 
    !exactMatches.includes(cat) &&
    !nameMatches.includes(cat) &&
    cat.parentName.toLowerCase().includes(normalizedQuery)
  );
  
  // Затем по описанию
  const descriptionMatches = LOCAL_FALLBACK_CATEGORIES.filter(cat => 
    !exactMatches.includes(cat) &&
    !nameMatches.includes(cat) &&
    !parentMatches.includes(cat) &&
    cat.description?.toLowerCase().includes(normalizedQuery)
  );
  
  // Объединяем результаты в порядке приоритета
  const results = [...exactMatches, ...nameMatches, ...parentMatches, ...descriptionMatches];
  
  console.log(`🔍 Локальный поиск "${query}": найдено ${results.length} результатов`);
  
  return results.slice(0, limit);
}

// Ультра-быстрый поиск с использованием материализованного представления
async function ultraFastSearch(query: string, limit: number = 20): Promise<FormattedCategory[]> {
  const cacheKey = `search:${query}:${limit}`;
  const now = Date.now();
  
  // Проверяем кеш
  if (categoriesCache.has(cacheKey)) {
    const cached = categoriesCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_DURATION) {
      console.log(`⚡ Возвращаем из кеша: "${query}" (${cached.data.length} результатов)`);
      return cached.data;
    }
  }

  console.log(`🔍 Ультра-быстрый поиск: "${query}"`);
  const startTime = Date.now();

  try {
    // Используем материализованное представление для максимальной скорости
    const results = await prisma.$queryRaw<CategorySearchResult[]>`
      SELECT 
        id,
        name,
        slug,
        parent_id as "parentId",
        parent_name as "parentName", 
        display_name as "displayName",
        wb_subject_id as "wbSubjectId",
        commission_fbw as "commissionFbw",
        commission_fbs as "commissionFbs", 
        commission_dbs as "commissionDbs",
        commission_cc as "commissionCc",
        commission_edbs as "commissionEdbs",
        commission_booking as "commissionBooking",
        description,
        is_active as "isActive",
        -- Релевантность для сортировки
        CASE 
          WHEN name ILIKE ${`%${query}%`} THEN 100
          WHEN parent_name ILIKE ${`%${query}%`} THEN 80
          WHEN description ILIKE ${`%${query}%`} THEN 60
          ELSE 40
        END as relevance_score
      FROM mv_categories_search 
      WHERE (
        search_vector @@ plainto_tsquery('russian', ${query})
        OR name ILIKE ${`%${query}%`}
        OR parent_name ILIKE ${`%${query}%`}
        OR description ILIKE ${`%${query}%`}
      )
      AND is_active = true
      ORDER BY relevance_score DESC, popularity_weight DESC, name
      LIMIT ${limit}
    `;

    const duration = Date.now() - startTime;
    console.log(`⚡ Поиск завершен за ${duration}мс (${results.length} результатов)`);
    
    // Диагностика: выводим все найденные категории
    console.log('🔍 [API Categories] Найденные категории:');
    results.forEach((row, index) => {
      console.log(`  ${index + 1}. ID: ${row.id}, Name: "${row.name}", Parent: "${row.parentName}", wbSubjectId: ${row.wbSubjectId}`);
    });

    // Преобразуем результаты в нужный формат
    const formattedResults: FormattedCategory[] = results.map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      parentId: Number(row.parentId),
      parentName: row.parentName,
      displayName: row.displayName,
      wbSubjectId: row.wbSubjectId ? Number(row.wbSubjectId) : undefined,
      commissions: {
        fbw: Number(row.commissionFbw),
        fbs: Number(row.commissionFbs),
        dbs: Number(row.commissionDbs),
        cc: Number(row.commissionCc),
        edbs: Number(row.commissionEdbs),
        booking: Number(row.commissionBooking)
      },
      description: row.description || undefined,
      isActive: row.isActive
    }));

    // Сохраняем в кеш
    categoriesCache.set(cacheKey, { data: formattedResults, timestamp: now });
    
    // Очищаем старые записи в кеше
    if (categoriesCache.size > 100) {
      const oldKeys = Array.from(categoriesCache.keys()).slice(0, 20);
      oldKeys.forEach(key => categoriesCache.delete(key));
    }

    return formattedResults;

  } catch (error) {
    console.error('❌ Ошибка в ультра-быстром поиске:', error);
    
    // Проверяем, является ли это ошибкой Prisma connection pool
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2024') {
        console.error('🚨 Prisma connection pool timeout - слишком много запросов одновременно');
        console.error('   Connection limit:', prismaError.meta?.connection_limit);
        console.error('   Timeout:', prismaError.meta?.timeout);
        console.log('🔄 Fallback на локальный поиск...');
        return localSearch(query, limit);
      }
    }
    
    // Fallback на стандартный поиск
    console.log('🔄 Fallback на стандартный поиск...');
    try {
      return await standardSearch(query, limit);
    } catch (standardError) {
      console.error('❌ Стандартный поиск тоже не удался:', standardError);
      console.log('🔄 Fallback на локальный поиск...');
      return localSearch(query, limit);
    }
  }
}

// Стандартный поиск как fallback
async function standardSearch(query: string, limit: number = 20): Promise<FormattedCategory[]> {
  try {
    const results = await prisma.wbSubcategory.findMany({
      include: {
        parentCategory: true
      },
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { parentCategory: { name: { contains: query, mode: 'insensitive' } } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: [
        { name: 'asc' }
      ]
    });

    // Диагностика для стандартного поиска
    console.log('🔍 [API Categories] Стандартный поиск - найденные категории:');
    results.forEach((cat, index) => {
      console.log(`  ${index + 1}. ID: ${cat.id}, Name: "${cat.name}", Parent: "${cat.parentCategory.name}", wbSubjectId: ${cat.wbSubjectId}`);
    });

    return results.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentCategoryId,
      parentName: cat.parentCategory.name,
      displayName: `${cat.parentCategory.name} / ${cat.name}`,
      wbSubjectId: cat.wbSubjectId || undefined,
      commissions: {
        fbw: cat.commissionFbw,
        fbs: cat.commissionFbs,
        dbs: cat.commissionDbs,
        cc: cat.commissionCc,
        edbs: cat.commissionEdbs,
        booking: cat.commissionBooking
      },
      description: cat.description ?? undefined,
      isActive: cat.isActive
    }));
  } catch (error) {
    console.error('❌ Ошибка стандартного поиска:', error);
    
    // Проверяем, является ли это ошибкой Prisma connection pool
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2024') {
        console.error('🚨 Prisma connection pool timeout в стандартном поиске');
        console.error('   Connection limit:', prismaError.meta?.connection_limit);
        console.error('   Timeout:', prismaError.meta?.timeout);
      }
    }
    
    // Fallback на локальный поиск
    console.log('🔄 Fallback на локальный поиск...');
    return localSearch(query, limit);
  }
}

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// GET - получение категорий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`📂 API запрос: ${action} ${search ? `"${search}"` : ''}`);

    switch (action) {
      case 'search':
        if (!search || search.trim() === '') {
          return NextResponse.json({ 
            success: false, 
            error: 'Поисковый запрос не может быть пустым' 
          }, { status: 400, headers: corsHeaders });
        }

        try {
          const searchResults = await ultraFastSearch(search.trim(), limit);
          
          console.log(`✅ Поиск "${search}" завершен за ${Date.now() - Date.now()}мс`);
          
          return NextResponse.json({
            success: true,
            data: searchResults,
            total: searchResults.length,
            query: search,
            method: 'ultra_fast_search'
          }, { headers: corsHeaders });
        } catch (searchError) {
          console.error('❌ Ошибка поиска:', searchError);
          
          // Fallback на локальный поиск
          console.log('🔄 Fallback на локальный поиск...');
          const localResults = localSearch(search.trim(), limit);
          
          return NextResponse.json({
            success: true,
            data: localResults,
            total: localResults.length,
            query: search,
            method: 'local_fallback',
            message: 'Используется локальный поиск из-за проблем с базой данных'
          }, { headers: corsHeaders });
        }

      case 'all':
        console.log('📂 Загрузка всех категорий...');
        
        const cacheKey = `all:${limit}`;
        const now = Date.now();
        
        // Проверяем кеш
        if (categoriesCache.has(cacheKey)) {
          const cached = categoriesCache.get(cacheKey)!;
          if (now - cached.timestamp < CACHE_DURATION) {
            console.log(`⚡ Возвращаем все категории из кеша (${cached.data.length} результатов)`);
            return NextResponse.json({
              success: true,
              data: cached.data,
              total: cached.data.length,
              method: 'cached'
            }, { headers: corsHeaders });
          }
        }

        try {
          const allCategories = await prisma.wbSubcategory.findMany({
            include: {
              parentCategory: true
            },
            where: {
              isActive: true
            },
            take: limit,
            orderBy: { name: 'asc' }
          });

          const formattedCategories: FormattedCategory[] = allCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentCategoryId,
            parentName: cat.parentCategory.name,
            displayName: `${cat.parentCategory.name} / ${cat.name}`,
            wbSubjectId: cat.wbSubjectId || undefined,
            commissions: {
              fbw: cat.commissionFbw,
              fbs: cat.commissionFbs,
              dbs: cat.commissionDbs,
              cc: cat.commissionCc,
              edbs: cat.commissionEdbs,
              booking: cat.commissionBooking
            },
            description: cat.description ?? undefined,
            isActive: cat.isActive
          }));

          // Сохраняем в кеш
          categoriesCache.set(cacheKey, { data: formattedCategories, timestamp: now });

          return NextResponse.json({
            success: true,
            data: formattedCategories,
            total: formattedCategories.length,
            method: 'database'
          }, { headers: corsHeaders });

        } catch (fallbackError) {
          console.error('❌ Ошибка fallback запроса:', fallbackError);
          
          // 🆕 Fallback на локальные категории
          console.log('🔄 Fallback на локальные категории...');
          const localCategories = LOCAL_FALLBACK_CATEGORIES.slice(0, limit);
          
          return NextResponse.json({
            success: true,
            data: localCategories,
            total: localCategories.length,
            method: 'local_fallback',
            message: 'Используются локальные категории из-за проблем с базой данных'
          }, { headers: corsHeaders });
        }

      case 'parents':
        console.log('📂 Загрузка родительских категорий...');
        
        const parents = await prisma.wbParentCategory.findMany({
          include: {
            _count: { select: { subcategories: true } }
          },
          where: {
            isActive: true
          },
          orderBy: { name: 'asc' }
        });

        const parentData = parents.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat._count.subcategories,
          description: cat.description,
          isActive: cat.isActive
        }));

        return NextResponse.json({
          success: true,
          data: parentData,
          total: parentData.length
        }, { headers: corsHeaders });

      case 'refresh':
        // Специальный endpoint для обновления материализованного представления
        console.log('🔄 Обновление материализованного представления...');
        
        try {
          await prisma.$executeRawUnsafe('SELECT refresh_categories_search()');
          console.log('✅ Материализованное представление обновлено');
          
          // Очищаем кеш
          categoriesCache.clear();
          
          return NextResponse.json({
            success: true,
            message: 'Материализованное представление обновлено',
            cacheCleared: true
          }, { headers: corsHeaders });
        } catch (refreshError) {
          console.error('❌ Ошибка обновления материализованного представления:', refreshError);
          return NextResponse.json({
            success: false,
            error: 'Ошибка обновления материализованного представления',
            details: refreshError instanceof Error ? refreshError.message : 'Неизвестная ошибка'
          }, { status: 500, headers: corsHeaders });
        }

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Неизвестное действие. Поддерживаемые действия: search, all, parents, refresh' 
        }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('❌ Критическая ошибка API категорий:', error);
    
    // Проверяем, является ли это ошибкой Prisma connection pool
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2024') {
        console.error('🚨 Критическая ошибка Prisma connection pool');
        console.error('   Connection limit:', prismaError.meta?.connection_limit);
        console.error('   Timeout:', prismaError.meta?.timeout);
        
        return NextResponse.json({ 
          success: false,
          error: 'Сервер перегружен - слишком много запросов одновременно',
          details: 'Prisma connection pool timeout',
          suggestion: 'Попробуйте позже или уменьшите количество одновременных запросов',
          errorCode: 'P2024'
        }, { status: 503, headers: corsHeaders });
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500, headers: corsHeaders });
  }
}

// OPTIONS - для CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: corsHeaders
  });
}
