# Исправление запроса к WB Analytics API (nm-report)

## Проблема

Запрос к WB Analytics API возвращал ошибку 400:
```
⚠️ Ошибка nm-report API: 400 - {"data":null,"error":true,"errorText":"Некоррректное тело запроса","additionalErrors":[{"field":"request body","description":"bind request body failed: code=400, message=invalid: page (field required), internal=invalid: page (field required)"}]}
```

## Причина

В запросе отсутствовал **обязательный параметр `page`**, который требуется согласно документации WB API.

## Решение

### 1. Добавлен параметр `page`

**Было:**
```typescript
const requestBody = {
  nmIDs: nmIds,
  period: {
    begin: dateFrom.toISOString().split('T')[0],
    end: dateTo.toISOString().split('T')[0]
  },
  timezone: 'Europe/Moscow',
  aggregationLevel: 'day'  // ❌ Неправильный параметр
};
```

**Стало:**
```typescript
const requestBody = {
  nmIDs: nmIds,
  period: {
    begin: dateFrom.toISOString().split('T')[0],
    end: dateTo.toISOString().split('T')[0]
  },
  timezone: 'Europe/Moscow',
  page: 1  // ✅ Обязательный параметр
};
```

### 2. Добавлена поддержка пагинации

Теперь метод `getNmReport()` загружает **все страницы данных**:

```typescript
let currentPage = 1;
let hasMorePages = true;

while (hasMorePages) {
  const requestBody = { ...params, page: currentPage };
  const response = await fetch(url, { body: JSON.stringify(requestBody) });
  const data = await response.json();
  
  allData.push(...data.data);
  
  if (data.data.length === 0 || !data.isNextPage) {
    hasMorePages = false;
  } else {
    currentPage++;
    await this.delay(300); // Задержка между запросами
  }
}
```

## Документация WB API

Согласно [официальной документации](https://dev.wildberries.ru/en/openapi/analytics):

**Endpoint:** `POST /api/v2/nm-report/detail`

**Обязательные параметры:**
- `period` - период выборки
- `page` - номер страницы (обязательно!)

**Опциональные параметры:**
- `nmIDs` - массив артикулов WB
- `brandNames` - массив брендов
- `objectIDs` - массив категорий
- `tagIDs` - массив тегов
- `timezone` - часовой пояс (по умолчанию Europe/Moscow)
- `orderBy` - сортировка

**Пример запроса:**
```json
{
  "nmIDs": [1234567],
  "period": {
    "begin": "2023-06-01",
    "end": "2024-03-01"
  },
  "timezone": "Europe/Moscow",
  "page": 1
}
```

## Результат

✅ Запросы к WB Analytics API теперь работают корректно
✅ Поддержка пагинации для больших объемов данных
✅ Получение реальных данных о конверсии (просмотры, добавления в корзину, заказы)

## Файлы изменены

- `lib/services/wbConversionService.ts` - исправлен метод `getNmReport()`
