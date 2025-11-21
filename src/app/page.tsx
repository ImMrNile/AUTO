'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { Plus, Package, Users, BarChart3, User, Loader2, Clock, TrendingUp } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// Динамический импорт компонентов для оптимизации
const SinglePageProductForm = lazy(() => import('./components/ProductForm/SinglePageProductForm'));
const AccountManager = lazy(() => import('./components/shared/AccountManager'));
const ProductsWithAnalytics = lazy(() => import('./components/products').then(mod => ({ default: mod.ProductsWithAnalytics })));
const InProgressProducts = lazy(() => import('./components/products').then(mod => ({ default: mod.InProgressProducts })));
const AnalyticsDashboard = lazy(() => import('./components/analytics').then(mod => ({ default: mod.AnalyticsDashboard })));

// Статический импорт только для критичных компонентов
import TaskNotifications from './components/BackgroundTasks/TaskNotifications';
import TaskResetButton from './components/BackgroundTasks/TaskResetButton';
import { CabinetSwitcher } from './components/layout';
import { useBackgroundTasks } from './components/BackgroundTasks/useBackgroundTasks';

type Tab = 'upload' | 'in-progress' | 'products' | 'analytics' | 'account';

// Компонент загрузки для Suspense
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
    </div>
  );
}

// Анимированный фон теперь в layout.tsx - убираем дублирование

// Основной компонент страницы
export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  
  // Система фоновых задач
  const { tasks, addTask, updateTask, removeTask, completeTask, errorTask } = useBackgroundTasks();

  // Инициализация: загружаем пользователя и кабинеты
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        // Очищаем старый флаг редиректа (если остался)
        sessionStorage.removeItem('redirectingToOnboarding');
        
        console.log('🚀 Инициализация приложения...');
        
        // 1. Проверяем сессию пользователя
        const sessionResponse = await fetch('/api/auth/session');
        if (!sessionResponse.ok) {
          throw new Error('Ошибка загрузки сессии');
        }
        const sessionData = await sessionResponse.json();
        
        if (!isMounted) return;
        
        console.log('✅ Пользователь загружен:', sessionData.user?.email);
        
        // 2. Загружаем кабинеты (без кеша для получения свежих данных)
        const cabinetsResponse = await fetch('/api/user/cabinets', {
          cache: 'no-store'
        });
        if (!cabinetsResponse.ok) {
          throw new Error('Ошибка загрузки кабинетов');
        }
        const cabinetsData = await cabinetsResponse.json();
        
        if (!isMounted) return;
        
        console.log('📦 Ответ API кабинетов:', JSON.stringify(cabinetsData, null, 2));
        const cabinets = cabinetsData.data?.cabinets || cabinetsData.cabinets || [];
        console.log('✅ Кабинеты загружены:', cabinets.length, 'кабинетов');
        
        // 3. Проверяем наличие кабинетов - если нет, редиректим на онбординг
        // НО не редиректим если мы только что добавили кабинет (проверка через флаг)
        const justAddedCabinet = sessionStorage.getItem('justAddedCabinet');
        if (justAddedCabinet) {
          sessionStorage.removeItem('justAddedCabinet');
          console.log('✅ Кабинет только что добавлен, пропускаем проверку');
        } else if (cabinets.length === 0) {
          console.log('⚠️ У пользователя нет кабинетов, редирект на /onboarding');
          
          // Устанавливаем флаг редиректа
          sessionStorage.setItem('redirectingToOnboarding', 'true');
          setIsRedirecting(true);
          
          // Используем жесткий редирект
          window.location.href = '/onboarding';
          return;
        }
        
        if (!isMounted) return;
        
        // 4. Инициализация завершена
        setIsInitialized(true);
        console.log('✅ Инициализация завершена - можно загружать товары и аналитику');
      } catch (error: any) {
        console.error('❌ Ошибка инициализации:', error);
        if (isMounted) {
          setInitError(error.message);
          setIsInitialized(true); // Всё равно разрешаем загрузку
        }
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    const tab = searchParams?.get('tab') as Tab;
    if (tab && ['upload', 'in-progress', 'products', 'analytics', 'account'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.push(url.pathname + url.search);
  };

  const loadStats = async () => {
    try {
      console.log('Обновление данных...');
    } catch (e) {
      console.error('Ошибка обновления данных:', e);
    }
  };

  const tabs = [
    { 
      id: 'upload' as Tab, 
      label: 'Создать', 
      icon: Plus,
      description: 'Новый товар'
    },
    { 
      id: 'in-progress' as Tab, 
      label: 'В работе', 
      icon: Clock,
      description: 'Обработка ИИ'
    },
    { 
      id: 'products' as Tab, 
      label: 'Товары', 
      icon: Package,
      description: 'Управление'
    },
    { 
      id: 'analytics' as Tab, 
      label: 'Аналитика', 
      icon: BarChart3,
      description: 'Отчёты'
    },
    // { 
    //   id: 'promotion' as Tab, 
    //   label: 'Продвижение', 
    //   icon: TrendingUp,
    //   description: 'Реклама и SEO'
    // },
    { 
      id: 'account' as Tab, 
      label: 'Аккаунт', 
      icon: User,
      description: 'Настройки и кабинеты'
    },
  ];

  // Показываем загрузку пока не инициализировано
  if (!isInitialized || isRedirecting) {
    return (
      <div className="min-h-screen relative z-10 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-xl border border-gray-200 text-center max-w-md w-full">
          {/* Круглый спиннер */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <Loader2 className="w-16 h-16 md:w-20 md:h-20 text-purple-600 animate-spin" />
          </div>
          
          {/* Текст с анимированными точками */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Загрузка
            <span className="inline-flex ml-1">
              <span className="animate-pulse" style={{ animationDelay: '0s' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
            </span>
          </h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen relative z-10 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          {/* Верхняя панель для мобильных - только кабинеты */}
          <div className="md:hidden mb-4 scale-in">
            <CabinetSwitcher onCabinetChange={setSelectedCabinet} />
          </div>

          {/* Десктопная версия - кабинет и навигация сверху */}
          <div className="hidden md:block">
            {/* Переключатель кабинетов и уведомления о задачах */}
            <div className="mb-6 scale-in flex items-start gap-4">
              <div className="flex-1">
                <CabinetSwitcher onCabinetChange={setSelectedCabinet} />
              </div>
              <div className="w-64">
                <TaskNotifications
                  tasks={tasks}
                  onRemoveTask={removeTask}
                  onViewProduct={(productId) => {
                    handleTabChange('products');
                  }}
                />
              </div>
            </div>

            {/* Навигация - горизонтальные кнопки с иконками */}
            <aside className="w-full max-w-5xl mx-auto mb-6 scale-in relative z-10">
              <div className="liquid-glass rounded-full p-3 flex justify-center items-center gap-3">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={`flex items-center gap-2 px-4 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-white/70 hover:text-gray-900'
                      }`}
                      onClick={() => handleTabChange(tab.id)}
                    >
                      <IconComponent size={20} />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          {/* Контент - используем условный рендеринг с Suspense для lazy loading */}
          {activeTab === 'upload' && (
            <Suspense fallback={<LoadingSpinner />}>
              <SinglePageProductForm 
                cabinetId={selectedCabinet}
                onSuccess={loadStats}
                onTaskStart={(productName: string) => addTask(productName)}
                onTaskUpdate={(taskId: string, updates: any) => updateTask(taskId, updates)}
                onTaskComplete={(taskId: string, productId?: string) => completeTask(taskId, productId)}
                onTaskError={(taskId: string, error: string) => errorTask(taskId, error)}
              />
            </Suspense>
          )}

          {activeTab === 'in-progress' && (
            <Suspense fallback={<LoadingSpinner />}>
              <InProgressProducts cabinetId={selectedCabinet} />
            </Suspense>
          )}

          {activeTab === 'products' && isInitialized && (
            <Suspense fallback={<LoadingSpinner />}>
              <ProductsWithAnalytics cabinetId={selectedCabinet} />
            </Suspense>
          )}

          {activeTab === 'analytics' && isInitialized && (
            <Suspense fallback={<LoadingSpinner />}>
              <AnalyticsDashboard cabinetId={selectedCabinet} />
            </Suspense>
          )}

          {activeTab === 'account' && (
            <Suspense fallback={<LoadingSpinner />}>
              <AccountManager />
            </Suspense>
          )}
        </div>
      </div>
      
      {/* Мобильная нижняя навигация - максимально расширенная */}
      <div className="md:hidden fixed bottom-4 left-2 right-2 z-50">
        <div className="liquid-glass rounded-2xl px-2 py-2.5 flex justify-around items-center gap-0.5 shadow-2xl">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 flex-1 min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <IconComponent size={20} />
                <span className="text-[10px] font-medium leading-tight truncate w-full text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Кнопка сброса зависших задач */}
      <TaskResetButton />
    </>
  );
}