# 🚀 Команды для Деплоя

## Быстрые команды

### 1. Обычный деплой (как у Vercel)
```powershell
npx netlify-cli deploy --prod
```

### 2. Обновить переменные окружения и задеплоить
```powershell
# Импортировать переменные из .env
npx netlify-cli env:import .env

# Затем задеплоить
npx netlify-cli deploy --prod
```

### 3. Использовать готовые скрипты
```powershell
# Просто деплой
.\deploy.ps1

# Обновить env и деплой
.\deploy-env.ps1
```

## Полезные команды Netlify CLI

### Просмотр текущих переменных окружения
```powershell
npx netlify-cli env:list
```

### Установить одну переменную
```powershell
npx netlify-cli env:set VARIABLE_NAME "value"
```

### Удалить переменную
```powershell
npx netlify-cli env:unset VARIABLE_NAME
```

### Посмотреть логи
```powershell
npx netlify-cli logs:function
```

### Открыть сайт в браузере
```powershell
npx netlify-cli open:site
```

### Открыть админку Netlify
```powershell
npx netlify-cli open:admin
```

### Посмотреть статус деплоя
```powershell
npx netlify-cli status
```

## Добавить в package.json

Добавьте эти скрипты в `package.json` для еще более быстрого деплоя:

```json
{
  "scripts": {
    "deploy": "netlify deploy --prod",
    "deploy:env": "netlify env:import .env && netlify deploy --prod",
    "netlify:status": "netlify status",
    "netlify:logs": "netlify logs:function",
    "netlify:open": "netlify open:site"
  }
}
```

Тогда можно будет использовать:
```powershell
npm run deploy
npm run deploy:env
npm run netlify:status
```

## Сравнение с Vercel

| Vercel | Netlify |
|--------|---------|
| `vercel` | `netlify deploy --prod` |
| `vercel --prod` | `netlify deploy --prod` |
| `vercel env pull` | `netlify env:list` |
| `vercel env add` | `netlify env:set` |
| `vercel logs` | `netlify logs:function` |

## Автоматический деплой при push в Git

Если вы подключите репозиторий к Netlify через UI:
1. Каждый push в main → автоматический деплой
2. Pull requests → preview деплой
3. Не нужно запускать команды вручную

**Настройка:**
1. Push код в GitHub
2. Зайти на https://app.netlify.com
3. Sites → nealai → Site settings → Build & deploy
4. Connect to Git provider → выбрать репозиторий

## Troubleshooting

### Ошибка: "Not authorized"
```powershell
npx netlify-cli login
```

### Ошибка: "Site not found"
```powershell
npx netlify-cli link
```

### Очистить кеш и задеплоить
```powershell
npx netlify-cli deploy --prod --clear-cache
```

### Деплой без билда (если уже собрали локально)
```powershell
npx netlify-cli deploy --prod --dir=.next
```

## Мониторинг

После деплоя проверьте:
- 🌐 Сайт: https://nealai.netlify.app
- 📊 Логи: https://app.netlify.com/sites/nealai/logs
- 📈 Аналитика: https://app.netlify.com/sites/nealai/analytics

---

**Совет:** Добавьте `deploy.ps1` и `deploy-env.ps1` в избранное в VS Code для быстрого доступа!
