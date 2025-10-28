'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import { AlertCircle, QrCode, Copy, Check } from 'lucide-react';

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

  // Генерируем QR-код при загрузке
  useEffect(() => {
    generateQRCode();
  }, []);

  // Таймер для отсчета времени
  useEffect(() => {
    if (timeLeft <= 0) {
      setError('Время истекло. Пожалуйста, обновите страницу и попробуйте снова.');
      setIsPolling(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Полинг для проверки авторизации
  useEffect(() => {
    if (!isPolling || !sessionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/telegram-session/${sessionId}`);
        const data = await response.json();

        if (data.authenticated && data.token) {
          console.log('✅ Авторизация через Telegram успешна');
          setSuccess(true);
          setIsPolling(false);
          clearInterval(pollInterval);

          // Обновляем контекст пользователя
          await refreshUser();

          // Перенаправляем на главную страницу через 2 секунды
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 2000);
        }
      } catch (err) {
        console.error('Ошибка при проверке сессии:', err);
      }
    }, 2000); // Проверяем каждые 2 секунды

    return () => clearInterval(pollInterval);
  }, [isPolling, sessionId, router, refreshUser]);

  const generateQRCode = async () => {
    try {
      setError('');
      
      // Генерируем новый session ID
      const newSessionId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => ('0' + b.toString(16)).slice(-2))
        .join('');
      
      setSessionId(newSessionId);
      setTimeLeft(300); // Сбрасываем таймер

      // Генерируем QR-код
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        `https://t.me/your_bot?start=${newSessionId}`
      )}`;

      setQrCode(qrUrl);
      setSuccess(false);
      setIsPolling(true);
    } catch (err) {
      console.error('Ошибка при генерации QR-кода:', err);
      setError('Ошибка при генерации QR-кода');
    }
  };

  const copyLink = () => {
    const link = `https://t.me/your_bot?start=${sessionId}`;
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Вход через Telegram
          </h1>
          <p className="text-gray-600">
            Отсканируйте QR-код или откройте ссылку в Telegram
          </p>
        </div>

        {/* Main Card */}
        <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-2xl">
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            {qrCode ? (
              <div className="p-4 bg-white rounded-xl border-2 border-gray-300">
                <img 
                  src={qrCode} 
                  alt="Telegram QR Code" 
                  className="w-64 h-64"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-200 rounded-xl animate-pulse flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2">Время истечения:</p>
            <p className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={copyLink}
            className="w-full py-3 bg-white/80 border-2 border-gray-300 hover:border-purple-400 text-gray-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-purple-50 mb-4"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-green-600">Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Скопировать ссылку</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 text-gray-600">или</span>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={generateQRCode}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Обновить QR-код
          </button>

          {/* Status */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {isPolling ? '⏳ Ожидание авторизации...' : '✓ Готово к сканированию'}
            </p>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-700">Хотите войти по-другому? </span>
            <Link
              href="/auth/login"
              className="text-purple-600 hover:text-purple-700 font-semibold underline"
            >
              Вернуться на вход
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Отсканируйте QR-код камерой вашего телефона или откройте ссылку в Telegram
        </p>
      </div>
    </div>
  );
}
