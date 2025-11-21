# Альтернативные способы получения данных поиска WB

## Проблема
Основной API для поисковых запросов требует подписку **Jam**:
- ❌ `/api/v1/analytics/product/search-texts` - требует Jam
- ❌ Без Jam получаем ошибку 504 или пустые данные

## Текущие источники данных (БЕЗ Jam)

### ✅ 1. Search Report API (`/api/v2/search-report/report`)
**Статус:** Работает БЕЗ Jam  
**Токен:** Аналитика (Analytics)  
**Лимит:** Последние 90 дней

**Что дает:**
- Поисковые запросы с метриками
- Позиции в выдаче
- Открытия карточки, добавления в корзину
- Заказы по запросам

**3 стратегии запроса:**

#### A. По конкретному товару (nmId)
```typescript
POST /api/v2/search-report/report
{
  "currentPeriod": { "start": "2025-10-16", "end": "2025-10-22" },
  "pastPeriod": { "start": "2025-10-09", "end": "2025-10-15" },
  "nmIds": [356956444],
  "positionCluster": "all",
  "orderBy": { "field": "openCard", "mode": "desc" },
  "includeSubstitutedSKUs": true,
  "includeSearchTexts": false,
  "limit": 50,
  "offset": 0
}
```
**Результат:** Запросы, по которым находили ЭТОТ товар

#### B. По категории (subjectId)
```typescript
POST /api/v2/search-report/report
{
  "currentPeriod": { "start": "2025-10-16", "end": "2025-10-22" },
  "pastPeriod": { "start": "2025-10-09", "end": "2025-10-15" },
  "subjectIds": [4343],  // ID категории
  "positionCluster": "all",
  "orderBy": { "field": "openCard", "mode": "desc" },
  "includeSubstitutedSKUs": true,
  "includeSearchTexts": false,
  "limit": 50,
  "offset": 0
}
```
**Результат:** Запросы по всей категории (может быть нерелевантно)

#### C. Агрегированные данные (без фильтров)
```typescript
POST /api/v2/search-report/report
{
  "currentPeriod": { "start": "2025-10-16", "end": "2025-10-22" },
  "pastPeriod": { "start": "2025-10-09", "end": "2025-10-15" },
  "positionCluster": "all",
  "orderBy": { "field": "openCard", "mode": "desc" },
  "includeSubstitutedSKUs": true,
  "includeSearchTexts": false,
  "limit": 50,
  "offset": 0
}
```
**Результат:** ВСЕ запросы по всем товарам (очень много данных)

---

### ✅ 2. V3 Analytics Summary (`/api/v3/analytics/nm-report/detail`)
**Статус:** Работает БЕЗ Jam  
**Токен:** Аналитика (Analytics)  
**Лимит:** Последние 7 дней (!)

**Что дает:**
```typescript
GET /api/v3/analytics/nm-report/detail?nmIDs=356956444&period=week
```

**Метрики:**
- Просмотры (openCardCount)
- Добавления в корзину (addToCartCount)
- Заказы (ordersCount)
- Выкупы (buyoutsCount)
- Конверсии (CTR, CR, buyout rate)
- Остатки на складах

**Ограничение:** ⚠️ Только последние 7 дней!

---

### ✅ 3. Statistics API (`/api/v5/supplier/reportDetailByPeriod`)
**Статус:** Работает БЕЗ Jam  
**Токен:** Статистика (Statistics)  
**Лимит:** Последние 365 дней

**Что дает:**
```typescript
GET /api/v5/supplier/reportDetailByPeriod?dateFrom=2025-10-16&dateTo=2025-10-22
```

**Метрики:**
- Детальные данные о продажах
- Цены (priceWithDisc, finishedPrice)
- Даты заказов/продаж
- Склады (warehouseName)
- Регионы (oblast)

**Преимущество:** Исторические данные за год!

---

### ✅ 4. Campaign Statistics (`/adv/v3/fullstats`)
**Статус:** Работает БЕЗ Jam (если есть кампании)  
**Токен:** Продвижение (Promotion)  
**Лимит:** Зависит от дат кампаний

**Что дает:**
```typescript
GET /adv/v3/fullstats?from=2025-10-16&to=2025-10-22&ids=27673276,27673277
```

**Метрики:**
- Просмотры (views)
- Клики (clicks)
- Заказы (orders)
- CPM, CPC
- Расходы (sum)

**Проблема в логах:**
```
❌ Кампании (fullstats): 400 {"detail":"Invalid begin date"}
```

**Причина:** Неправильный формат даты или дата вне диапазона кампании

---

## Анализ текущих проблем

### 1. Поисковые запросы: 504 timeout
```
❌ Поисковые запросы (product/search-texts): 504 stream timeout
```

**Причина:** API `/api/v1/analytics/product/search-texts` требует Jam  
**Решение:** ✅ Уже используется fallback на `/api/v2/search-report/report`

### 2. Кампании: 400 Invalid begin date
```
❌ Кампании (fullstats): 400 {"detail":"Invalid begin date"}
```

**Возможные причины:**
1. Формат даты неправильный (нужен `YYYY-MM-DD`)
2. Дата `from` раньше создания кампании
3. Дата `to` позже завершения кампании
4. Кампания еще не запущена или уже удалена

**Решение:** Проверить даты кампаний перед запросом статистики

### 3. V3 Analytics: пропущено (>7 дней)
```
⏭️ V3 Analytics (history): пропущено (данные старше 7 дней, API лимит)
```

**Причина:** API `/api/v3/analytics/nm-report/detail` работает только для последних 7 дней  
**Решение:** ✅ Правильно пропускается для старых данных

---

## Рекомендации по улучшению

### 1. Исправить запрос статистики кампаний

**Проблема:**
```typescript
const statsUrl = `/adv/v3/fullstats?from=${startDate}&to=${endDate}&ids=${campaignIds}`;
```

**Решение:** Фильтровать кампании по датам активности

```typescript
// Фильтруем кампании, которые были активны в этом периоде
const relevantCampaigns = allCampaigns.filter((c: any) => {
  const nms = c.autoParams?.nms || [];
  const campaignSubjectId = c.autoParams?.subject?.id;
  const hasOurProduct = nms.includes(nmId);
  const subjectMatch = subjectId && campaignSubjectId === subjectId;
  
  if (!hasOurProduct && !subjectMatch) return false;
  
  // Проверяем даты активности кампании
  const campaignStart = c.startTime ? new Date(c.startTime) : null;
  const campaignEnd = c.endTime ? new Date(c.endTime) : null;
  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);
  
  // Кампания должна пересекаться с периодом
  if (campaignStart && campaignStart > periodEnd) return false; // Еще не началась
  if (campaignEnd && campaignEnd < periodStart) return false; // Уже закончилась
  
  return true;
});
```

### 2. Использовать grouped history для старых данных

Для данных старше 7 дней можно использовать:

```typescript
GET /api/v3/analytics/nm-report/grouped-history?nmIDs=356956444&period=month
```

**Что дает:**
- Агрегированные данные по дням
- Работает для данных старше 7 дней
- Меньше деталей, но есть основные метрики

### 3. Комбинировать источники данных

**Стратегия для разных периодов:**

| Период | Источник данных | API |
|--------|----------------|-----|
| Последние 7 дней | V3 Analytics Detail | `/api/v3/analytics/nm-report/detail` |
| 8-90 дней | Search Report | `/api/v2/search-report/report` |
| 8-90 дней | V3 Grouped History | `/api/v3/analytics/nm-report/grouped-history` |
| До 365 дней | Statistics API | `/api/v5/supplier/reportDetailByPeriod` |
| Любой период | Campaign Stats | `/adv/v3/fullstats` (если есть кампании) |

---

## Что можно получить БЕЗ Jam и БЕЗ Продвижения

### ✅ Доступно с токеном "Аналитика"

1. **Поисковые запросы** (90 дней)
   - `/api/v2/search-report/report` по nmId
   - Запросы, позиции, открытия, заказы

2. **Конверсия и метрики** (7 дней)
   - `/api/v3/analytics/nm-report/detail`
   - Просмотры, корзина, заказы, выкупы

3. **Исторические данные** (90 дней)
   - `/api/v3/analytics/nm-report/grouped-history`
   - Агрегированные метрики по дням

### ✅ Доступно с токеном "Статистика"

4. **Детальные продажи** (365 дней)
   - `/api/v5/supplier/reportDetailByPeriod`
   - Все заказы с ценами и датами

### ❌ Недоступно без подписок

- `/api/v1/analytics/product/search-texts` - требует **Jam**
- Детальная аналитика по ключевым словам - требует **Jam**
- Расширенная воронка продаж - требует **Jam**

---

## Итоговая стратегия

### Для товара БЕЗ Jam и БЕЗ Продвижения:

1. **Поисковые запросы:** Search Report API (90 дней)
2. **Конверсия:** V3 Analytics (7 дней) + Grouped History (90 дней)
3. **Продажи:** Statistics API (365 дней)
4. **Кампании:** Недоступно (нужен токен Продвижение)

### Минимальный набор данных для анализа:

✅ **Есть:**
- Поисковые запросы с метриками (90 дней)
- Просмотры, корзина, заказы (7-90 дней)
- Детальные продажи (365 дней)
- Конверсии и тренды

❌ **Нет:**
- Статистика рекламных кампаний
- Детальная аналитика ключевых слов (Jam)
- Расширенная воронка (Jam)

**Вывод:** Даже без Jam и Продвижения можно получить достаточно данных для базового анализа и оптимизации!
