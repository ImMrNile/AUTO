// src/app/auth/telegram-desktop/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../components/Auth';
import { AlertCircle, QrCode, Copy, Check, Smartphone, ArrowRight } from 'lucide-react';

export default function TelegramDesktopPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  
  const [sessionId, setSessionId] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 минут
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Генерируем QR-код при загрузке
  useEffect(() => {
    generateQRCode();
  }, []);

  // Таймер для отсчета времени
  useEffect(() => {
    if (timeLeft <= 0) {
      setError('Время истекло. Пожалуйста, обновите страницу и попробуйте снова.');
      setIsPolling(false);
      setShowDirectLogin(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  // ✅ ОПТИМИЗИРОВАНО: Polling для проверки авторизации
  // Увеличен интервал с 2 до 5 секунд для снижения нагрузки
  useEffect(() => {
    if (!isPolling || !sessionId) return;

    const checkAuth = async () => {
      try {
        const response = await fetch(`/api/auth/telegram-session/${sessionId}`);
        const data = await response.json();

        if (data.authenticated && data.token) {
          console.log('✅ Авторизация через Telegram успешна');
          setSuccess(true);
          setIsPolling(false);

          // Обновляем контекст пользователя
          await refreshUser();

          // Перенаправляем на главную страницу через 1 секунду
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1000);
        }
      } catch (err) {
        console.error('Ошибка при проверке сессии:', err);
        // При ошибке соединения показываем кнопку прямого входа
        setShowDirectLogin(true);
      }
    };

    // Проверяем каждые 5 секунд (увеличено с 2 для снижения нагрузки)
    const pollInterval = setInterval(checkAuth, 5000);

    return () => clearInterval(pollInterval);
  }, [isPolling, sessionId, router, refreshUser]);

  const handleDirectLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Открываем новое окно для авторизации через Telegram
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        `https://oauth.telegram.org/auth?bot_id=${process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID}&origin=${encodeURIComponent(window.location.origin)}&request_access=write`,
        'telegram_auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Слушаем сообщения от popup окна
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'TELEGRAM_AUTH_SUCCESS') {
          const { user } = event.data;
          
          // Обновляем контекст пользователя
          await refreshUser();
          
          // Закрываем popup
          if (popup) popup.close();
          
          // Удаляем обработчик
          window.removeEventListener('message', handleMessage);
          
          // Перенаправляем на главную
          router.push('/');
          router.refresh();
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error('Ошибка при авторизации через Telegram:', err);
      setError('Не удалось выполнить вход. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      setError('');
      setShowDirectLogin(false);
      
      console.log('🔄 [QR Code] Создаем новую сессию...');
      
      // Создаем новую сессию через API
      const response = await fetch('/api/auth/telegram-session/create', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      const newSessionId = data.sessionId;
      
      console.log(`✅ [QR Code] Сессия создана: ${newSessionId}`);
      
      setSessionId(newSessionId);
      setTimeLeft(300); // Сбрасываем таймер

      // Получаем имя бота
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'nealaibot';

      // Генерируем QR-код
      const botLink = `https://t.me/${botUsername}?start=${newSessionId}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(botLink)}`;

      console.log(`📱 [QR Code] Ссылка на бота: ${botLink}`);
      
      setQrCode(qrUrl);
      setSuccess(false);
      setIsPolling(true);
    } catch (err) {
      console.error('❌ [QR Code] Ошибка при генерации:', err);
      setError('Ошибка при генерации QR-кода. Проверьте настройки бота.');
      setShowDirectLogin(true);
    }
  };

  const copyLink = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'nealaibot';
    const link = `https://t.me/${botUsername}?start=${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-2xl text-center">
            <div className="mb-4 flex justify-center">
              <Check className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Авторизация успешна!
            </h2>
            <p className="text-gray-600 mb-6">
              Вы успешно авторизовались через Telegram. Перенаправление...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      {/* Background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Вход через Telegram
            </h1>
            <p className="text-gray-600">
              Отсканируйте QR-код или нажмите на кнопку ниже
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col items-center">
              {qrCode ? (
                <>
                  <div className="mb-4 p-2 bg-white rounded-lg border-2 border-blue-100">
                    <img 
                      src={qrCode} 
                      alt="Telegram Login QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    Отсканируйте QR-код в приложении Telegram
                  </p>
                  
                  <div className="w-full mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'nealaibot'}?start=${sessionId}`}
                        className="w-full px-4 py-2 pr-10 text-sm border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={copyLink}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600"
                        title="Скопировать ссылку"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-4">
                    Или откройте ссылку вручную
                  </div>
                </>
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Загрузка QR-кода...</p>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-2">
                Действителен: {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={generateQRCode}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
              disabled={isLoading}
            >
              <QrCode className="w-5 h-5" />
              Обновить QR-код
            </button>
            
            <button
              onClick={handleDirectLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200"
              disabled={isLoading}
            >
              <Smartphone className="w-5 h-5" />
              Войти через Telegram
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <div className="text-center mt-4">
              <Link 
                href="/auth/login" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Вернуться к входу
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}