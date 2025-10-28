'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export default function TelegramMiniAppAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const authenticateWithTelegram = async () => {
      try {
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

        console.log('Telegram Mini App auth, initData length:', initData.length);

        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ initData })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('sessionToken', data.sessionToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          router.push('/');
        } else {
          setError(data.error || 'Ошибка авторизации');
        }
      } catch (error) {
        console.error('Mini App auth error:', error);
        setError('Ошибка авторизации');
      } finally {
        setIsLoading(false);
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
