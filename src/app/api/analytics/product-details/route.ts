// src/app/api/analytics/product-details/route.ts - Детальная финансовая аналитика по товару

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { AuthService } from '../../../../../lib/auth/auth-service';
import { WbFinancialCalculator, type WbSaleData, type CategoryCommissions } from '../../../../../lib/services/wbFinancialCalculator';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET - Получение детальной финансовой аналитики по товару
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Запрос детальной аналитики по товару');

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return NextResponse.json({
        error: 'Не авторизован'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nmId = searchParams.get('nmId');
    
    if (!nmId) {
      return NextResponse.json({
        error: 'Не указан nmId товара'
      }, { status: 400 });
    }

    console.log(`📦 Получение данных для товара: ${nmId}`);

    // Получаем активный кабинет
    const cabinets = await prisma.cabinet.findMany({
      where: { userId: user.id, isActive: true }
    });

    if (cabinets.length === 0) {
      return NextResponse.json({
        error: 'У пользователя нет активных кабинетов'
      }, { status: 400 });
    }

    const cabinet = cabinets[0];

    // Получаем информацию о товаре из БД
    // Ищем по wbNmId (строка) или по ID (если передан UUID)
    // @ts-ignore - Prisma types not fully synced
    let product: any = await prisma.product.findFirst({
      where: {
        OR: [
          { wbNmId: String(nmId) },  // Приводим к строке для корректного поиска
          { id: nmId }  // Если передан UUID товара
        ],
        userId: user.id
      },
      include: {
        subcategory: {
          include: {
            parentCategory: true
          }
        }
      }
    });
    
    console.log(`🔍 Поиск товара в БД: nmId=${nmId}, userId=${user.id}, найден=${!!product}`);
    if (product) {
      console.log(`✅ Товар найден: ID=${product.id}, wbNmId=${product.wbNmId}, costPrice=${product.costPrice || 0}₽`);
    } else {
      console.warn(`⚠️ Товар НЕ найден в БД для пользователя ${user.id}. Проверяем все товары с nmId=${nmId}...`);
      
      // Дополнительная проверка - ищем товар без фильтра по userId
      const allProductsWithNmId = await prisma.product.findMany({
        where: {
          wbNmId: String(nmId)
        },
        select: {
          id: true,
          wbNmId: true,
          userId: true,
          costPrice: true
        }
      });
      
      console.log(`🔍 Найдено товаров с nmId=${nmId}: ${allProductsWithNmId.length}`);
      if (allProductsWithNmId.length > 0) {
        console.log(`📋 Список товаров:`, allProductsWithNmId.map(p => ({
          id: p.id,
          userId: p.userId,
          costPrice: p.costPrice,
          isCurrentUser: p.userId === user.id
        })));
      }
    }

    // Если товар не найден в БД, пытаемся получить данные из WB
    if (!product) {
      console.log('⚠️ Товар не найден в БД, получаем данные из WB API');
    }

    // Получаем реальную цену товара из WB API продавца (используем API с токеном)
    let actualPrice = product?.discountPrice || product?.price || 0;
    let originalPrice = product?.price || 0;
    
    try {
      // Используем API продавца для получения цен (требует токен авторизации)
      console.log(`🔍 Запрос цены товара ${nmId} через API продавца WB...`);
      
      const priceResponse = await fetch(
        `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=0`,
        {
          method: 'GET',
          headers: {
            'Authorization': cabinet.apiToken || '',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`📡 Статус ответа API продавца: ${priceResponse.status}`);
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        
        if (priceData?.data?.listGoods) {
          // Ищем товар по nmId в списке
          const productPrice = priceData.data.listGoods.find((item: any) => item.nmID === parseInt(nmId));
          
          if (productPrice) {
            console.log('📦 Товар найден в API продавца');
            console.log('📦 Данные цены:', JSON.stringify(productPrice, null, 2));
            
            // Структура API продавца: { nmID, sizes: [{ price, discountedPrice }], discount }
            if (productPrice.sizes && productPrice.sizes.length > 0) {
              const firstSize = productPrice.sizes[0];
              
              // Базовая цена (до скидки)
              if (firstSize.price !== undefined && firstSize.price > 0) {
                originalPrice = firstSize.price;
                console.log(`💰 Базовая цена: ${originalPrice}₽`);
              }
              
              // Цена со скидкой (актуальная)
              if (firstSize.discountedPrice !== undefined && firstSize.discountedPrice > 0) {
                actualPrice = firstSize.discountedPrice;
                console.log(`💰 Цена со скидкой: ${actualPrice}₽`);
              } else {
                actualPrice = originalPrice; // Если нет скидки, используем базовую цену
              }
              
              // Логируем скидку если есть
              if (productPrice.discount !== undefined && productPrice.discount > 0) {
                console.log(`💰 Скидка: ${productPrice.discount}%`);
              }
            }
            
            console.log(`📊 ИТОГО: actualPrice=${actualPrice}, originalPrice=${originalPrice}`);
          } else {
            console.warn(`⚠️ Товар ${nmId} не найден в списке цен API продавца`);
          }
        } else {
          console.warn('⚠️ API продавца вернул пустой список товаров');
        }
      } else {
        const errorText = await priceResponse.text();
        console.error(`❌ API продавца вернул статус ${priceResponse.status}: ${errorText.substring(0, 500)}`);
      }
    } catch (error) {
      console.error('❌ Ошибка запроса к API продавца:', error);
    }
    
    // Если цена не получена из публичного API, пробуем БД
    if (actualPrice === 0 && originalPrice === 0) {
      console.log('🔍 Ищем цену в БД товара...');
      
      if (product?.price && product.price > 0) {
        actualPrice = product.price;
        originalPrice = product.price;
        console.log(`✅ Используем цену из БД: ${actualPrice} ₽`);
      } else if (product?.discountPrice && product.discountPrice > 0) {
        actualPrice = product.discountPrice;
        originalPrice = product.price || product.discountPrice;
        console.log(`✅ Используем цену со скидкой из БД: ${actualPrice} ₽`);
      }
      // НЕ возвращаем ошибку здесь - сначала попробуем получить товар из WB API
    }

    // Если товар не найден в БД, получаем данные из WB API
    let commissions: CategoryCommissions;
    let productName = product?.name || '';
    let vendorCode = product?.vendorCode || '';
    let subjectId: number | undefined = product?.subcategory?.wbSubjectId;
    
    if (!product?.subcategory) {
      console.warn('⚠️ Товар не найден в БД. Получаем данные из WB API контента...');
      
      try {
        // Получаем данные товара из API контента WB
        const contentResponse = await fetch(
          `https://content-api.wildberries.ru/content/v2/get/cards/list`,
          {
            method: 'POST',
            headers: {
              'Authorization': cabinet.apiToken || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              settings: {
                cursor: {
                  limit: 1
                },
                filter: {
                  textSearch: nmId,
                  withPhoto: -1
                }
              }
            })
          }
        );
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          console.log('📦 Ответ API контента:', JSON.stringify(contentData).substring(0, 1000));
          
          if (contentData?.cards && contentData.cards.length > 0) {
            const card = contentData.cards[0];
            productName = card.title || productName;
            vendorCode = card.vendorCode || vendorCode;
            subjectId = card.subjectID;
            
            console.log(`✅ Получены данные из API: ${productName}, subjectID: ${subjectId}`);
            
            // Получаем комиссии по subjectId из БД
            if (subjectId) {
              const subcategory = await prisma.wbSubcategory.findFirst({
                where: { wbSubjectId: subjectId }
              });
              
              if (subcategory) {
                commissions = {
                  commissionFbw: subcategory.commissionFbw,
                  commissionFbs: subcategory.commissionFbs,
                  commissionDbs: subcategory.commissionDbs,
                  commissionCc: subcategory.commissionCc,
                  commissionEdbs: subcategory.commissionEdbs
                };
                console.log(`✅ Найдены комиссии для категории ${subcategory.name}: FBW ${subcategory.commissionFbw}%`);
                
                // Проверяем, есть ли уже товар в БД (может быть с другим форматом поиска)
                try {
                  console.log('💾 Проверяем наличие товара в БД...');
                  
                  const existingProduct = await prisma.product.findFirst({
                    where: {
                      wbNmId: String(nmId),
                      userId: user.id
                    }
                  });
                  
                  if (existingProduct) {
                    console.log(`✅ Товар уже существует в БД (ID: ${existingProduct.id}), обновляем данные...`);
                    
                    // Обновляем только недостающие поля, НЕ трогаем costPrice!
                    product = await prisma.product.update({
                      where: { id: existingProduct.id },
                      data: {
                        name: productName || existingProduct.name,
                        vendorCode: vendorCode || existingProduct.vendorCode,
                        price: actualPrice || existingProduct.price,
                        discountPrice: actualPrice || existingProduct.discountPrice,
                        subcategoryId: subcategory.id,
                        status: 'ACTIVE'
                        // costPrice НЕ обновляем - сохраняем пользовательское значение!
                      },
                      include: {
                        subcategory: {
                          include: {
                            parentCategory: true
                          }
                        }
                      }
                    });
                    
                    console.log(`✅ Товар обновлен в БД, costPrice сохранен: ${product.costPrice || 0}₽`);
                  } else {
                    console.log('💾 Создаем новый товар в БД...');
                    
                    product = await prisma.product.create({
                      data: {
                        wbNmId: String(nmId),
                        name: productName,
                        vendorCode: vendorCode,
                        price: actualPrice,
                        discountPrice: actualPrice,
                        subcategoryId: subcategory.id,
                        userId: user.id,
                        status: 'ACTIVE'
                      },
                      include: {
                        subcategory: {
                          include: {
                            parentCategory: true
                          }
                        }
                      }
                    });
                    
                    console.log(`✅ Новый товар создан в БД с ID: ${product.id}`);
                  }
                } catch (saveError) {
                  console.warn('⚠️ Не удалось сохранить/обновить товар в БД:', saveError);
                  // Продолжаем работу даже если не удалось сохранить
                }
              } else {
                console.error(`❌ Категория с subjectId ${subjectId} не найдена в БД`);
                return NextResponse.json({
                  error: `Категория товара (ID: ${subjectId}) не найдена. Синхронизируйте категории WB.`,
                  needsSync: true
                }, { status: 404 });
              }
            } else {
              console.error('❌ Не удалось получить subjectID из API');
              return NextResponse.json({
                error: 'Не удалось определить категорию товара',
                needsSync: true
              }, { status: 404 });
            }
          } else {
            console.error('❌ Товар не найден в API контента');
            return NextResponse.json({
              error: 'Товар не найден в WB API. Проверьте nmId.',
              needsSync: true
            }, { status: 404 });
          }
        } else {
          const errorText = await contentResponse.text();
          console.error(`❌ API контента вернул ошибку: ${errorText}`);
          return NextResponse.json({
            error: 'Ошибка получения данных из WB API',
            needsSync: true
          }, { status: 500 });
        }
      } catch (error) {
        console.error('❌ Ошибка запроса к API контента:', error);
        return NextResponse.json({
          error: 'Ошибка подключения к WB API',
          needsSync: true
        }, { status: 500 });
      }
    } else {
      commissions = {
        commissionFbw: product.subcategory.commissionFbw,
        commissionFbs: product.subcategory.commissionFbs,
        commissionDbs: product.subcategory.commissionDbs,
        commissionCc: product.subcategory.commissionCc,
        commissionEdbs: product.subcategory.commissionEdbs
      };
    }

    // Финальная проверка: если все еще нет цены и товара - возвращаем ошибку
    if (actualPrice === 0 && !product) {
      console.error('❌ Не удалось получить цену и товар ни из API, ни из БД');
      return NextResponse.json({
        error: 'Не удалось определить цену товара. Товар может быть недоступен или не принадлежит вашему кабинету.',
        needsSync: true,
        nmId: parseInt(nmId)
      }, { status: 404 });
    }

    // Получаем налоговую ставку из кабинета
    const taxRate = (cabinet as any).taxRate || 6;

    // Формируем данные для расчета
    const saleData: WbSaleData = {
      nmId: parseInt(nmId),
      vendorCode: vendorCode,
      category: product?.subcategory?.name || 'Без категории',
      subcategoryId: subjectId,
      
      priceWithDiscount: actualPrice,
      originalPrice: originalPrice,
      
      deliveryType: 'FBW', // По умолчанию, можно получить из других источников
      
      // Размеры (если есть в dimensions)
      length: product?.dimensions ? (product.dimensions as any).length : undefined,
      width: product?.dimensions ? (product.dimensions as any).width : undefined,
      height: product?.dimensions ? (product.dimensions as any).height : undefined,
      weight: product?.dimensions ? (product.dimensions as any).weight : undefined,
      
      isReturned: false, // Для конкретного товара нужно получать из истории заказов
      orderDate: new Date(),
      
      costPrice: product?.costPrice || undefined
    };

    // Рассчитываем детальную финансовую аналитику
    const calculation = WbFinancialCalculator.calculate(saleData, commissions, {
      taxRate: taxRate, // Налоговая ставка из кабинета
      advertisingPercent: 3, // 3% на рекламу
      otherExpenses: 0,
      storageDays: 30
    });

    // Получаем историю продаж этого товара (если есть)
    // TODO: Интегрировать с WB API для получения реальной истории продаж

    return NextResponse.json({
      success: true,
      taxRate: taxRate, // Возвращаем налоговую ставку
      product: {
        nmId: parseInt(nmId),
        name: product?.name || product?.generatedName || `Товар ${nmId}`,
        vendorCode: product?.vendorCode,
        category: product?.subcategory?.name || 'Без категории',
        parentCategory: product?.subcategory?.parentCategory?.name,
        price: saleData.priceWithDiscount,
        originalPrice: saleData.originalPrice,
        costPrice: saleData.costPrice,
        deliveryType: saleData.deliveryType,
        dimensions: {
          length: saleData.length,
          width: saleData.width,
          height: saleData.height,
          weight: saleData.weight
        }
      },
      financialAnalysis: calculation,
      commissions: {
        fbw: commissions.commissionFbw,
        fbs: commissions.commissionFbs,
        dbs: commissions.commissionDbs,
        cc: commissions.commissionCc,
        edbs: commissions.commissionEdbs
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения детальной аналитики:', error);
    return NextResponse.json({
      error: 'Ошибка получения данных',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}
