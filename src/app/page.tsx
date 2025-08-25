'use client';

import { useEffect, useState } from 'react';
import { Plus, Package, Users, BarChart3 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// Импортируем существующий компонент ProductForm
import ProductForm from './components/ProductForm/ProductForm';

type Tab = 'upload' | 'products' | 'cabinets' | 'analytics';

// Компонент анимированного фона
const AnimatedBackground = () => (
  <>
    <div className="animated-background"></div>
    <div className="floating-shapes">
      <div className="floating-shape shape-1"></div>
      <div className="floating-shape shape-2"></div>
      <div className="floating-shape shape-3"></div>
    </div>
  </>
);

// Основной компонент страницы
export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  useEffect(() => {
    const tab = searchParams?.get('tab') as Tab;
    if (tab && ['upload', 'products', 'cabinets', 'analytics'].includes(tab)) {
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
      id: 'products' as Tab, 
      label: 'Товары', 
      icon: Package,
      description: 'Управление'
    },
    { 
      id: 'cabinets' as Tab, 
      label: 'Кабинеты', 
      icon: Users,
      description: 'Настройки'
    },
    { 
      id: 'analytics' as Tab, 
      label: 'Аналитика', 
      icon: BarChart3,
      description: 'Отчёты'
    },
  ];

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Заголовок */}
          <div className="text-center mb-8 fade-in">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent mb-4">
              WB Automation
            </h1>
            <p className="text-xl text-gray-300">
              Автоматизация работы с Wildberries
            </p>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                ИИ-анализ изображений
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                Автозаполнение характеристик
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Готово к публикации
              </span>
            </div>
          </div>

          {/* Навигация */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 glass-container p-2 max-w-2xl mx-auto scale-in">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex-1 min-w-[120px] p-4 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                      : 'text-gray-300 hover:bg-black/30 hover:text-white'
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <IconComponent size={20} />
                    <div className="text-sm font-semibold">{tab.label}</div>
                    <div className="text-xs opacity-70">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Контент */}
          {activeTab === 'upload' && (
            <ProductForm onSuccess={loadStats} />
          )}

          {activeTab === 'products' && (
            <div className="glass-container p-8 text-center fade-in">
              <Package className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Управление товарами</h2>
              <p className="text-gray-300 mb-6">
                Просматривайте, редактируйте и публикуйте созданные товары
              </p>
              
              <div className="glass-container p-6 bg-gray-800/20">
                <div className="text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">У вас пока нет созданных товаров</p>
                  <button 
                    className="glass-button-primary"
                    onClick={() => handleTabChange('upload')}
                  >
                    <Plus className="w-4 h-4" />
                    Создать первый товар
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cabinets' && (
            <div className="glass-container p-8 text-center fade-in">
              <Users className="w-16 h-16 mx-auto text-purple-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Управление кабинетами</h2>
              <p className="text-gray-300 mb-6">
                Настройка и управление кабинетами Wildberries
              </p>
              
              <div className="space-y-4">
                <button className="glass-button-primary w-full py-4">
                  <Plus className="w-5 h-5" />
                  Добавить кабинет
                </button>
                
                <div className="glass-container p-6 bg-gray-800/20">
                  <div className="text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Добавьте первый кабинет для работы</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="glass-container p-8 fade-in">
              <div className="text-center mb-8">
                <BarChart3 className="w-16 h-16 mx-auto text-orange-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-4">Аналитика и отчёты</h2>
                <p className="text-gray-300">
                  Статистика продаж, анализ эффективности и детальные отчёты
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="glass-container p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Продажи</h3>
                      <p className="text-sm text-gray-400">За последние 30 дней</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">0 ₽</div>
                  <p className="text-sm text-gray-400">Нет данных для отображения</p>
                </div>
                
                <div className="glass-container p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Товары</h3>
                      <p className="text-sm text-gray-400">Всего создано</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">0</div>
                  <p className="text-sm text-gray-400">Создайте первый товар</p>
                </div>
              </div>
              
              <div className="glass-container p-6 text-center bg-gray-800/20">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                <p className="text-gray-400">Аналитика появится после создания товаров</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}