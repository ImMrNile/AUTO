import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WB_API_CONFIG } from '../../../../../lib/config/wbApiConfig';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/wb/stocks - Получение остатков со складов WB
 * POST /api/wb/stocks - Обновление остатков FBS
 */

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');
    const cabinet = await getActiveCabinet(user.id, cabinetId || undefined);
    console.log(`📦 Работаем с кабинетом: ${cabinet?.name || 'не найден'} (ID: ${cabinet?.id || 'N/A'})`);
    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({
        error: 'Не найден активный кабинет с API токеном'
      }, { status: 400 });
    }

    // Получаем список складов
    const warehousesResponse = await fetch(
      `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/warehouses`,
      {
        method: 'GET',
        headers: {
          'Authorization': cabinet.apiToken,
          'Accept': 'application/json'
        }
      }
    );

    if (!warehousesResponse.ok) {
      throw new Error('Ошибка получения списка складов');
    }

    const warehouses = await warehousesResponse.json();
    console.log(`📦 Получено складов: ${warehouses.length}`);
    warehouses.forEach((w: any) => {
      // Согласно документации WB API:
      // deliveryType: 1 = FBS, 2 = FBW
      const warehouseType = w.deliveryType === 1 ? 'FBS' : 'FBW';
      console.log(`  - ${w.name} (ID: ${w.id}): deliveryType=${w.deliveryType} → тип=${warehouseType}`);
    });

    // Получаем баркоды товаров из БД для FBS остатков
    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        wbNmId: {
          not: null // Только товары из WB
        }
      },
      select: {
        id: true,
        wbNmId: true,
        barcode: true,
        barcodes: true
      }
    });

    console.log(`📦 Найдено ${products.length} товаров в БД`);

    // Собираем все баркоды
    const allBarcodes: string[] = [];
    for (const product of products) {
      if (product.barcodes && Array.isArray(product.barcodes)) {
        const validBarcodes = product.barcodes.filter((b: any) => typeof b === 'string');
        allBarcodes.push(...validBarcodes);
      } else if (product.barcode && typeof product.barcode === 'string') {
        allBarcodes.push(product.barcode);
      }
    }

    console.log(`📦 Всего баркодов: ${allBarcodes.length}`);

    // Получаем остатки через wbApiService (FBW + FBS)
    console.log(`📦 Загрузка остатков через wbApiService...`);
    const { wbApiService } = await import('../../../../../lib/services/wbApiService');
    const allStocks = await wbApiService.getStocksWithBarcodes(cabinet.apiToken, allBarcodes);
    
    console.log(`✅ Получено остатков: ${allStocks.length}`);
    
    // Показываем статистику по типам складов
    const fbsCount = allStocks.filter(s => s.warehouseType === 'FBS').length;
    const fbwCount = allStocks.filter(s => s.warehouseType === 'FBW').length;
    console.log(`📊 Остатки по типам: FBS=${fbsCount}, FBW=${fbwCount}`);

    // Получаем товары из БД для сопоставления по баркодам
    const productsInDb = await prisma.product.findMany({
      where: {
        userId: user.id,
        wbNmId: { not: null }
      },
      select: {
        id: true,
        wbNmId: true,
        barcode: true,
        barcodes: true
      }
    });
    
    // Создаем Map для быстрого поиска nmId по баркоду
    const barcodeToNmId = new Map<string, string>();
    productsInDb.forEach(product => {
      if (product.barcodes && Array.isArray(product.barcodes)) {
        (product.barcodes as string[]).forEach(barcode => {
          if (barcode && product.wbNmId) {
            barcodeToNmId.set(barcode, product.wbNmId);
          }
        });
      }
      if (product.barcode && product.wbNmId) {
        barcodeToNmId.set(product.barcode, product.wbNmId);
      }
    });
    
    console.log(`📦 Создана карта баркодов: ${barcodeToNmId.size} баркодов`);
    
    // Группируем остатки по товарам
    const stocksByProduct = new Map();
    console.log(`📦 Группировка ${allStocks.length} остатков по товарам...`);
    
    allStocks.forEach(stock => {
      let nmId = stock.nmId;
      
      // Если нет nmId, пытаемся найти по баркоду
      if (!nmId && stock.barcode) {
        nmId = barcodeToNmId.get(stock.barcode);
        if (nmId) {
          console.log(`✅ Найден nmId ${nmId} по баркоду ${stock.barcode}`);
        }
      }
      
      // Пропускаем товары без nmId и без баркода
      if (!nmId) {
        console.warn(`⚠️ Пропускаем товар без nmId и баркода:`, {
          vendorCode: stock.vendorCode,
          barcode: stock.barcode,
          warehouseName: stock.warehouseName,
          quantity: stock.quantity
        });
        return;
      }
      
      if (!stocksByProduct.has(nmId)) {
        stocksByProduct.set(nmId, {
          nmId,
          vendorCode: stock.vendorCode,
          warehouses: [],
          totalStock: 0,
          totalReserved: 0,
          fbsStock: 0,
          fbwStock: 0
        });
      }
      
      const productStock = stocksByProduct.get(nmId);
      const stockAmount = stock.quantity || stock.quantityFull || stock.amount || 0;
      const reservedAmount = stock.inWayToClient || stock.reservedAmount || 0;
      
      productStock.warehouses.push({
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouseName,
        warehouseType: stock.warehouseType,
        stock: stockAmount,
        reserved: reservedAmount
      });
      
      productStock.totalStock += stockAmount;
      productStock.totalReserved += reservedAmount;
      
      if (stock.warehouseType === 'FBS') {
        productStock.fbsStock += stockAmount;
      } else {
        productStock.fbwStock += stockAmount;
      }
    });
    
    // Логируем итоговую статистику
    const totalFBS = Array.from(stocksByProduct.values()).reduce((sum, p: any) => sum + p.fbsStock, 0);
    const totalFBW = Array.from(stocksByProduct.values()).reduce((sum, p: any) => sum + p.fbwStock, 0);
    console.log(`📊 Итоговые остатки: FBS=${totalFBS} шт, FBW=${totalFBW} шт, всего=${totalFBS + totalFBW} шт`);

    // Сохраняем остатки в БД
    const stocksArray = Array.from(stocksByProduct.values());
    console.log(`📦 Сохранение остатков в БД для ${stocksArray.length} товаров...`);
    
    for (const stockData of stocksArray) {
      try {
        // Проверяем, что nmId существует
        if (!stockData.nmId) {
          console.warn(`⚠️ Пропускаем товар без nmId:`, stockData);
          continue;
        }

        await prisma.product.updateMany({
          where: {
            wbNmId: stockData.nmId.toString(),
            userId: user.id
          },
          data: {
            stock: stockData.totalStock,
            reserved: stockData.totalReserved,
            lastWbSyncAt: new Date(),
            wbSyncStatus: 'SUCCESS'
          }
        });
      } catch (error) {
        console.warn(`⚠️ Ошибка сохранения остатков для товара ${stockData.nmId}:`, error);
      }
    }
    
    console.log(`✅ Остатки сохранены в БД`);

    return NextResponse.json({
      success: true,
      warehouses,
      stocks: stocksArray
    });

  } catch (error) {
    console.error('❌ Ошибка получения остатков:', error);
    return NextResponse.json({
      error: 'Ошибка получения остатков',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { warehouseId, sku, amount } = await request.json();

    if (!warehouseId || !sku || amount === undefined) {
      return NextResponse.json({
        error: 'Не указаны обязательные параметры'
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get('cabinetId');
    const cabinet = await getActiveCabinet(user.id, cabinetId || undefined);
    console.log(`📦 Работаем с кабинетом: ${cabinet?.name || 'не найден'} (ID: ${cabinet?.id || 'N/A'})`);
    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({
        error: 'Не найден активный кабинет с API токеном'
      }, { status: 400 });
    }

    // Обновляем остатки через API WB
    const response = await fetch(
      `${WB_API_CONFIG.BASE_URLS.MARKETPLACE}/api/v3/stocks/${warehouseId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': cabinet.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          stocks: [{
            sku,
            amount
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ошибка обновления остатков');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Остатки успешно обновлены',
      result
    });

  } catch (error) {
    console.error('❌ Ошибка обновления остатков:', error);
    return NextResponse.json({
      error: 'Ошибка обновления остатков',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

async function getActiveCabinet(userId: string, cabinetId?: string) {
  // Если указан конкретный cabinetId, ищем его
  if (cabinetId) {
    const cabinet = await safePrismaOperation(
      () => prisma.cabinet.findUnique({
        where: {
          id: cabinetId,
          userId: userId,
          apiToken: { not: null }
        }
      }),
      'получение указанного кабинета'
    );
    return cabinet;
  }
  
  // Иначе ищем активный кабинет
  const cabinets = await safePrismaOperation(
    () => prisma.cabinet.findMany({
      where: {
        userId: userId,
        isActive: true,
        apiToken: { not: null }
      }
    }),
    'получение активного кабинета'
  );

  return cabinets && cabinets.length > 0 ? cabinets[0] : null;
}
