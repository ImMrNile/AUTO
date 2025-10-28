# Скрипт для добавления переменных окружения в Vercel
# Использование: .\setup-vercel-env.ps1

Write-Host "🔧 Настройка переменных окружения в Vercel..." -ForegroundColor Green

# Читаем .env файл
if (-not (Test-Path ".env")) {
    Write-Host "❌ Файл .env не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Найдены переменные в .env файле:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для добавления переменных в Vercel, выполните следующие команды:" -ForegroundColor Yellow
Write-Host ""

Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            Write-Host "npx vercel env add $name production" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "📝 Или используйте веб-интерфейс:" -ForegroundColor Cyan
Write-Host "https://vercel.com/mukammads-projects/nealai/settings/environment-variables" -ForegroundColor Blue
Write-Host ""
Write-Host "После добавления переменных, запустите:" -ForegroundColor Yellow
Write-Host "npx vercel --prod" -ForegroundColor White
