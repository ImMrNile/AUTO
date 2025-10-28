# Скрипт для деплоя на Vercel
# Использование: .\vercel-deploy.ps1

Write-Host "🚀 Деплой на Vercel..." -ForegroundColor Green

# Проверка что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Ошибка: package.json не найден. Запустите скрипт из корня проекта." -ForegroundColor Red
    exit 1
}

# Production деплой
Write-Host "📦 Деплой в production..." -ForegroundColor Cyan
npx vercel --prod

Write-Host "✅ Деплой завершен!" -ForegroundColor Green
Write-Host "🌐 Проверьте ваш сайт на Vercel Dashboard" -ForegroundColor Yellow
