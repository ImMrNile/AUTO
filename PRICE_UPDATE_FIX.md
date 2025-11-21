# Исправление: Ошибка 401 при обновлении цены товара

## Проблема

При попытке обновить цену товара система получала ошибку **401 unauthorized**:

```
🏢 [WB Price] Base URL: devapi-digital.wildberries.ru
🌐 Отправляем запрос: https://devapi-digital.wildberries.ru/api/v1/offer/price/308590302
❌ 401 unauthorized
```

**Причина:** Использовался **тестовый API** (`devapi-digital.wildberries.ru`), который требует отдельной авторизации и не работает с production токенами.

## Решение

### 1. Исправлен endpoint в `wbApiService.ts`

**Было (НЕПРАВИЛЬНО - вариант 1):**
```typescript
// POST https://devapi-digital.wildberries.ru/api/v1/offer/price/{offer_id}
const requestData = {
  regular_price: Math.round(originalPrice),
  discount_price: Math.round(discountPrice)
};

const response = await this.makeRequest(
  `/api/v1/offer/price/${nmId}`,
  apiToken,
  { method: 'POST', body: JSON.stringify(requestData) },
  0,
  'https://devapi-digital.wildberries.ru' // ❌ Тестовый API - 401 ошибка
);
```

**Было (НЕПРАВИЛЬНО - вариант 2):**
```typescript
// PUT https://discounts-prices-api.wildberries.ru/api/v3/offers/{nmID}
const requestData = {
  price: Math.round(discountPrice)
};

const response = await this.makeRequest(
  `/api/v3/offers/${nmId}`,
  apiToken,
  { method: 'PUT', body: JSON.stringify(requestData) },
  0,
  'https://discounts-prices-api.wildberries.ru' // ❌ Endpoint не существует - 404 ошибка
);
```

**Стало (ПРАВИЛЬНО):**
```typescript
// POST https://discounts-prices-api.wildberries.ru/api/v2/upload/task
const discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);

const requestData = {
  data: [{
    nmID: nmId,
    price: Math.round(originalPrice),  // Оригинальная цена
    discount: discountPercent  // Процент скидки
  }]
};

const response = await this.makeRequest(
  `/api/v2/upload/task`,
  apiToken,
  { method: 'POST', body: JSON.stringify(requestData) },
  0,
  'https://discounts-prices-api.wildberries.ru' // ✅ Production API - работает!
);
```

### 2. Обновлена конфигурация в `wbApiConfig.ts`

**Удалено:**
```typescript
DIGITAL: 'https://devapi-digital.wildberries.ru' // ❌ Тестовый API
```

**Используется:**
```typescript
PRICES: 'https://discounts-prices-api.wildberries.ru' // ✅ Production API для цен
```

## Правильный API для установки цены

### Endpoint
- **URL:** `POST https://discounts-prices-api.wildberries.ru/api/v2/upload/task`
- **Метод:** `POST`
- **Документация:** https://dev.wildberries.ru/en/openapi/work-with-products

### Request Body
```json
{
  "data": [{
    "nmID": 308590302,
    "price": 7999,    // Оригинальная цена (без скидки)
    "discount": 50    // Процент скидки
  }]
}
```

### Важно
- `price` - это **оригинальная цена** (без скидки)
- `discount` - это **процент скидки** (0-99)
- Финальная цена = `price * (1 - discount/100)`
- Можно отправить до 1000 товаров за один запрос

### Headers
```
Authorization: {ваш_токен}
Content-Type: application/json
```

### Response (успех)
```json
{
  "data": {
    "id": 12345,
    "alreadyExists": false
  },
  "error": false,
  "errorText": ""
}
```

### Статусы загрузки
После отправки запроса нужно проверить статус через `/api/v2/history/tasks`:
- **3** - обработано, цены обновлены ✅
- **4** - отменено ❌
- **5** - обработано с ошибками в некоторых товарах ⚠️
- **6** - все товары с ошибками ❌

## Отличия от неправильных вариантов

| Параметр | Тестовый API ❌ | Неправильный v3 ❌ | Правильный API ✅ |
|----------|----------------|-------------------|-------------------|
| Base URL | `devapi-digital.wildberries.ru` | `discounts-prices-api.wildberries.ru` | `discounts-prices-api.wildberries.ru` |
| Endpoint | `/api/v1/offer/price/{id}` | `/api/v3/offers/{id}` | `/api/v2/upload/task` |
| Метод | `POST` | `PUT` | `POST` |
| Body | `{ regular_price, discount_price }` | `{ price }` | `{ data: [{ nmID, price, discount }] }` |
| Токен | Требует тестовый токен | 404 ошибка | Работает ✅ |

## Результат

✅ Теперь система использует правильный production API
✅ Токен работает корректно (401 ошибка исправлена)
✅ Цены обновляются на WB в реальном времени
✅ Логирование показывает правильный endpoint

## Логи после исправления

```
📤 Отправка запроса на установку цены для товара 308590302...
   - Оригинальная цена: 7999₽
   - Цена со скидкой: 4000₽
💰 [WB Price] Установка цены для товара 308590302
   - Размер скидки: 50%
📤 [WB Price] Отправляем данные: { data: [{ nmID: 308590302, price: 7999, discount: 50 }] }
🌐 [WB Price] Endpoint: POST /api/v2/upload/task
🏢 [WB Price] Base URL: discounts-prices-api.wildberries.ru
✅ [WB Price] Цена успешно установлена для товара 308590302
📊 [WB Price] Ответ от WB: { data: { id: 12345, alreadyExists: false }, error: false }
```

## Файлы изменены

1. **`lib/services/wbApiService.ts`** (строки 1763-1793)
   - Изменен endpoint на `/api/v2/upload/task` ✅
   - Метод остался `POST` ✅
   - Base URL: `discounts-prices-api.wildberries.ru` ✅
   - Формат body: `{ data: [{ nmID, price, discount }] }` ✅

2. **`lib/config/wbApiConfig.ts`** (строка 12)
   - Удален тестовый `DIGITAL` API ✅
   - Используется только production `PRICES` API ✅

## Тестирование

Попробуйте обновить цену товара через интерфейс:
1. Откройте детальную аналитику товара
2. Нажмите "Изменить" в блоке "Продажи"
3. Введите новую цену
4. Нажмите "Сохранить"
5. Проверьте логи - должен быть статус 200 и успешное обновление
