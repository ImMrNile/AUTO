# СКРИПТ АВТОМАТИЧЕСКОГО ТЕСТИРОВАНИЯ
# Запускает полное тестирование всех функций приложения

Write-Host "🚀 Запуск полного тестирования приложения..." -ForegroundColor Cyan
Write-Host ""

# Проверка что сервер запущен
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
    }
} catch {
    $serverRunning = $false
}

if (-not $serverRunning) {
    Write-Host "❌ Сервер не запущен на http://localhost:3000" -ForegroundColor Red
    Write-Host "Запустите сервер командой: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Сервер запущен и доступен" -ForegroundColor Green
Write-Host ""

# Запуск тестов
Write-Host "📋 Начинаю тестирование..." -ForegroundColor Cyan
Write-Host ""

# Компиляция и запуск TypeScript теста
npx tsx test-automation.ts

Write-Host ""
Write-Host "✅ Тестирование завершено! Проверьте файл FULL_TEST_REPORT.md" -ForegroundColor Green
