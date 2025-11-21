# ✅ Исправления WB API для получения данных оптимизации

## Проблемы и решения

### 1. ❌ Sales Funnel Error 400: "excess limit on days"

**Проблема:**
```
❌ [Sales Funnel] Ошибка 400: {
  "title": "Invalid request body",
  "detail": "validate: invalid start day: excess limit on days"
}
```

**Причина:** 
- Использовался период 7 дней, но с неправильными датами (4 дня назад - 10 дней назад)
- WB API для `/api/analytics/v3/sales-funnel/products/history` позволяет **максимум 7 дней**
- Конечная дата должна быть **вчера** (не сегодня)

**Решение:**
```typescript
// БЫЛО:
const endDate = new Date();
endDate.setDate(endDate.getDate() - 4); // 4 дня назад
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 6); // 7 дней

// СТАЛО:
const endDate = new Date();
endDate.setDate(endDate.getDate() - 1); // Вчера
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 6); // 7 дней (включая оба конца)
```

**Добавлены обязательные параметры:**
```typescript
body: JSON.stringify({
  selectedPeriod: {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  },
  nmIds: [nmId],
  skipDeletedNm: true,        // ← ДОБАВЛЕНО
  aggregationLevel: 'day'     // ← ДОБАВЛЕНО
})
```

---

### 2. ❌ Campaign Stats Error 404: "path not found"

**Проблема:**
```
❌ [Campaign Stats] Ошибка получения кампаний 404: {
  "title": "path not found",
  "detail": "Please consult the https://dev.wildberries.ru/openapi/api-information"
}
```

**Причина:** 
- Использовался несуществующий endpoint `/adv/v0/adverts`
- Правильный endpoint: `/adv/v1/promotion/adverts`
- Метод должен быть **POST**, а не GET

**Решение:**
```typescript
// БЫЛО:
const campaignsResponse = await fetch(
  'https://advert-api.wildberries.ru/adv/v0/adverts',
  {
    method: 'GET',
    headers: {
      'Authorization': apiToken
    }
  }
);

// СТАЛО:
const campaignsResponse = await fetch(
  'https://advert-api.wildberries.ru/adv/v1/promotion/adverts',
  {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([])  // Пустой массив = все кампании
  }
);
```

**Фильтрация кампаний:**
```typescript
// Упрощена фильтрация - только autoParams.nms
const relevantCampaigns = campaigns.filter((c: any) => {
  const nms = c.autoParams?.nms || [];
  return nms.includes(nmId);
});
```

---

### 3. ❌ Keyword Stats Error 404: "path not found"

**Проблема:** Та же ошибка - использовался `/adv/v0/adverts`

**Решение:** Аналогично Campaign Stats - используем `/adv/v1/promotion/adverts`

```typescript
const campaignsResponse = await fetch(
  'https://advert-api.wildberries.ru/adv/v1/promotion/adverts',
  {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([])
  }
);
```

---

## Правильные endpoints WB API

### Analytics API (seller-analytics-api.wildberries.ru)

| Endpoint | Метод | Описание | Ограничения |
|----------|-------|----------|-------------|
| `/api/v2/search-report/product/search-texts` | POST | Поисковые запросы | 30 дней |
| `/api/analytics/v3/sales-funnel/products` | POST | Конверсия (период) | 30 дней |
| `/api/analytics/v3/sales-funnel/products/history` | POST | Воронка (по дням) | **7 дней** |

### Advert API (advert-api.wildberries.ru)

| Endpoint | Метод | Описание | Ограничения |
|----------|-------|----------|-------------|
| `/adv/v1/promotion/count` | GET | Количество кампаний | - |
| `/adv/v1/promotion/adverts` | **POST** | Список кампаний | body: [] |
| `/adv/v3/fullstats` | GET | Статистика кампаний | 30 дней |
| `/adv/v0/normquery/stats` | POST | Ключевые слова | 30 дней |

---

## Структура запросов

### Sales Funnel (History)
```json
{
  "selectedPeriod": {
    "start": "2025-10-29",
    "end": "2025-11-04"
  },
  "nmIds": [493805274],
  "skipDeletedNm": true,
  "aggregationLevel": "day"
}
```

### Campaign List
```json
[]  // Пустой массив = все кампании
```

или

```json
[1234567, 7654321]  // Конкретные ID кампаний
```

### Keyword Stats
```json
{
  "id": 11111111,  // Campaign ID
  "dates": {
    "from": "2025-10-05",
    "to": "2025-11-04"
  }
}
```

---

## Ожидаемые результаты

После исправлений:

```
✅ [Search Queries] Данные получены
✅ [Conversion] Данные получены
✅ [Campaign Stats] Статистика получена
✅ [Sales Funnel] Данные получены
✅ [Keyword Stats] Получено результатов: X
```

---

## Файлы изменены

- `src/app/api/products/[id]/optimization-data/route.ts`:
  - `fetchSalesFunnel()` - исправлен период (7 дней, конец = вчера)
  - `fetchCampaignStats()` - исправлен endpoint на `/adv/v1/promotion/adverts` (POST)
  - `fetchKeywordStats()` - исправлен endpoint на `/adv/v1/promotion/adverts` (POST)

---

## Документация WB API

- **Analytics:** https://dev.wildberries.ru/en/openapi/analytics
- **Promotion:** https://dev.wildberries.ru/en/openapi/promotion
- **API Information:** https://dev.wildberries.ru/en/openapi/api-information

---

## Тестирование

Проверьте логи после запроса:

```
📊 [Optimization Data] Результаты запросов:
   🔍 Поисковые запросы: ✅
   📊 Конверсия: ✅
   📢 Кампании: ✅
   🛒 Воронка: ✅
   🔑 Ключевые слова: ✅
```

Если все ✅ - система работает корректно!
