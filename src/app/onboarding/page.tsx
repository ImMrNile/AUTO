'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  ArrowRight,
  Info,
  LogOut
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [cabinetName, setCabinetName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);

  // Определяем, запущено ли приложение в Telegram Mini App
  useEffect(() => {
    // Очищаем флаг редиректа при загрузке страницы онбординга
    sessionStorage.removeItem('redirectingToOnboarding');
    console.log('🧹 [Onboarding] Флаг редиректа очищен');
    
    const isMiniApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
    setIsTelegramMiniApp(!!isMiniApp);
    
    if (isMiniApp && window.Telegram?.WebApp) {
      console.log('📱 [Onboarding] Запущено в Telegram Mini App');
      const webApp = window.Telegram.WebApp;
      
      // Настраиваем Telegram WebApp
      webApp.ready();
      webApp.expand();
      
      // Проверяем версию API (методы доступны с версии 6.1+)
      const version = parseFloat(webApp.version || '6.0');
      console.log(`📱 [Telegram WebApp] Версия: ${version}`);
      
      // Устанавливаем цвета для Telegram (только для версии 6.1+)
      if (version >= 6.1) {
        try {
          if ('setHeaderColor' in webApp && typeof webApp.setHeaderColor === 'function') {
            (webApp as any).setHeaderColor('#6366f1');
          }
          if ('setBackgroundColor' in webApp && typeof webApp.setBackgroundColor === 'function') {
            (webApp as any).setBackgroundColor('#f8fafc');
          }
        } catch (e) {
          console.warn('⚠️ [Telegram WebApp] Не удалось установить цвета:', e);
        }
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cabinetName.trim()) {
      setError('Укажите название кабинета');
      return;
    }

    if (!apiToken.trim()) {
      setError('Укажите API токен');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 [Onboarding] Отправка данных кабинета...');
      
      const response = await fetch('/api/cabinets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: cabinetName,
          apiToken: apiToken.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [Onboarding] Ошибка:', data.error);
        throw new Error(data.error || 'Ошибка при добавлении кабинета');
      }

      console.log('✅ [Onboarding] Кабинет успешно добавлен');
      
      // Успешно добавлен кабинет - устанавливаем флаг и переходим на главную
      sessionStorage.setItem('justAddedCabinet', 'true');
      
      // Очищаем кеш кабинетов для принудительной перезагрузки
      try {
        // Очищаем все ключи кеша, связанные с кабинетами
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('cabinets') || key.includes('analytics'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('🗑️ [Onboarding] Очищен кеш кабинетов и аналитики');
      } catch (e) {
        console.warn('⚠️ [Onboarding] Не удалось очистить кеш:', e);
      }
      
      // Если в Telegram Mini App, показываем уведомление (только для версии 6.2+)
      if (isTelegramMiniApp && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        const version = parseFloat(webApp.version || '6.0');
        
        if (version >= 6.2) {
          try {
            if ('showAlert' in webApp && typeof webApp.showAlert === 'function') {
              (webApp as any).showAlert('✅ Кабинет успешно добавлен!');
            }
          } catch (e) {
            console.warn('⚠️ [Telegram WebApp] showAlert не поддерживается:', e);
          }
        } else {
          console.log('ℹ️ [Telegram WebApp] showAlert не поддерживается в версии', version);
        }
      }
      
      // Небольшая задержка перед редиректом для очистки кеша
      setTimeout(() => {
        // Используем window.location.href для жесткого редиректа
        window.location.href = '/';
      }, 100);
      
    } catch (err: any) {
      console.error('❌ [Onboarding] Exception:', err);
      setError(err.message || 'Произошла ошибка');
      
      // Если в Telegram Mini App, показываем уведомление об ошибке (только для версии 6.2+)
      if (isTelegramMiniApp && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        const version = parseFloat(webApp.version || '6.0');
        
        if (version >= 6.2) {
          try {
            if ('showAlert' in webApp && typeof webApp.showAlert === 'function') {
              (webApp as any).showAlert('❌ ' + (err.message || 'Произошла ошибка'));
            }
          } catch (e) {
            console.warn('⚠️ [Telegram WebApp] showAlert не поддерживается:', e);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-6 md:py-12 px-3 md:px-4 relative">
      {/* Кнопка выхода в правом верхнем углу */}
      <button
        onClick={handleLogout}
        className="fixed top-3 right-3 md:top-6 md:right-6 z-50 bg-white/80 backdrop-blur-sm border-2 border-gray-300 rounded-lg md:rounded-xl p-2 md:p-3 hover:bg-white hover:border-purple-500 transition-all shadow-lg hover:shadow-xl"
        title="Выйти"
      >
        <LogOut className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
      </button>

      {/* Фоновые фигуры */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-20">
        {/* Заголовок */}
        <div className="text-center mb-4 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl md:rounded-2xl mb-3 md:mb-4 shadow-lg">
            <Store className="w-7 h-7 md:w-10 md:h-10 text-white" />
          </div>
          <h1 className="text-xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2 px-2">
            Добро пожаловать в WB Automation! 🎉
          </h1>
          <p className="text-sm md:text-lg text-gray-600 px-4">
            Для начала работы добавьте ваш первый кабинет Wildberries
          </p>
        </div>

        {/* Основная карточка */}
        <div className="liquid-glass rounded-2xl md:rounded-3xl border-2 border-gray-300 p-4 md:p-8 shadow-2xl mb-4 md:mb-6">
          
          {/* Инструкция */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-8">
            <div className="flex items-start gap-2 md:gap-4">
              <div className="flex-shrink-0">
                <Info className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">
                  📋 Как получить API токен Wildberries
                </h3>
                
                <ol className="space-y-2 md:space-y-3 text-gray-700 text-sm md:text-base">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">1</span>
                    <div>
                      <p className="font-semibold text-sm md:text-base">Войдите в личный кабинет WB</p>
                      <a 
                        href="https://seller.wildberries.ru/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-xs md:text-sm"
                      >
                        seller.wildberries.ru
                        <ExternalLink className="w-3 h-3 md:w-3 md:h-3" />
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">2</span>
                    <div>
                      <p className="font-semibold text-sm md:text-base">Перейдите в раздел "Настройки" → "Доступ к API"</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">3</span>
                    <div>
                      <p className="font-semibold text-sm md:text-base">Создайте новый токен со следующими разрешениями:</p>
                      <div className="mt-2 bg-white/80 border-2 border-gray-300 rounded-lg p-2 md:p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2 text-xs md:text-sm">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span>Контент (Товары)</span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span>Цены и скидки</span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span>Остатки</span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span>Статистика</span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span>Аналитика</span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span>Продвижение</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">4</span>
                    <div>
                      <p className="font-semibold text-sm md:text-base">Скопируйте полученный токен</p>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">⚠️ Токен показывается только один раз! Сохраните его в безопасном месте.</p>
                    </div>
                  </li>
                </ol>

                <div className="mt-3 md:mt-4 p-2 md:p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="text-xs md:text-sm text-gray-700">
                    <strong>💡 Важно:</strong> API токен должен иметь ВСЕ необходимые разрешения для полноценной работы приложения.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Ошибка */}
            {error && (
              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-red-50 border-2 border-red-300 rounded-lg md:rounded-xl">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm md:text-base text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Название кабинета */}
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-900 mb-1.5 md:mb-2">
                Название кабинета
              </label>
              <div className="relative">
                <Store className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  value={cabinetName}
                  onChange={(e) => setCabinetName(e.target.value)}
                  placeholder="Например: Основной магазин"
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 bg-white/80 border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm md:text-base text-gray-900 placeholder-gray-400"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-gray-600">
                Придумайте название для вашего кабинета (например, "Основной", "Тестовый")
              </p>
            </div>

            {/* API токен */}
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-900 mb-1.5 md:mb-2">
                API токен Wildberries
              </label>
              <div className="relative">
                <Key className="absolute left-3 md:left-4 top-3 md:top-4 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <textarea
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Вставьте ваш API токен из личного кабинета WB..."
                  rows={3}
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 bg-white/80 border-2 border-gray-300 rounded-lg md:rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm md:text-base text-gray-900 placeholder-gray-400 resize-none font-mono text-xs md:text-sm"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-gray-600">
                Токен должен начинаться с "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
              <button
                type="submit"
                disabled={isLoading || !cabinetName.trim() || !apiToken.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    <span className="hidden sm:inline">Добавление кабинета...</span>
                    <span className="sm:hidden">Добавление...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Добавить кабинет</span>
                    <span className="sm:hidden">Добавить</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Дополнительная информация */}
        <div className="liquid-glass rounded-xl md:rounded-2xl border-2 border-gray-300 p-4 md:p-6 shadow-lg">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            Что дальше?
          </h3>
          <div className="space-y-2 md:space-y-3 text-sm md:text-base text-gray-700">
            <div className="flex items-start gap-2 md:gap-3">
              <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xs md:text-sm font-bold">1</span>
              </div>
              <p>После добавления кабинета вы попадете на главную страницу</p>
            </div>
            <div className="flex items-start gap-2 md:gap-3">
              <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xs md:text-sm font-bold">2</span>
              </div>
              <p>Сможете создавать товары с помощью AI</p>
            </div>
            <div className="flex items-start gap-2 md:gap-3">
              <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xs md:text-sm font-bold">3</span>
              </div>
              <p>Публиковать товары на Wildberries</p>
            </div>
            <div className="flex items-start gap-2 md:gap-3">
              <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xs md:text-sm font-bold">4</span>
              </div>
              <p>Анализировать продажи и управлять товарами</p>
            </div>
          </div>
        </div>

        {/* Помощь */}
        <div className="mt-4 md:mt-6 text-center">
          <p className="text-sm md:text-base text-gray-600">
            Нужна помощь?{' '}
            <a href="https://t.me/your_support" className="text-blue-600 hover:text-blue-700 font-medium">
              Напишите в поддержку
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
