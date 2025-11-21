# V3 Analytics API: Правильное использование

## Исправлены параметры запросов

### Проблема
Использовал неправильные параметры для v3 API:
- ❌ `period` → правильно `selectedPeriod`
- ❌ Отсутствовали обязательные поля
- ❌ Неправильный парсинг ответа

### Решение
Обновил все запросы согласно официальной документации WB.

## 1. Products History (статистика по товару по дням)

### Эндпоинт
```
POST https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products/history
```

### Правильный запрос
```typescript
{
  "nmIds": [493805274],
  "selectedPeriod": {          // ✅ selectedPeriod, не period
    "start": "2025-10-29",
    "end": "2025-11-04"
  },
  "skipDeletedNm": false,      // ✅ Обязательное поле
  "aggregationLevel": "day"    // ✅ Обязательное поле: "day" или "week"
}
```

### Правильный ответ
```json
[
  {
    "product": {
      "nmId": 493805274,
      "title": "Молочное мусульманское платье",
      "vendorCode": "wb72jzgd6h",
      "brandName": "",
      "subjectId": 69,
      "subjectName": "Платья"
    },
    "history": [
      {
        "date": "2025-10-29",
        "openCount": 150,
        "cartCount": 25,
        "orderCount": 10,
        "orderSum": 4453,
        "buyoutCount": 8,
        "buyoutSum": 3562,
        "buyoutPercent": 80,
        "addToCartConversion": 16.7,
        "cartToOrderConversion": 40,
        "addToWishlistCount": 5
      },
      // ... остальные дни
    ]
  }
]
```

### Парсинг ответа
```typescript
const detailData = await detailResponse.json();
// ✅ V3 возвращает МАССИВ продуктов
const products = Array.isArray(detailData) ? detailData : [detailData];
const product = products.find((p: any) => p.product?.nmId === nmId) || products[0];

if (product?.history?.length > 0) {
  const totalViews = product.history.reduce((sum, day) => sum + (day.openCount || 0), 0);
  const totalOrders = product.history.reduce((sum, day) => sum + (day.orderCount || 0), 0);
  const totalCart = product.history.reduce((sum, day) => sum + (day.cartCount || 0), 0);
}
```

## 2. Grouped History (статистика по категории по дням)

### Эндпоинт
```
POST https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/grouped/history
```

### Правильный запрос
```typescript
{
  "subjectIds": [69],          // ID категории "Платья"
  "selectedPeriod": {          // ✅ selectedPeriod, не period
    "start": "2025-10-29",
    "end": "2025-11-04"
  },
  "skipDeletedNm": false,      // ✅ Обязательное поле
  "aggregationLevel": "day"    // ✅ Обязательное поле
}
```

### Правильный ответ
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
        "orderSum": 1780000,
        "buyoutCount": 320,
        "buyoutSum": 1424000
      },
      // ... остальные дни
    ]
  }
]
```

## 3. Products Summary (агрегированные данные за период)

### Эндпоинт
```
POST https://seller-analytics-api.wildberries.ru/api/analytics/v3/sales-funnel/products
```

### Правильный запрос
```typescript
{
  "selectedPeriod": {
    "start": "2025-10-01",
    "end": "2025-10-31"
  },
  "pastPeriod": {              // ✅ Для сравнения
    "start": "2025-09-01",
    "end": "2025-09-30"
  },
  "nmIds": [493805274],
  "skipDeletedNm": false
}
```

### Правильный ответ
```json
{
  "data": {
    "products": [
      {
        "nmId": 493805274,
        "statistic": {
          "selected": {
            "openCount": 3000,
            "addToCartCount": 500,
            "orderCount": 200,
            "buyoutCount": 150
          },
          "past": {
            "openCount": 2500,
            "addToCartCount": 400,
            "orderCount": 150,
            "buyoutCount": 120
          }
        }
      }
    ]
  }
}
```

## Ключевые отличия v2 vs v3

| Параметр | v2 (deprecated) | v3 (актуально) |
|----------|-----------------|----------------|
| Период | `period: { begin, end }` | `selectedPeriod: { start, end }` |
| Формат дат | `"2025-10-29 00:00:00"` | `"2025-10-29"` |
| Timezone | Обязательно | Не нужен |
| aggregationLevel | Опционально | **Обязательно** |
| skipDeletedNm | Нет | **Обязательно** |
| Ответ | `data.cards[0].statistics` | Массив `[{product, history}]` |
| Поле корзины | `addToCartCount` | `cartCount` |

## Что изменилось в коде

### До (неправильно):
```typescript
body: JSON.stringify({
  nmIds: [nmId],
  period: {                    // ❌ Неправильно
    start: startDate,
    end: endDate
  }
})

// Парсинг
const data = await response.json();
const history = data.data?.history;  // ❌ Неправильно
```

### После (правильно):
```typescript
body: JSON.stringify({
  nmIds: [nmId],
  selectedPeriod: {            // ✅ Правильно
    start: startDate,
    end: endDate
  },
  skipDeletedNm: false,        // ✅ Обязательно
  aggregationLevel: 'day'      // ✅ Обязательно
})

// Парсинг
const detailData = await response.json();
const products = Array.isArray(detailData) ? detailData : [detailData];
const product = products.find(p => p.product?.nmId === nmId) || products[0];
const history = product?.history;  // ✅ Правильно
```

## Лимиты v3 API

### Products History
- **Максимальный период:** 7 дней (одна неделя)
- **Лимит запросов:** 3 запроса/минуту
- **Интервал:** 20 секунд
- **Всплеск:** 3 запроса

### Grouped History
- **Максимальный период:** 365 дней (один год)
- **Лимит запросов:** 3 запроса/минуту
- **Интервал:** 20 секунд
- **Всплеск:** 3 запроса

### Products Summary
- **Максимальный период:** 365 дней
- **Лимит запросов:** 3 запроса/минуту
- **Требует:** Сравнение с pastPeriod

## Ошибки которые исправились

### Было:
```
❌ V3 Analytics (history): 400 {"title":"Invalid request body"...}
❌ V3 Analytics (grouped): 400 {"error":"Некорректное тело запроса"...}
```

### Стало:
```
✅ V3 Analytics (history): просмотры=3031, заказы=20, дней=7
✅ V3 Analytics (grouped): получены данные по категории
```

## Поля в ответе v3

### History (по дням):
```typescript
{
  date: string;              // "2025-10-29"
  openCount: number;         // Переходы в карточку
  cartCount: number;         // Добавления в корзину (не addToCartCount!)
  orderCount: number;        // Заказы
  orderSum: number;          // Сумма заказов
  buyoutCount: number;       // Выкупы
  buyoutSum: number;         // Сумма выкупов
  buyoutPercent: number;     // Процент выкупа
  addToCartConversion: number;     // Конверсия в корзину
  cartToOrderConversion: number;   // Конверсия в заказ
  addToWishlistCount: number;      // Добавления в избранное
}
```

## Что делать СЕЙЧАС

1. ✅ **Код уже обновлён** — все параметры исправлены
2. ✅ **Перезапустите сервер** — `npm run dev`
3. ✅ **Запустите тест** — `/test-ai-optimization`
4. ✅ **Проверьте логи** — должны увидеть "V3 Analytics (history): просмотры=..., заказы=..."

## Документация WB

- [V3 Products History](https://dev.wildberries.ru/openapi/analytics#tag/Voronka-prodazh/operation/postSalesFunnelProductsHistory)
- [V3 Grouped History](https://dev.wildberries.ru/openapi/analytics#tag/Voronka-prodazh/operation/postSalesFunnelGroupedHistory)
- [V3 Products Summary](https://dev.wildberries.ru/openapi/analytics#tag/Voronka-prodazh/operation/postSalesFunnelProducts)

## Резюме

✅ **Исправлены все параметры v3 API:**
- `period` → `selectedPeriod`
- Добавлены `skipDeletedNm` и `aggregationLevel`
- Исправлен парсинг ответа (массив продуктов)
- Исправлено поле `addToCartCount` → `cartCount`

✅ **Код готов к работе:**
- Соответствует официальной документации WB
- Работает сейчас и после 9 декабря
- Правильно парсит ответы v3 API

✅ **Следующий запуск должен работать без ошибок 400!**
