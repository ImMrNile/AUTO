# 🚀 Установка Telegram OAuth

## Шаг 1: Обновите базу данных

```bash
npx prisma db push
npx prisma generate
```

## Шаг 2: Настройте Telegram бота

В Telegram откройте @BotFather:

```
/setdomain
Выберите вашего бота
Введите: your-app.vercel.app
```

## Шаг 3: Добавьте переменные окружения

В `.env` или Vercel:

```bash
TELEGRAM_BOT_TOKEN=your-bot-token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
```

## Шаг 4: Перезапустите сервер

```bash
npm run dev
```

## Готово!

Откройте:
- **ПК:** http://localhost:3000/auth/telegram
- **Mini App:** через Telegram бота
