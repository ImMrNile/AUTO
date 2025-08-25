// src/app/api/cabinets/route.ts - Полный роутер для кабинетов

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { AuthService } from './../../../../lib/auth/auth-service';

// Новые базовые URL API Wildberries 2025
const WB_API_ENDPOINTS = {
  content: 'https://content-api.wildberries.ru',
  marketplace: 'https://marketplace-api.wildberries.ru',
  statistics: 'https://statistics-api.wildberries.ru',
  prices: 'https://discounts-prices-api.wildberries.ru'
};

export async function GET() {
  try {
    console.log('🔍 [API Cabinets] === НАЧАЛО GET /api/cabinets ===');
    
    // Проверяем авторизацию
    console.log('🔍 [API Cabinets] Проверка авторизации...');
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      console.log('❌ [API Cabinets] User not authenticated');
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован',
        suggestion: 'Войдите в систему для просмотра кабинетов',
        cabinets: []
      }, { status: 401 });
    }

    console.log('✅ [API Cabinets] User authenticated:', { 
      id: user.id, 
      email: user.email,
      role: user.role
    });

    // Получаем кабинеты из базы данных
    console.log('🔍 [API Cabinets] Загрузка кабинетов из БД...');
    
    const cabinets = await prisma.cabinet.findMany({
      where: { 
        userId: user.id
      },
      include: {
        productCabinets: {
          include: {
            product: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ [API Cabinets] Кабинеты загружены из БД:', {
      count: cabinets.length,
      cabinets: cabinets.map(c => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        productCount: c.productCabinets.length
      }))
    });

    // Обрабатываем кабинеты и добавляем статистику
    const cabinetsWithStats = cabinets.map(cabinet => ({
      id: cabinet.id,
      userId: cabinet.userId,
      name: cabinet.name,
      description: cabinet.description,
      apiToken: maskToken(cabinet.apiToken || ''),
      isActive: cabinet.isActive,
      createdAt: cabinet.createdAt,
      updatedAt: cabinet.updatedAt,
      stats: {
        totalProducts: cabinet.productCabinets.length,
        publishedProducts: cabinet.productCabinets.filter(pc => 
          pc.product.status === 'PUBLISHED'
        ).length,
        processingProducts: cabinet.productCabinets.filter(pc => 
          pc.product.status === 'PROCESSING' || pc.product.status === 'PUBLISHING'
        ).length
      }
    }));

    console.log('✅ [API Cabinets] Отправляем ответ с кабинетами:', {
      count: cabinetsWithStats.length,
      activeCount: cabinetsWithStats.filter(c => c.isActive).length
    });

    return NextResponse.json({
      success: true,
      cabinets: cabinetsWithStats,
      total: cabinets.length,
      meta: {
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [API Cabinets] Критическая ошибка:', error);
    
    let errorMessage = 'Ошибка при получении кабинетов';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Не удается подключиться к базе данных';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышен таймаут подключения к базе данных';
        statusCode = 504;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      cabinets: []
    }, { status: statusCode });
  }
}

// POST - добавить новый кабинет
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [API Cabinets] === НАЧАЛО POST /api/cabinets ===');
    
    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован',
        suggestion: 'Войдите в систему для создания кабинета'
      }, { status: 401 });
    }

    // Парсим данные запроса
    let name: string | undefined;
    let apiToken: string | undefined;
    let description: string | undefined;
    let skipValidation: boolean | undefined;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      name = body.name;
      apiToken = body.apiToken || body.token || body.api_key;
      description = body.description;
      skipValidation = body.skipValidation === true || body.skipValidation === 'true';
    } else {
      const form = await request.formData();
      name = (form.get('name') as string) || undefined;
      apiToken = (form.get('apiToken') as string) || (form.get('token') as string) || undefined;
      description = (form.get('description') as string) || undefined;
      const sv = form.get('skipValidation');
      const svStr = typeof sv === 'string' ? sv : '';
      skipValidation = svStr === 'true' || svStr === '1' || svStr === 'on';
    }

    // Валидация входных данных
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Название кабинета обязательно и должно быть непустой строкой'
      }, { status: 400 });
    }

    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'API токен обязателен и должен быть непустой строкой'
      }, { status: 400 });
    }

    // Проверяем уникальность названия для данного пользователя
    const existingCabinet = await prisma.cabinet.findFirst({
      where: { 
        name: name.trim(),
        userId: user.id
      }
    });

    if (existingCabinet) {
      return NextResponse.json({
        success: false,
        error: 'У вас уже есть кабинет с таким названием'
      }, { status: 400 });
    }

    // Проверяем валидность токена (если не пропускаем валидацию)
    if (!skipValidation) {
      const validation = await validateWBToken(apiToken.trim());
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.error,
          suggestion: validation.networkError ? 
            'Не удается подключиться к API Wildberries. Проверьте интернет-соединение или добавьте кабинет без проверки токена.' : 
            'Проверьте правильность API токена и его права доступа.',
          canSkipValidation: validation.networkError,
          tokenAnalysis: validation.tokenAnalysis
        }, { status: 400 });
      }
    }

    // Создаем новый кабинет
    const newCabinet = await prisma.cabinet.create({
      data: {
        userId: user.id,
        name: name.trim(),
        apiToken: apiToken.trim(),
        description: description?.trim() || null,
        isActive: true
      }
    });

    console.log('✅ [API Cabinets] Новый кабинет создан:', {
      id: newCabinet.id,
      name: newCabinet.name,
      userId: newCabinet.userId
    });

    return NextResponse.json({
      success: true,
      cabinet: {
        ...newCabinet,
        apiToken: maskToken(newCabinet.apiToken || ''),
        stats: {
          totalProducts: 0,
          publishedProducts: 0,
          processingProducts: 0
        }
      },
      message: skipValidation 
        ? 'Кабинет добавлен без проверки токена' 
        : 'Кабинет успешно добавлен и токен проверен'
    });

  } catch (error) {
    console.error('❌ [API Cabinets] Ошибка при добавлении кабинета:', error);
    
    let errorMessage = 'Ошибка при добавлении кабинета';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Не удается подключиться к базе данных';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышен таймаут подключения к базе данных';
        statusCode = 504;
      } else if (error.message.includes('P2002')) {
        errorMessage = 'Кабинет с таким названием уже существует';
        statusCode = 409;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: statusCode });
  }
}

// PUT - обновить кабинет
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 [API Cabinets] === НАЧАЛО PUT /api/cabinets ===');
    
    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, apiToken, description, isActive, skipValidation } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'ID кабинета обязателен'
      }, { status: 400 });
    }

    // Проверяем, что кабинет принадлежит текущему пользователю
    const cabinet = await prisma.cabinet.findFirst({
      where: { 
        id,
        userId: user.id
      }
    });

    if (!cabinet) {
      return NextResponse.json({
        success: false,
        error: 'Кабинет не найден или у вас нет прав для его редактирования'
      }, { status: 404 });
    }

    // Если обновляется токен, проверяем его валидность
    if (apiToken && apiToken !== cabinet.apiToken && !skipValidation) {
      const validation = await validateWBToken(apiToken.trim());
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.error,
          suggestion: validation.networkError ? 
            'Не удается подключиться к API Wildberries. Обновите кабинет без проверки токена.' : 
            'Проверьте правильность нового API токена.',
          canSkipValidation: validation.networkError
        }, { status: 400 });
      }
    }

    // Проверяем уникальность названия (если изменяется)
    if (name && name !== cabinet.name) {
      const existingCabinet = await prisma.cabinet.findFirst({
        where: { 
          name: name.trim(),
          userId: user.id,
          id: { not: id }
        }
      });

      if (existingCabinet) {
        return NextResponse.json({
          success: false,
          error: 'У вас уже есть кабинет с таким названием'
        }, { status: 400 });
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (name !== undefined && name !== null) {
      updateData.name = name.trim();
    }
    
    if (apiToken !== undefined && apiToken !== null) {
      updateData.apiToken = apiToken.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (typeof isActive !== 'undefined') {
      updateData.isActive = isActive;
    }

    // Обновляем кабинет
    const updatedCabinet = await prisma.cabinet.update({
      where: { id },
      data: updateData
    });

    console.log('✅ [API Cabinets] Кабинет обновлен:', {
      id: updatedCabinet.id,
      name: updatedCabinet.name
    });

    return NextResponse.json({
      success: true,
      cabinet: {
        ...updatedCabinet,
        apiToken: maskToken(updatedCabinet.apiToken || ''),
        stats: {
          totalProducts: 0,
          publishedProducts: 0,
          processingProducts: 0
        }
      },
      message: 'Кабинет успешно обновлен'
    });

  } catch (error) {
    console.error('❌ [API Cabinets] Ошибка при обновлении кабинета:', error);
    
    let errorMessage = 'Ошибка при обновлении кабинета';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Не удается подключиться к базе данных';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышен таймаут подключения к базе данных';
        statusCode = 504;
      } else if (error.message.includes('P2002')) {
        errorMessage = 'Кабинет с таким названием уже существует';
        statusCode = 409;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: statusCode });
  }
}

// DELETE - удалить кабинет
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API Cabinets] === НАЧАЛО DELETE /api/cabinets ===');
    
    // Проверяем авторизацию
    const user = await AuthService.getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'ID кабинета обязателен'
      }, { status: 400 });
    }

    // Проверяем, что кабинет принадлежит текущему пользователю
    const cabinet = await prisma.cabinet.findFirst({
      where: { 
        id,
        userId: user.id
      },
      include: {
        productCabinets: true
      }
    });

    if (!cabinet) {
      return NextResponse.json({
        success: false,
        error: 'Кабинет не найден или у вас нет прав для его удаления'
      }, { status: 404 });
    }

    // Проверяем, есть ли связанные продукты
    if (cabinet.productCabinets && cabinet.productCabinets.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Нельзя удалить кабинет: с ним связано ${cabinet.productCabinets.length} товаров`,
        canForceDelete: true,
        relatedProductsCount: cabinet.productCabinets.length
      }, { status: 400 });
    }

    // Удаляем кабинет
    await prisma.cabinet.delete({
      where: { id }
    });

    console.log('✅ [API Cabinets] Кабинет удален:', {
      id: cabinet.id,
      name: cabinet.name
    });

    return NextResponse.json({
      success: true,
      message: 'Кабинет успешно удален'
    });

  } catch (error) {
    console.error('❌ [API Cabinets] Ошибка при удалении кабинета:', error);
    
    let errorMessage = 'Ошибка при удалении кабинета';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('P1001') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Не удается подключиться к базе данных';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышен таймаут подключения к базе данных';
        statusCode = 504;
      } else if (error.message.includes('P2003')) {
        errorMessage = 'Нельзя удалить кабинет с связанными товарами';
        statusCode = 409;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: statusCode });
  }
}

// Функция валидации WB токена
async function validateWBToken(token: string): Promise<{ 
  valid: boolean; 
  error?: string; 
  networkError?: boolean;
  tokenAnalysis?: any;
}> {
  console.log('🔍 [API Cabinets] Проверяем токен WB...');
  
  // Сначала анализируем сам токен
  const tokenAnalysis = analyzeJWTToken(token);
  if (!tokenAnalysis.valid) {
    return {
      valid: false,
      error: tokenAnalysis.error,
      tokenAnalysis
    };
  }

  // Если токен истек
  if (tokenAnalysis.isExpired) {
    return {
      valid: false,
      error: 'Токен истек. Создайте новый токен в личном кабинете Wildberries.',
      tokenAnalysis
    };
  }

  // Список ping endpoints для проверки
  const pingEndpoints = [
    { name: 'Content API', url: `${WB_API_ENDPOINTS.content}/ping` },
    { name: 'Marketplace API', url: `${WB_API_ENDPOINTS.marketplace}/ping` }
  ];

  let successCount = 0;
  let lastError = '';
  let hasNetworkError = false;

  for (const endpoint of pingEndpoints) {
    try {
      console.log(`📡 [API Cabinets] Проверяем ${endpoint.name}: ${endpoint.url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          'User-Agent': 'WB-Automation/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`${endpoint.name} ответ: ${response.status}`);

      if (response.ok) {
        successCount++;
        console.log(`✅ ${endpoint.name} - успешно!`);
        
        if (successCount === 1) {
          return { 
            valid: true, 
            tokenAnalysis 
          };
        }
      } else if (response.status === 401) {
        lastError = 'Недействительный токен авторизации';
      } else if (response.status === 403) {
        lastError = 'Недостаточно прав доступа к этому API';
      } else {
        lastError = `Ошибка API: ${response.status}`;
      }

    } catch (error: any) {
      console.error(`❌ Ошибка при обращении к ${endpoint.name}:`, error.message);
      hasNetworkError = true;
      
      if (error.name === 'AbortError') {
        lastError = 'Превышен таймаут подключения (более 10 секунд)';
      } else if (error.message.includes('ENOTFOUND')) {
        lastError = 'Не удается найти сервер API Wildberries';
      } else if (error.message.includes('fetch failed')) {
        lastError = 'Ошибка сетевого соединения с API';
      } else {
        lastError = 'Ошибка сетевого соединения';
      }
    }

    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (successCount === 0) {
    return { 
      valid: false, 
      error: lastError || 'Не удается подключиться к API Wildberries',
      networkError: hasNetworkError,
      tokenAnalysis
    };
  }

  return { 
    valid: true, 
    tokenAnalysis 
  };
}

// Анализ JWT токена
function analyzeJWTToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { 
        valid: false, 
        error: 'Неверный формат JWT токена (должно быть 3 части, разделенные точками)' 
      };
    }

    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    
    return {
      valid: true,
      isExpired,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString('ru-RU') : 'Не указано',
      sellerId: payload.sid || 'Не указано',
      permissions: payload.s || 'Не указано',
      isTestToken: payload.t || false,
      tokenId: payload.id || 'Не указано'
    };
  } catch (error) {
    console.error('❌ Ошибка при анализе JWT токена:', error);
    
    let errorMessage = 'Не удалось разобрать JWT токен';
    
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        errorMessage = 'Неверный формат JWT токена';
      } else if (error.message.includes('base64')) {
        errorMessage = 'Ошибка декодирования JWT токена';
      } else {
        errorMessage = `Ошибка анализа токена: ${error.message}`;
      }
    }
    
    return { 
      valid: false, 
      error: errorMessage
    };
  }
}

// Функция для маскировки токена
function maskToken(token: string): string {
  if (!token) return '***';
  if (token.length === 0) return '***';
  if (token.length <= 8) return '*'.repeat(Math.min(token.length, 10));
  
  return token.substring(0, 4) + '*'.repeat(Math.max(token.length - 8, 3)) + token.substring(token.length - 4);
}