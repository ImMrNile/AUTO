# 🚀 Деплой на Vercel

## Шаг 1: Настройте переменные окружения в Vercel

Откройте Vercel Dashboard → Settings → Environment Variables

### Обязательные переменные:

```bash
# Database
DATABASE_URL=your-postgres-url
DIRECT_URL=your-postgres-direct-url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=8494857300:AAE_1ZD8X9sRlmMaAPhpbTvzXJYBSM7Hins
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=nealaibot

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-key

# Wildberries API (опционально)
WB_API_TOKEN=your-wb-token
```

## Шаг 2: Настройте домен Telegram бота

В @BotFather:

```
/setdomain
@nealaibot
your-app.vercel.app
```

Замените `your-app.vercel.app` на ваш реальный домен Vercel.

## Шаг 3: Деплой

```bash
npx vercel --prod
```

Или через Git:
1. Push в GitHub
2. Vercel автоматически задеплоит

## Шаг 4: Проверка

После деплоя откройте:

```
https://your-app.vercel.app/auth/telegram
```

Должна появиться кнопка "Login with Telegram"

## Шаг 5: Настройте Telegram Mini App

В @BotFather:

```
/newapp
@nealaibot
Название: WB Automation
Описание: Автоматизация Wildberries
URL: https://your-app.vercel.app
```

## Проверка работы

### ПК:
```
https://your-app.vercel.app/auth/telegram
→ Кнопка "Login with Telegram"
→ Авторизация
```

### Mini App:
```
Telegram → @nealaibot → Запустить Mini App
→ Автоматическая авторизация
→ Данные синхронизированы с ПК
```

## Troubleshooting

### Ошибка "Domain not configured"
```
/setdomain в @BotFather
@nealaibot
your-app.vercel.app
```

### Ошибка "Build failed"
Проверьте что все переменные окружения настроены в Vercel

### База данных не подключается
Проверьте `DATABASE_URL` и `DIRECT_URL` в Vercel

## Готово!

Ваше приложение задеплоено и работает! 🎉
