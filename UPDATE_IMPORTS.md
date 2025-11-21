# 🔄 ОБНОВЛЕНИЕ ИМПОРТОВ ПОСЛЕ РЕОРГАНИЗАЦИИ

## ❌ ОШИБКИ BUILD

Нужно обновить импорты в следующих файлах:

### 1. `src/app/(protected)/inventory/page.tsx`
```typescript
// Было
import InventoryManagement from '../../components/InventoryManagement'

// Стало
import InventoryManagement from '../../components/inventory/InventoryManagement'
```

### 2. `src/app/auth/debug/page.tsx`
```typescript
// Было
import { AuthProvider } from '../../components/AuthProvider'

// Стало
import { AuthProvider } from '../../components/Auth'
```

### 3. `src/app/auth/login/page.tsx`
```typescript
// Было
import { AuthProvider } from '../../components/AuthProvider'

// Стало
import { AuthProvider } from '../../components/Auth'
```

### 4. `src/app/auth/telegram-desktop/page.tsx`
```typescript
// Было
import { AuthProvider } from '../../components/AuthProvider'

// Стало
import { AuthProvider } from '../../components/Auth'
```

### 5. `src/app/page.tsx`
```typescript
// Было
import AccountManager from './components/AccountManager'

// Стало
import AccountManager from './components/shared/AccountManager'
```

---

## 📋 ПОЛНАЯ КАРТА ПЕРЕИМЕНОВАНИЙ

```
components/AnalyticsDashboard.tsx → components/analytics/AnalyticsDashboard.tsx
components/AnalyticsLoadingSkeleton.tsx → components/analytics/AnalyticsLoadingSkeleton.tsx
components/ProductDetailedAnalytics.tsx → components/analytics/ProductDetailedAnalytics.tsx
components/MobileAnalyticsDashboard.tsx → components/analytics/MobileAnalyticsDashboard.tsx

components/ProductsWithAnalytics.tsx → components/products/ProductsWithAnalytics.tsx
components/InProgressProducts.tsx → components/products/InProgressProducts.tsx
components/ProductEditModal.tsx → components/products/ProductEditModal.tsx
components/ProductResultModal.tsx → components/products/ProductResultModal.tsx
components/ProductFinancialDetails.tsx → components/products/ProductFinancialDetails.tsx
components/ProductsLoadingSkeleton.tsx → components/products/ProductsLoadingSkeleton.tsx

components/InventoryManagement.tsx → components/inventory/InventoryManagement.tsx

components/InfographicCreator.tsx → components/infographic/InfographicCreator.tsx

components/BackgroundSyncWorker.tsx → components/background/BackgroundSyncWorker.tsx
components/BackgroundProductLoader.tsx → components/background/BackgroundProductLoader.tsx
components/BackgroundTaskInitializer.tsx → components/background/BackgroundTaskInitializer.tsx

components/AuthGuard.tsx → components/Auth/AuthGuard.tsx
components/AuthProvider.tsx → components/Auth/AuthProvider.tsx

components/Footer.tsx → components/layout/Footer.tsx
components/CabinetSection.tsx → components/layout/CabinetSection.tsx
components/CabinetSwitcher.tsx → components/layout/CabinetSwitcher.tsx
components/CookieConsent.tsx → components/layout/CookieConsent.tsx
components/Header/ → components/layout/Header/

components/AccountManager.tsx → components/shared/AccountManager.tsx
```

---

## 🛠️ АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ

Запусти следующие команды для автоматического обновления импортов:

```powershell
# Найти все файлы с проблемными импортами
Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts | Select-String "from.*components/(AnalyticsDashboard|ProductsWithAnalytics|InventoryManagement|AuthProvider|AccountManager|BackgroundSyncWorker)" | Select-Object -ExpandProperty Path -Unique
```
