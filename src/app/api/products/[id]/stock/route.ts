// src/app/api/products/[id]/stock/route.ts - API для управления остатками товара

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { safePrismaOperation } from '../../../../../../lib/prisma-utils';
import { AuthService } from '../../../../../../lib/auth/auth-service';
import { wbApiService } from '../../../../../../lib/services/wbApiService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * PUT /api/products/[id]/stock - Обновление остатков товара на WB
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📦 [Stock API] Обновление остатков для товара ${params.id}`);

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    // Получаем данные из запроса
    const body = await request.json();
    const { stock, warehouseId } = body;

    if (typeof stock !== 'number' || stock < 0) {
      return NextResponse.json({
        error: 'Некорректное значение остатка'
      }, { status: 400 });
    }

    // Получаем товар (поддерживаем как внутренний ID, так и wbNmId)
    const product = await safePrismaOperation(
      () => prisma.product.findFirst({
        where: {
          OR: [
            { id: params.id },
            { wbNmId: params.id }
          ],
          userId: user.id
        },
        select: {
          id: true,
          userId: true,
          name: true,
          wbData: true,
          vendorCode: true,
          stock: true,
          productCabinets: {
            where: { isSelected: true },
            select: {
              cabinet: {
                select: {
                  id: true,
                  name: true,
                  apiToken: true,
                  isActive: true
                }
              }
            }
          }
        }
      }),
      'получение товара для обновления остатков'
    );

    if (!product) {
      return NextResponse.json({
        error: 'Товар не найден'
      }, { status: 404 });
    }

    // Проверка прав доступа
    if (product.userId !== user.id) {
      return NextResponse.json({
        error: 'Нет прав для изменения этого товара'
      }, { status: 403 });
    }

    // Обновляем остаток в БД
    await safePrismaOperation(
      () => prisma.product.update({
        where: { id: params.id },
        data: { stock }
      }),
      'обновление остатка в БД'
    );

    console.log(`✅ [Stock API] Остаток обновлен в БД: ${stock} шт`);

    // Если товар опубликован на WB, обновляем остаток там
    let wbUpdateResult = null;
    const wbData = product.wbData as any;
    const barcode = wbData?.barcode;

    if (barcode && product.productCabinets.length > 0) {
      const cabinet = product.productCabinets[0].cabinet;

      if (cabinet && cabinet.apiToken && cabinet.isActive) {
        console.log(`📦 [Stock API] Обновление остатка на WB для товара ${barcode}`);

        try {
          // Получаем список складов
          const warehousesResult = await wbApiService.getWarehouses(cabinet.apiToken);

          if (warehousesResult.success && warehousesResult.data) {
            const warehouses = warehousesResult.data;
            
            // Используем указанный склад или первый доступный
            let targetWarehouse = null;
            
            if (warehouseId) {
              targetWarehouse = warehouses.find((w: any) => w.id === warehouseId);
            } else {
              // Ищем FBS склад или берем первый
              targetWarehouse = warehouses.find((w: any) => 
                w.name && (w.name.toLowerCase().includes('fbs') || w.officeId)
              ) || warehouses[0];
            }

            if (targetWarehouse && targetWarehouse.id) {
              console.log(`📦 [Stock API] Используем склад: ${targetWarehouse.name} (ID: ${targetWarehouse.id})`);

              // Устанавливаем остаток
              wbUpdateResult = await wbApiService.setProductStockWithRetry(
                cabinet.apiToken,
                targetWarehouse.id,
                barcode,
                stock,
                3,
                2000
              );

              if (wbUpdateResult.success) {
                console.log(`✅ [Stock API] Остаток успешно обновлен на WB: ${stock} шт`);
              } else {
                console.warn(`⚠️ [Stock API] Не удалось обновить остаток на WB: ${wbUpdateResult.error}`);
              }
            } else {
              console.warn('⚠️ [Stock API] Не найден подходящий склад');
              wbUpdateResult = {
                success: false,
                error: 'Не найден подходящий склад'
              };
            }
          } else {
            console.warn('⚠️ [Stock API] Не удалось получить список складов');
            wbUpdateResult = {
              success: false,
              error: 'Не удалось получить список складов'
            };
          }
        } catch (error) {
          console.error('❌ [Stock API] Ошибка обновления остатка на WB:', error);
          wbUpdateResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Неизвестная ошибка'
          };
        }
      } else {
        console.log('⚠️ [Stock API] Кабинет не активен или отсутствует API токен');
      }
    } else {
      console.log('⚠️ [Stock API] Товар не опубликован на WB или отсутствует barcode');
    }

    return NextResponse.json({
      success: true,
      message: 'Остаток успешно обновлен',
      stock,
      wbUpdated: wbUpdateResult?.success || false,
      wbError: wbUpdateResult?.error || null
    });

  } catch (error) {
    console.error('❌ [Stock API] Ошибка обновления остатков:', error);
    return NextResponse.json({
      error: 'Ошибка обновления остатков',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

/**
 * GET /api/products/[id]/stock - Получение текущих остатков товара
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📦 [Stock API] Получение остатков для товара ${params.id}`);

    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ 
        error: 'Не авторизован' 
      }, { status: 401 });
    }

    // Получаем товар (поддерживаем как внутренний ID, так и wbNmId)
    const product = await safePrismaOperation(
      () => prisma.product.findFirst({
        where: {
          OR: [
            { id: params.id },
            { wbNmId: params.id }
          ],
          userId: user.id
        },
        select: {
          id: true,
          userId: true,
          name: true,
          stock: true,
          reserved: true,
          inTransit: true,
          inReturn: true,
          wbData: true,
          wbNmId: true,
          productCabinets: {
            where: { isSelected: true },
            select: {
              cabinet: {
                select: {
                  id: true,
                  name: true,
                  apiToken: true,
                  isActive: true
                }
              }
            }
          }
        }
      }),
      'получение остатков товара'
    );

    if (!product) {
      return NextResponse.json({
        error: 'Товар не найден'
      }, { status: 404 });
    }

    // Проверка прав доступа
    if (product.userId !== user.id) {
      return NextResponse.json({
        error: 'Нет прав для просмотра этого товара'
      }, { status: 403 });
    }

    // Получаем остатки с WB (если товар опубликован)
    let wbStocks = null;
    const wbData = product.wbData as any;
    const barcode = wbData?.barcode;

    if (product.wbNmId && product.productCabinets.length > 0) {
      const cabinet = product.productCabinets[0].cabinet;

      if (cabinet && cabinet.apiToken && cabinet.isActive) {
        try {
          // Получаем список складов
          const warehousesResult = await wbApiService.getWarehouses(cabinet.apiToken);

          if (warehousesResult.success && warehousesResult.data) {
            const warehouses = warehousesResult.data;
            wbStocks = [];

            // Получаем остатки товара по nmId
            const stockResult = await wbApiService.getProductStock(
              cabinet.apiToken,
              parseInt(product.wbNmId!)
            );

            if (stockResult.success && stockResult.data?.wbStocks) {
              wbStocks = stockResult.data.wbStocks;
            }
          }
        } catch (error) {
          console.error('❌ [Stock API] Ошибка получения остатков с WB:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      stock: product.stock,
      reserved: product.reserved,
      inTransit: product.inTransit,
      inReturn: product.inReturn,
      available: product.stock - product.reserved,
      wbStocks: wbStocks
    });

  } catch (error) {
    console.error('❌ [Stock API] Ошибка получения остатков:', error);
    return NextResponse.json({
      error: 'Ошибка получения остатков',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
