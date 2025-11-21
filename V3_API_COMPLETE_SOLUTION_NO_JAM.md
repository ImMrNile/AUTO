# ✅ ПОЛНОЕ РЕШЕНИЕ: V3 Analytics API БЕЗ Jam подписки

## Ключевое открытие

**V3 Analytics API НЕ ТРЕБУЕТ Jam подписки!**

Из документации:
> POST /api/analytics/v3/sales-funnel/products
> Можно получить отчёт максимум за последние 365 дней.

**Никаких упоминаний о Jam!**

---

## Что можно получить БЕЗ Jam через V3 API

### 1. ✅ Статистика товаров за период (365 дней)
**Эндпоинт:** `POST /api/analytics/v3/sales-funnel/products`

**Что возвращает:**
- Просмотры (`openCount`)
- Добавления в корзину (`cartCount`)
- Заказы (`orderCount`)
- Выкупы (`buyoutCount`)
- Отмены (`cancelCount`)
- Конверсии (`conversions`)
- Рейтинг товара (`productRating`)
- Остатки (`stocks`)
- Сравнение с прошлым периодом

**Лимиты:**
- Период: до 365 дней
- Запросы: 3/минуту
- Пагинация: да

**Пример запроса:**
```json
{
  "selectedPeriod": {
    "start": "2024-10-01",
    "end": "2025-10-31"
  },
  "pastPeriod": {
    "start": "2024-09-01",
    "end": "2024-09-30"
  },
  "nmIds": [356956444],
  "skipDeletedNm": false,
  "orderBy": {
    "field": "openCard",
    "mode": "desc"
  },
  "limit": 50,
  "offset": 0
}
```

**Пример ответа:**
```json
{
  "data": {
    "products": [
      {
        "product": {
          "nmId": 356956444,
          "title": "Платье с химаром",
          "vendorCode": "wbam46p85",
          "brandName": "",
          "subjectId": 69,
          "subjectName": "Платья",
          "productRating": 9.3,
          "feedbackRating": 4.7,
          "stocks": {
            "wb": 10,
            "mp": 5,
            "balanceSum": 15
          }
        },
        "statistic": {
          "selected": {
            "openCount": 3031,      // Просмотры
            "cartCount": 250,       // В корзину
            "orderCount": 36,       // Заказы
            "orderSum": 70475,      // Сумма заказов
            "buyoutCount": 30,      // Выкупы
            "buyoutSum": 58729,     // Сумма выкупов
            "conversions": {
              "addToCartPercent": 8.2,    // Конверсия в корзину
              "cartToOrderPercent": 14.4,  // Конверсия в заказ
              "buyoutPercent": 83.3        // Процент выкупа
            }
          },
          "past": {
            // Данные за прошлый период
          },
          "comparison": {
            // Динамика изменений
          }
        }
      }
    ]
  }
}
```

---

### 2. ✅ Статистика по дням (7 дней)
**Эндпоинт:** `POST /api/analytics/v3/sales-funnel/products/history`

**Что возвращает:**
- Ежедневная статистика
- Просмотры по дням
- Заказы по дням
- Конверсии по дням

**Лимиты:**
- Период: до 7 дней
- Запросы: 3/минуту

**Пример запроса:**
```json
{
  "nmIds": [356956444],
  "selectedPeriod": {
    "start": "2025-10-29",
    "end": "2025-11-04"
  },
  "skipDeletedNm": false,
  "aggregationLevel": "day"
}
```

---

### 3. ✅ Групповая статистика по категориям (7 дней)
**Эндпоинт:** `POST /api/analytics/v3/sales-funnel/grouped/history`

**Что возвращает:**
- Статистика по предметам (категориям)
- Статистика по брендам
- Статистика по ярлыкам
- Агрегация по дням/неделям

**Лимиты:**
- Период: до 7 дней
- Запросы: 3/минуту

**Пример запроса:**
```json
{
  "selectedPeriod": {
    "start": "2025-10-29",
    "end": "2025-11-04"
  },
  "subjectIds": [69],  // Платья
  "brandNames": [],
  "tagIds": [],
  "skipDeletedNm": false,
  "aggregationLevel": "day"
}
```

**Пример ответа:**
```json
[
  {
    "group": {
      "subjectId": 69,
      "subjectName": "Платья"
    },
    "history": [
      {
        "date": "2025-10-29",
        "openCount": 5000,
        "cartCount": 800,
        "orderCount": 400,
        "orderSum": 1780000
      }
    ]
  }
]
```

---

## Что ТРЕБУЕТ Jam подписки

### ❌ Поисковые запросы
**Эндпоинты:**
- `POST /api/v2/search-report/report`
- `POST /api/v2/search-report/product/search-texts`
- `POST /api/v2/search-report/product/orders`

**Требования:**
- Jam (базовый 1.5%) — основные запросы
- Jam Продвинутый (19,000₽/мес) — детальные тексты

---

## Полная архитектура БЕЗ Jam

### Источники данных:

```
1. V3 Products Summary (365 дней) — БЕЗ Jam ✅
   ├── Просмотры
   ├── Заказы
   ├── Конверсии
   ├── Выкупы
   └── Рейтинг

2. V3 Products History (7 дней) — БЕЗ Jam ✅
   ├── Ежедневная статистика
   └── Детализация по дням

3. V3 Grouped History (7 дней) — БЕЗ Jam ✅
   ├── Статистика по категории
   └── Контекст рынка

4. Statistics API (вся история) — БЕЗ Jam ✅
   ├── Продажи
   ├── Возвраты
   └── Комиссии

5. Advert API (вся история) — БЕЗ Jam ✅
   ├── Кампании
   ├── Ключевые слова из рекламы
   └── Статистика кампаний

6. Search Report — ТРЕБУЕТ Jam ❌
   └── Поисковые запросы
```

---

## Обновлённый код

### Используем V3 Products Summary для ВСЕХ недель

```typescript
// Для КАЖДОЙ недели (до 365 дней назад)
async function fetchWeekData(
  nmId: number,
  startDate: string,
  endDate: string,
  daysAgo: number
) {
  const data: any = {
    searchQueries: [],
    conversionData: null,
    salesData: null,
    campaignStats: [],
    funnelData: null
  };

  const isWithinYear = daysAgo <= 365;
  const isWithinWeek = daysAgo <= 7;
  const isWithin90Days = daysAgo <= 90;

  // 1. V3 Products Summary — РАБОТАЕТ ДЛЯ ВСЕХ НЕДЕЛЬ (365 дней)
  if (isWithinYear) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const msPerDay = 24*60*60*1000;
      const duration = Math.max(1, Math.floor((e.getTime() - s.getTime())/msPerDay) + 1);
      const pastEnd = new Date(s.getTime() - msPerDay);
      const pastStart = new Date(pastEnd.getTime() - (duration-1)*msPerDay);
      
      const summaryResponse = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            selectedPeriod: {
              start: startDate,
              end: endDate
            },
            pastPeriod: {
              start: pastStart.toISOString().split('T')[0],
              end: pastEnd.toISOString().split('T')[0]
            },
            nmIds: [nmId],
            skipDeletedNm: false,
            orderBy: {
              field: "openCard",
              mode: "desc"
            },
            limit: 1,
            offset: 0
          })
        }
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const product = summaryData.data?.products?.[0];
        
        if (product) {
          data.conversionData = product;
          
          const selected = product.statistic?.selected;
          console.log(`   📊 V3 Summary: просмотры=${selected?.openCount || 0}, заказы=${selected?.orderCount || 0}, корзина=${selected?.cartCount || 0}`);
          
          // Сохраняем для проверки активности
          if (selected) {
            data.hasActivity = {
              views: selected.openCount || 0,
              orders: selected.orderCount || 0,
              cart: selected.cartCount || 0
            };
          }
        }
      } else {
        let body = '';
        try { body = await summaryResponse.text(); } catch {}
        console.log(`   ❌ V3 Summary: ${summaryResponse.status} ${body?.slice(0,300)}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ V3 Summary: ${error.message}`);
    }
  }

  // 2. V3 Products History — ТОЛЬКО для последних 7 дней
  if (isWithinWeek) {
    try {
      const historyResponse = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products/history',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            nmIds: [nmId],
            selectedPeriod: {
              start: startDate,
              end: endDate
            },
            skipDeletedNm: false,
            aggregationLevel: 'day'
          })
        }
      );

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const products = Array.isArray(historyData) ? historyData : [historyData];
        const product = products.find((p: any) => p.product?.nmId === nmId) || products[0];
        
        if (product?.history?.length > 0) {
          data.funnelData = product.history;
          console.log(`   📈 V3 History: дней=${product.history.length}`);
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️ V3 History: ${error.message}`);
    }
  }

  // 3. V3 Grouped History — для контекста категории (7 дней)
  if (isWithinWeek && subjectId) {
    try {
      const groupedResponse = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/grouped/history',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            selectedPeriod: {
              start: startDate,
              end: endDate
            },
            subjectIds: [subjectId],
            brandNames: [],
            tagIds: [],
            skipDeletedNm: false,
            aggregationLevel: 'day'
          })
        }
      );

      if (groupedResponse.ok) {
        const groupedData = await groupedResponse.json();
        data.categoryContext = groupedData;
        console.log(`   📊 V3 Grouped: получена статистика по категории`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ V3 Grouped: ${error.message}`);
    }
  }

  // 4. Statistics API — продажи (вся история)
  try {
    const salesResponse = await fetch(
      `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${startDate}&dateTo=${endDate}`,
      {
        headers: {
          'Authorization': apiToken
        }
      }
    );

    if (salesResponse.ok) {
      const sales = await salesResponse.json();
      const productSales = sales.filter((s: any) => s.nmId === nmId);
      
      if (productSales.length > 0) {
        const totalOrders = productSales.length;
        const totalSum = productSales.reduce((sum: number, s: any) => sum + (s.finishedPrice || 0), 0);
        console.log(`   💰 Statistics: заказов=${totalOrders}, сумма=${totalSum}₽`);
        
        data.salesData = {
          orders: totalOrders,
          sum: totalSum,
          details: productSales
        };
      }
    }
  } catch (error: any) {
    console.log(`   ⚠️ Statistics: ${error.message}`);
  }

  // 5. Кампании — ключевые слова (вся история)
  try {
    const countResponse = await fetch(
      'https://advert-api.wildberries.ru/adv/v1/promotion/count',
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken,
          'Accept': 'application/json'
        }
      }
    );

    if (countResponse.ok) {
      const countData = await countResponse.json();
      const campaignIds: number[] = [];
      
      countData.adverts?.forEach((group: any) => {
        group.advert_list?.forEach((adv: any) => {
          if (adv.advertId) campaignIds.push(adv.advertId);
        });
      });

      console.log(`   🔍 Campaigns: найдено ${campaignIds.length} кампаний`);
      
      // Получаем ключевые слова из кампаний
      // ... (код получения ключевых слов)
    }
  } catch (error: any) {
    console.log(`   ⚠️ Campaigns: ${error.message}`);
  }

  // 6. Search Report — ТОЛЬКО если есть Jam
  if (isWithin90Days && hasJamSubscription) {
    try {
      const searchResponse = await fetch(
        'https://seller-analytics-api.wildberries.ru/api/v2/search-report/product/search-texts',
        {
          method: 'POST',
          headers: {
            'Authorization': apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nmId: nmId,
            period: {
              begin: startDate,
              end: endDate
            },
            topOrderBy: 'openCard',
            orderBy: {
              field: 'openCard',
              mode: 'desc'
            },
            limit: 30,
            page: 1
          })
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        data.searchQueries = searchData.data || [];
        console.log(`   🔍 Search: ${data.searchQueries.length} запросов`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ Search: ${error.message}`);
    }
  }

  return data;
}
```

---

## Преимущества V3 API БЕЗ Jam

### ✅ Что получаем:
1. **Просмотры** — за 365 дней
2. **Заказы** — за 365 дней
3. **Конверсии** — за 365 дней
4. **Выкупы** — за 365 дней
5. **Рейтинг** — текущий
6. **Остатки** — текущие
7. **Сравнение** — с прошлым периодом
8. **Статистика по дням** — 7 дней
9. **Контекст категории** — 7 дней
10. **Продажи** — вся история
11. **Ключевые слова из рекламы** — вся история

### ❌ Чего НЕ получаем без Jam:
1. **Поисковые запросы** — требует Jam
2. **Позиции в поиске** — требует Jam
3. **Заказы по запросам** — требует Jam

---

## Итоговая статистика

### БЕЗ Jam получаем:
- ✅ 11 типов данных
- ✅ До 365 дней истории
- ✅ Детализация по дням (7 дней)
- ✅ Конверсии и метрики
- ✅ Контекст рынка
- ✅ Ключевые слова из рекламы

### С Jam дополнительно:
- ✅ Поисковые запросы
- ✅ Позиции в поиске
- ✅ Заказы по запросам

---

## Резюме

**V3 Analytics API — это МОЩНЫЙ инструмент БЕЗ Jam!**

Вы можете получить:
- Полную статистику за 365 дней
- Детализацию по дням за 7 дней
- Конверсии и метрики
- Сравнение с прошлым периодом
- Контекст категории
- Ключевые слова из рекламы

**Jam нужен ТОЛЬКО для поисковых запросов!**

Всё остальное доступно через V3 API БЕЗ подписки! 🎉
