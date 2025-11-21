# Скрипт для очистки кеша Next.js и перезапуска

Write-Host "🧹 Очистка кеша Next.js..." -ForegroundColor Cyan

# Останавливаем процессы Node.js на порту 3000
Write-Host "⏹️ Останавливаем сервер на порту 3000..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($proc in $processes) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
        Write-Host "   Остановлен процесс: $proc" -ForegroundColor Green
    }
} else {
    Write-Host "   Нет активных процессов на порту 3000" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# Удаляем .next
if (Test-Path ".next") {
    Write-Host "🗑️ Удаляем .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
    Write-Host "   ✅ .next удален" -ForegroundColor Green
}

# Удаляем node_modules/.cache
if (Test-Path "node_modules/.cache") {
    Write-Host "🗑️ Удаляем node_modules/.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "   ✅ node_modules/.cache удален" -ForegroundColor Green
}

# Очищаем кеш npm
Write-Host "🧹 Очищаем кеш npm..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "   ✅ Кеш npm очищен" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Очистка завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Запускаем сервер..." -ForegroundColor Cyan
Write-Host ""

# Запускаем сервер
npm run dev
