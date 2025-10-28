'use client';

import { useEffect, useState } from 'react';
import { Plus, Package, Users, BarChart3, User, Loader2, Clock, TrendingUp } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// Импортируем существующие компоненты
import SinglePageProductForm from './components/ProductForm/SinglePageProductForm';
import AccountManager from './components/AccountManager';
import ProductsWithAnalytics from './components/ProductsWithAnalytics';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PromotionDashboard from './components/PromotionDashboard';
import InProgressProducts from './components/InProgressProducts';
import TaskNotifications from './components/BackgroundTasks/TaskNotifications';
import TaskResetButton from './components/BackgroundTasks/TaskResetButton';
import CabinetSwitcher from './components/CabinetSwitcher';
import { useBackgroundTasks } from './components/BackgroundTasks/useBackgroundTasks';

type Tab = 'upload' | 'in-progress' | 'products' | 'analytics' | 'account';

// Анимированный фон теперь в layout.tsx - убираем дублирование

// Основной компонент страницы
export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  
  // Система фоновых задач
  const { tasks, addTask, updateTask, removeTask, completeTask, errorTask } = useBackgroundTasks();

  // Инициализация: загружаем пользователя и кабинеты
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 Инициализация приложения...');
        
        // 1. Проверяем сессию пользователя
        const sessionResponse = await fetch('/api/auth/session');
        if (!sessionResponse.ok) {
          throw new Error('Ошибка загрузки сессии');
        }
        const sessionData = await sessionResponse.json();
        console.log('✅ Пользователь загружен:', sessionData.user?.email);
        
        // 2. Загружаем кабинеты (без кеша для получения свежих данных)
        const cabinetsResponse = await fetch('/api/user/cabinets', {
          cache: 'no-store'
        });
        if (!cabinetsResponse.ok) {
          throw new Error('Ошибка загрузки кабинетов');
        }
        const cabinetsData = await cabinetsResponse.json();
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
          router.push('/onboarding');
          return;
        }
        
        // 4. Инициализация завершена
        setIsInitialized(true);
        console.log('✅ Инициализация завершена - можно загружать товары и аналитику');
      } catch (error: any) {
        console.error('❌ Ошибка инициализации:', error);
        setInitError(error.message);
        setIsInitialized(true); // Всё равно разрешаем загрузку
      }
    };
    
    initialize();
  }, []);

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
  if (!isInitialized) {
    return (
      <div className="min-h-screen relative z-10 flex items-center justify-center">
        <div className="liquid-glass rounded-3xl p-12 text-center max-w-md">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-purple-600 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Загрузка приложения...
          </h2>
          <p className="text-gray-600 mb-6">
            Проверяем сессию и загружаем кабинеты
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
              <span>Загрузка данных пользователя</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span>Загрузка кабинетов WB</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen relative z-10 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          {/* Верхняя панель для мобильных - только кабинеты */}
          <div className="md:hidden mb-4 scale-in relative z-10">
            <CabinetSwitcher onCabinetChange={setSelectedCabinet} />
          </div>

          {/* Десктопная версия - кабинет и навигация сверху */}
          <div className="hidden md:block">
            {/* Переключатель кабинетов и уведомления о задачах */}
            <div className="mb-6 scale-in relative z-10 flex items-start gap-4">
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

          {/* Контент - используем display: none вместо условного рендеринга */}
          <div style={{ display: activeTab === 'upload' ? 'block' : 'none' }}>
            <SinglePageProductForm 
              cabinetId={selectedCabinet}
              onSuccess={loadStats}
              onTaskStart={(productName: string) => addTask(productName)}
              onTaskUpdate={(taskId: string, updates: any) => updateTask(taskId, updates)}
              onTaskComplete={(taskId: string, productId?: string) => completeTask(taskId, productId)}
              onTaskError={(taskId: string, error: string) => errorTask(taskId, error)}
            />
          </div>

          <div style={{ display: activeTab === 'in-progress' ? 'block' : 'none' }} className="fade-in">
            {/* Показываем полноценный компонент на всех устройствах */}
            <InProgressProducts cabinetId={selectedCabinet} />
          </div>

          <div style={{ display: activeTab === 'products' ? 'block' : 'none' }} className="fade-in">
            {isInitialized && <ProductsWithAnalytics cabinetId={selectedCabinet} />}
          </div>

          <div style={{ display: activeTab === 'analytics' ? 'block' : 'none' }} className="fade-in">
            {isInitialized && <AnalyticsDashboard cabinetId={selectedCabinet} />}
          </div>

          {/* <div style={{ display: activeTab === 'promotion' ? 'block' : 'none' }} className="fade-in">
            {isInitialized && <PromotionDashboard cabinetId={selectedCabinet} />}
          </div> */}

          <div style={{ display: activeTab === 'account' ? 'block' : 'none' }} className="fade-in">
            <AccountManager />
          </div>
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