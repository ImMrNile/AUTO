# Скрипт для обновления переменных окружения и деплоя
# Использование: .\deploy-env.ps1

Write-Host "🔧 Обновление переменных окружения на Netlify..." -ForegroundColor Green

# Проверка наличия .env файла
if (-not (Test-Path ".env")) {
    Write-Host "❌ Ошибка: .env файл не найден" -ForegroundColor Red
    exit 1
}

# Импорт переменных окружения
Write-Host "📤 Импорт переменных из .env..." -ForegroundColor Cyan
npx netlify-cli env:import .env

Write-Host "✅ Переменные окружения обновлены!" -ForegroundColor Green

# Спросить пользователя хочет ли он сделать деплой
$deploy = Read-Host "Хотите запустить деплой сейчас? (y/n)"

if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "🚀 Запуск деплоя..." -ForegroundColor Green
    npx netlify-cli deploy --prod
    Write-Host "✅ Деплой завершен!" -ForegroundColor Green
    Write-Host "🌐 Ваш сайт: https://nealai.netlify.app" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  Деплой пропущен. Запустите .\deploy.ps1 когда будете готовы." -ForegroundColor Yellow
}
