'use client';

import { useState } from 'react';
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
  Copy,
  Check,
  LogOut
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [cabinetName, setCabinetName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
        throw new Error(data.error || 'Ошибка при добавлении кабинета');
      }

      // Успешно добавлен кабинет - устанавливаем флаг и переходим на главную
      sessionStorage.setItem('justAddedCabinet', 'true');
      router.refresh(); // Обновляем серверные компоненты
      setTimeout(() => {
        router.push('/');
      }, 100); // Небольшая задержка для завершения refresh
      
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        router.push('/auth/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 relative">
      {/* Кнопка выхода в правом верхнем углу */}
      <button
        onClick={handleLogout}
        className="fixed top-6 right-6 z-50 bg-white/80 backdrop-blur-sm border-2 border-gray-300 rounded-xl p-3 hover:bg-white hover:border-purple-500 transition-all shadow-lg hover:shadow-xl"
        title="Выйти"
      >
        <LogOut className="w-5 h-5 text-gray-700" />
      </button>

      {/* Фоновые фигуры */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-20">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Добро пожаловать в WB Automation! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Для начала работы добавьте ваш первый кабинет Wildberries
          </p>
        </div>

        {/* Основная карточка */}
        <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-2xl mb-6">
          
          {/* Инструкция */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  📋 Как получить API токен Wildberries
                </h3>
                
                <ol className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <div>
                      <p className="font-semibold">Войдите в личный кабинет WB</p>
                      <a 
                        href="https://seller.wildberries.ru/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-sm"
                      >
                        seller.wildberries.ru
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <div>
                      <p className="font-semibold">Перейдите в раздел "Настройки" → "Доступ к API"</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <div>
                      <p className="font-semibold">Создайте новый токен со следующими разрешениями:</p>
                      <div className="mt-2 bg-white/80 border-2 border-gray-300 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Контент (Товары)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Цены и скидки</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Остатки</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Статистика</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Аналитика</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Продвижение</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    <div>
                      <p className="font-semibold">Скопируйте полученный токен</p>
                      <p className="text-sm text-gray-600 mt-1">⚠️ Токен показывается только один раз! Сохраните его в безопасном месте.</p>
                    </div>
                  </li>
                </ol>

                <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>💡 Важно:</strong> API токен должен иметь ВСЕ необходимые разрешения для полноценной работы приложения.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ошибка */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Название кабинета */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Название кабинета
              </label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={cabinetName}
                  onChange={(e) => setCabinetName(e.target.value)}
                  placeholder="Например: Основной магазин"
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-400"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Придумайте название для вашего кабинета (например, "Основной", "Тестовый")
              </p>
            </div>

            {/* API токен */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                API токен Wildberries
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                <textarea
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Вставьте ваш API токен из личного кабинета WB..."
                  rows={4}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-400 resize-none font-mono text-sm"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Токен должен начинаться с "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading || !cabinetName.trim() || !apiToken.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Добавление кабинета...
                  </>
                ) : (
                  <>
                    Добавить кабинет
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Дополнительная информация */}
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Что дальше?
          </h3>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">1</span>
              </div>
              <p>После добавления кабинета вы попадете на главную страницу</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">2</span>
              </div>
              <p>Сможете создавать товары с помощью AI</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">3</span>
              </div>
              <p>Публиковать товары на Wildberries</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">4</span>
              </div>
              <p>Анализировать продажи и управлять товарами</p>
            </div>
          </div>
        </div>

        {/* Помощь */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
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
