#!/usr/bin/env pwsh

# Удаляем все папки dist в src
$distFolders = Get-ChildItem -Path "src" -Recurse -Directory -Filter "dist"

foreach ($folder in $distFolders) {
    Write-Host "Удаляем: $($folder.FullName)"
    Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
}

# Удаляем .next кэш
if (Test-Path ".next") {
    Write-Host "Удаляем .next кэш..."
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "✅ Очистка завершена"
