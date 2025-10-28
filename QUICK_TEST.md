# ⚡ Быстрый тест (2 минуты)

## Шаг 1: Настройте домен в @BotFather

Откройте Telegram → @BotFather:

```
/setdomain
@nealaibot
localhost
```

## Шаг 2: Откройте тестовую страницу

```
http://localhost:3000/test-telegram
```

## Шаг 3: Нажмите кнопку

Увидите кнопку "Login with Telegram" → нажмите

## Что должно произойти:

1. Откроется Telegram
2. Запросит подтверждение
3. После подтверждения → авторизация!
4. В консоли браузера (F12) увидите логи

## Если не работает:

### Ошибка "Domain not configured"
```
/setdomain в @BotFather
@nealaibot
localhost
```

### Кнопка не появляется
```bash
# Перезапустите сервер
npm run dev
```

### Проверьте .env
```
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="nealaibot"
```

## Готово!

После успешного теста используйте:
- **ПК:** `http://localhost:3000/auth/telegram`
- **Mini App:** через бота в Telegram
