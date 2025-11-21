# 📁 СТРУКТУРА КОМПОНЕНТОВ

Компоненты организованы по функциональному назначению для улучшения навигации и поддержки кода.

---

## 📊 analytics/
**Компоненты аналитики и статистики**

- `AnalyticsDashboard.tsx` - Главный дашборд аналитики
- `AnalyticsLoadingSkeleton.tsx` - Скелетон загрузки аналитики
- `ProductDetailedAnalytics.tsx` - Детальная аналитика товара
- `MobileAnalyticsDashboard.tsx` - Мобильная версия дашборда

**Импорт:**
```typescript
import { AnalyticsDashboard } from '@/app/components/analytics';
```

---

## 📦 products/
**Компоненты управления товарами**

- `ProductsWithAnalytics.tsx` - Список товаров с аналитикой
- `InProgressProducts.tsx` - Товары в работе
- `ProductEditModal.tsx` - Модальное окно редактирования товара
- `ProductResultModal.tsx` - Модальное окно результатов
- `ProductFinancialDetails.tsx` - Финансовая детализация товара
- `ProductsLoadingSkeleton.tsx` - Скелетон загрузки товаров

**Импорт:**
```typescript
import { ProductsWithAnalytics, InProgressProducts } from '@/app/components/products';
```

---

## 📋 inventory/
**Компоненты управления складом**

- `InventoryManagement.tsx` - Управление остатками на складе

**Импорт:**
```typescript
import InventoryManagement from '@/app/components/inventory/InventoryManagement';
```

---

## 🎨 infographic/
**Компоненты создания инфографики**

- `InfographicCreator.tsx` - Создание инфографики для товаров

**Импорт:**
```typescript
import InfographicCreator from '@/app/components/infographic/InfographicCreator';
```

---

## 🔄 background/
**Фоновые задачи и синхронизация**

- `BackgroundSyncWorker.tsx` - Фоновая синхронизация данных (каждые 90 минут)
- `BackgroundProductLoader.tsx` - Фоновая загрузка товаров
- `BackgroundTaskInitializer.tsx` - Инициализация фоновых задач

**Импорт:**
```typescript
import { BackgroundSyncWorker } from '@/app/components/background';
```

---

## 🔐 Auth/
**Компоненты авторизации**

- `AuthGuard.tsx` - Защита маршрутов
- `AuthProvider.tsx` - Провайдер авторизации
- `TelegramLoginButton.tsx` - Кнопка входа через Telegram
- `TelegramMiniAppAuth.tsx` - Авторизация в Telegram Mini App

**Импорт:**
```typescript
import { AuthGuard, AuthProvider } from '@/app/components/Auth';
```

---

## 🎯 layout/
**Компоненты layout и навигации**

- `Header/` - Компоненты шапки сайта
- `Footer.tsx` - Подвал сайта
- `CabinetSection.tsx` - Секция кабинета
- `CabinetSwitcher.tsx` - Переключатель кабинетов
- `CookieConsent.tsx` - Согласие на cookies

**Импорт:**
```typescript
import { Footer, CabinetSwitcher } from '@/app/components/layout';
```

---

## 🛠️ shared/
**Общие переиспользуемые компоненты**

- `AccountManager.tsx` - Управление аккаунтом

**Импорт:**
```typescript
import AccountManager from '@/app/components/shared/AccountManager';
```

---

## 📝 ProductForm/
**Формы создания товаров**

- `SinglePageProductForm.tsx` - Одностраничная форма создания товара
- `Step4Results.tsx` - Шаг 4: Результаты создания

**Импорт:**
```typescript
import SinglePageProductForm from '@/app/components/ProductForm/SinglePageProductForm';
```

---

## 🔔 BackgroundTasks/
**Система фоновых задач**

- `TaskProvider.tsx` - Провайдер задач
- `TaskNotificationsGlobal.tsx` - Глобальные уведомления о задачах

**Импорт:**
```typescript
import { TaskProvider } from '@/app/components/BackgroundTasks';
```

---

## 💡 ПРЕИМУЩЕСТВА НОВОЙ СТРУКТУРЫ

### ✅ Лучшая организация
- Компоненты сгруппированы по функциональности
- Легко найти нужный компонент
- Понятная иерархия

### ✅ Удобный импорт
```typescript
// Старый способ
import AnalyticsDashboard from '@/app/components/AnalyticsDashboard';
import ProductsWithAnalytics from '@/app/components/ProductsWithAnalytics';

// Новый способ
import { AnalyticsDashboard } from '@/app/components/analytics';
import { ProductsWithAnalytics } from '@/app/components/products';
```

### ✅ Масштабируемость
- Легко добавлять новые компоненты в соответствующие категории
- Можно создавать подкатегории при необходимости

### ✅ Поддержка
- Проще ориентироваться в коде
- Быстрее находить связанные компоненты
- Удобнее рефакторить

---

## 🔄 МИГРАЦИЯ ИМПОРТОВ

После реорганизации нужно обновить импорты в файлах, которые используют перемещенные компоненты.

**Автоматический поиск:**
```bash
# Найти все файлы с импортами компонентов
grep -r "from '@/app/components/" src/
```

**Обновление импортов:**
```typescript
// Было
import BackgroundSyncWorker from './components/BackgroundSyncWorker'

// Стало
import BackgroundSyncWorker from './components/background/BackgroundSyncWorker'
// или
import { BackgroundSyncWorker } from './components/background'
```

---

## 📚 ДОПОЛНИТЕЛЬНО

### Создание нового компонента

1. Определи категорию компонента
2. Создай файл в соответствующей папке
3. Добавь экспорт в `index.ts` категории

**Пример:**
```typescript
// src/app/components/analytics/NewAnalyticsComponent.tsx
export default function NewAnalyticsComponent() {
  return <div>New Component</div>;
}

// src/app/components/analytics/index.ts
export { default as NewAnalyticsComponent } from './NewAnalyticsComponent';
```

### Добавление новой категории

1. Создай папку в `src/app/components/`
2. Создай `index.ts` с экспортами
3. Обнови этот README

---

**Дата реорганизации:** 30 октября 2025
