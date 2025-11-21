'use client';

import { useEffect, useState } from 'react';
import { clientLogger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TelegramMiniAppAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isAuthenticating = false;

    const authenticateWithTelegram = async () => {
      // Предотвращаем множественные запросы
      if (isAuthenticating) {
        clientLogger.log('🔒 [Mini App Auth] Авторизация уже выполняется, пропускаем...');
        return;
      }

      try {
        isAuthenticating = true;

        if (!window.Telegram?.WebApp) {
          setError('Не удалось определить Telegram Mini App');
          setIsLoading(false);
          return;
        }

        const webApp = window.Telegram.WebApp;
        webApp.ready();
        webApp.expand();

        const initData = webApp.initData;
        
        if (!initData) {
          setError('Не удалось получить данные авторизации');
          setIsLoading(false);
          return;
        }

        clientLogger.log('📱 [Mini App Auth] Авторизация через Telegram Mini App');
        clientLogger.log('📱 [Mini App Auth] initData length:', initData.length);

        // Парсим данные пользователя из initData
        const user = webApp.initDataUnsafe.user;
        
        if (!user) {
          setError('Не удалось получить данные пользователя');
          setIsLoading(false);
          return;
        }

        clientLogger.log('📱 [Mini App Auth] User:', user);

        const response = await fetch('/api/auth/telegram-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            telegramId: user.id.toString(),
            username: user.username || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            initData: initData
          })
        });

        const data = await response.json();

        if (data.success) {
          clientLogger.log('✅ [Mini App Auth] Авторизация успешна');
          clientLogger.log('✅ [Mini App Auth] Пользователь:', data.user.name);
          clientLogger.log('✅ [Mini App Auth] redirectTo:', data.redirectTo);
          
          // Сохраняем токен и данные пользователя
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userData', JSON.stringify(data.user));
          
          // Небольшая задержка для установки cookie
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Используем redirectTo из ответа API
          const redirectPath = data.redirectTo || (data.hasCabinets ? '/' : '/onboarding');
          clientLogger.log('🔄 [Mini App Auth] Редирект на:', redirectPath);
          
          window.location.href = redirectPath;
        } else {
          clientLogger.error('❌ [Mini App Auth] Ошибка:', data.message);
          setError(data.message || 'Ошибка авторизации');
        }
      } catch (error) {
        clientLogger.error('❌ [Mini App Auth] Exception:', error);
        setError('Ошибка авторизации');
      } finally {
        setIsLoading(false);
        isAuthenticating = false;
      }
    };

    authenticateWithTelegram();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        <p className="mt-4 text-gray-600">Авторизация через Telegram...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-red-500 text-center">
            <p className="text-lg font-semibold mb-2">Ошибка авторизации</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
