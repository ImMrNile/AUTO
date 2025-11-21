# 🚀 Исправление ошибок деплоя на Vercel

## ✅ Что было исправлено

### 1. Ошибка Prisma при сборке

**Проблема:**
```
Error: @prisma/client did not initialize yet. 
Please run "prisma generate"
```

**Решение:**
В `package.json` уже есть `postinstall` скрипт:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

Vercel автоматически выполнит `prisma generate` после установки зависимостей.

### 2. Dynamic Server Usage ошибки

**Проблема:**
```
Dynamic server usage: Route couldn't be rendered statically 
because it used `cookies`, `request.url`, `headers()`
```

**Решение:**
Добавлено `export const dynamic = 'force-dynamic'` в 21 API route:

```typescript
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ... ваш код
}
```

**Исправленные файлы:**
- ✅ `/api/account/api-keys/route.ts`
- ✅ `/api/analytics/dashboard/route.ts`
- ✅ `/api/analytics/conversion/route.ts`
- ✅ `/api/analytics/product-details/route.ts`
- ✅ `/api/analytics/product-detailed/route.ts`
- ✅ `/api/analytics/comprehensive/route.ts`
- ✅ `/api/auth/telegram/callback/route.ts`
- ✅ `/api/auth/convert-supabase-session/route.ts`
- ✅ `/api/check-vendor-code/route.ts`
- ✅ `/api/cron/check-prices/route.ts`
- ✅ `/api/products/categories/route.ts`
- ✅ `/api/products/user/route.ts`
- ✅ `/api/user/balance/route.ts`
- ✅ `/api/wb/characteristics/route.ts`
- ✅ `/api/wb/orders/today/route.ts`
- ✅ `/api/wb/product-analytics/route.ts`
- ✅ `/api/wb/subcategories/route.ts`
- ✅ `/api/test/wb-api/route.ts`
- ✅ `/api/test/tariffs/route.ts`
- ✅ `/auth/session/route.ts`
- ✅ `/auth/user/route.ts`

## 📋 Чеклист перед деплоем

### 1. Переменные окружения в Vercel

Добавьте в Settings → Environment Variables:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

# OpenAI
OPENAI_API_KEY="sk-proj-..."

# Encryption
ENCRYPTION_KEY="WbTokenEncryptionKey123456789012"

# Telegram
TELEGRAM_BOT_TOKEN="8494857300:..."
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="nealaibot"

# Cron
CRON_SECRET="wb-analytics-cron-secret-2024"

# Debug (опционально)
DEBUG_MODEL_SELECTION=true
LOG_MODEL_PERFORMANCE=true
MODEL_VALIDATION_ENABLED=true
AUTO_MODEL_FALLBACK=true
```

### 2. Настройка Prisma

Убедитесь, что в `package.json` есть:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build"
  }
}
```

### 3. Проверка перед деплоем

```bash
# Локальная сборка
npm run build

# Если ошибок нет - можно деплоить
git add .
git commit -m "Fix: Add force-dynamic to API routes"
git push
```

## 🔧 Если деплой всё ещё падает

### Проверьте логи Vercel

1. Откройте ваш проект в Vercel
2. Deployments → Последний деплой
3. View Function Logs

### Частые проблемы

**1. Prisma не может подключиться к БД**

Проверьте:
- `DATABASE_URL` правильный
- База данных доступна из Vercel (не localhost)
- Используется `?pgbouncer=true` для Supabase

**2. Ошибки импорта**

Проверьте:
- Все импорты используют алиасы `@/` или относительные пути
- Нет циклических зависимостей

**3. Timeout при сборке**

Увеличьте timeout в `vercel.json`:
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "maxDuration": 60
      }
    }
  ]
}
```

## 🎉 Готово!

После исправлений деплой должен пройти успешно. Проверьте:

1. ✅ Build завершился без ошибок
2. ✅ Все API routes работают
3. ✅ Авторизация работает
4. ✅ База данных подключена

## 📚 Дополнительно

### Мониторинг после деплоя

Проверьте в Vercel:
- Analytics → Errors (должно быть 0)
- Logs → Function Logs (проверьте на ошибки)

### Rollback при проблемах

Если что-то сломалось:
1. Vercel Dashboard → Deployments
2. Найдите последний рабочий деплой
3. Нажмите "..." → Promote to Production

### Полезные команды

```bash
# Проверка типов
npm run type-check

# Линтинг
npm run lint

# Локальная сборка
npm run build

# Запуск production сборки локально
npm run start
```
