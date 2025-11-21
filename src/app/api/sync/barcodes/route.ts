// API для синхронизации баркодов товаров из WB
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WB_API_CONFIG } from '../../../../../lib/config/wbApiConfig';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Sync Barcodes] Начало синхронизации баркодов из WB');
    
    // Авторизация
    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { cabinetId } = await request.json();
    
    if (!cabinetId) {
      return NextResponse.json({ error: 'Не указан cabinetId' }, { status: 400 });
    }

    // Получаем кабинет
    const cabinet = await prisma.cabinet.findFirst({
      where: {
        id: cabinetId,
        userId: user.id,
        isActive: true
      }
    });

    if (!cabinet || !cabinet.apiToken) {
      return NextResponse.json({ error: 'Кабинет не найден или нет API токена' }, { status: 404 });
    }

    console.log(`📦 [Sync Barcodes] Загрузка карточек товаров для кабинета: ${cabinet.name}`);

    // 1. Получаем список карточек товаров с WB (с пагинацией)
    const allCards: any[] = [];
    let cursor: any = { limit: 100 }; // WB API максимум 100
    let hasMore = true;

    while (hasMore) {
      const cardsResponse = await fetch(
        `${WB_API_CONFIG.BASE_URLS.CONTENT}/content/v2/get/cards/list`,
        {
          method: 'POST',
          headers: {
            'Authorization': cabinet.apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            settings: {
              cursor: cursor,
              filter: {
                withPhoto: -1
              }
            }
          })
        }
      );

      if (!cardsResponse.ok) {
        const errorText = await cardsResponse.text();
        console.error(`❌ [Sync Barcodes] Ошибка получения карточек (${cardsResponse.status}):`, errorText);
        return NextResponse.json({ 
          error: 'Ошибка получения карточек товаров',
          details: errorText
        }, { status: cardsResponse.status });
      }

      const cardsData = await cardsResponse.json();
      const cards = cardsData?.cards || [];
      
      allCards.push(...cards);
      console.log(`📦 [Sync Barcodes] Загружено ${cards.length} карточек (всего: ${allCards.length})`);

      // Проверяем, есть ли еще карточки
      if (cardsData?.cursor?.total && allCards.length < cardsData.cursor.total) {
        cursor = {
          limit: 100,
          updatedAt: cardsData.cursor.updatedAt,
          nmID: cardsData.cursor.nmID
        };
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ [Sync Barcodes] Получено ${allCards.length} карточек товаров`);

    // 2. Обновляем баркоды в БД
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const card of allCards) {
      try {
        const nmId = card.nmID || card.nmId;
        const vendorCode = card.vendorCode;
        
        if (!nmId) {
          console.warn(`⚠️ [Sync Barcodes] Карточка без nmID:`, card);
          continue;
        }

        // Собираем все баркоды из размеров
        const barcodes: string[] = [];
        let primaryBarcode: string | null = null;

        if (card.sizes && Array.isArray(card.sizes)) {
          for (const size of card.sizes) {
            if (size.skus && Array.isArray(size.skus)) {
              for (const sku of size.skus) {
                if (sku) {
                  barcodes.push(sku);
                  if (!primaryBarcode) {
                    primaryBarcode = sku; // Первый баркод - основной
                  }
                }
              }
            }
          }
        }

        if (barcodes.length === 0) {
          console.warn(`⚠️ [Sync Barcodes] Товар ${nmId} не имеет баркодов`);
          continue;
        }

        console.log(`📦 [Sync Barcodes] Товар ${nmId} (${vendorCode}): ${barcodes.length} баркодов`);

        // Ищем товар в БД
        const product = await prisma.product.findFirst({
          where: {
            wbNmId: String(nmId),
            userId: user.id
          }
        });

        if (!product) {
          notFoundCount++;
          continue;
        }

        // Обновляем баркоды
        await prisma.product.update({
          where: { id: product.id },
          data: {
            barcode: primaryBarcode,
            barcodes: barcodes,
            vendorCode: vendorCode || product.vendorCode,
            lastWbSyncAt: new Date(),
            wbSyncStatus: 'synced'
          }
        });

        updatedCount++;
      } catch (error) {
        console.error(`❌ [Sync Barcodes] Ошибка обновления товара:`, error);
        errorCount++;
      }
    }

    console.log(`✅ [Sync Barcodes] Синхронизация завершена:`);
    console.log(`   - Обновлено: ${updatedCount} товаров`);
    console.log(`   - Не найдено в БД: ${notFoundCount} товаров`);
    console.log(`   - Ошибок: ${errorCount}`);

    return NextResponse.json({
      success: true,
      message: 'Баркоды успешно синхронизированы',
      stats: {
        total: allCards.length,
        updated: updatedCount,
        notFound: notFoundCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('❌ [Sync Barcodes] Критическая ошибка:', error);
    return NextResponse.json({
      error: 'Ошибка синхронизации баркодов',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
