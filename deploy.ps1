# Скрипт для быстрого деплоя на Netlify
# Использование: .\deploy.ps1

Write-Host "🚀 Запуск деплоя на Netlify..." -ForegroundColor Green

# Проверка что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Ошибка: package.json не найден. Запустите скрипт из корня проекта." -ForegroundColor Red
    exit 1
}

# Опция 1: Деплой с билдом (по умолчанию)
Write-Host "📦 Билд и деплой приложения..." -ForegroundColor Cyan
npx netlify-cli deploy --prod

Write-Host "✅ Деплой завершен!" -ForegroundColor Green
Write-Host "🌐 Ваш сайт: https://nealai.netlify.app" -ForegroundColor Yellow
