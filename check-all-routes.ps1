$routes = Get-ChildItem -Path "src\app\api" -Filter "route.ts" -Recurse -File
$missing = @()

foreach ($route in $routes) {
  $content = Get-Content $route.FullName | Out-String
  if ($content -notmatch "export const dynamic") {
    $missing += $route.FullName
  }
}

if ($missing.Count -eq 0) {
  Write-Host "`n✅ All routes have 'export const dynamic'!" -ForegroundColor Green
} else {
  Write-Host "`n❌ Routes without force-dynamic: $($missing.Count)" -ForegroundColor Red
  foreach ($path in $missing) {
    Write-Host "  $path" -ForegroundColor Yellow
  }
}
