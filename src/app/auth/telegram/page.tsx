'use client';

import { useEffect, useState } from 'react';
import TelegramLoginButton from '@/app/components/Auth/TelegramLoginButton';
import TelegramMiniAppAuth from '@/app/components/Auth/TelegramMiniAppAuth';

export default function TelegramAuthPage() {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
    setIsMiniApp(!!isInTelegram);
    setIsLoading(false);
  }, []);

  const handleAuth = (user: any) => {
    console.log('User authenticated:', user);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isMiniApp) {
    return <TelegramMiniAppAuth />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <TelegramLoginButton
          botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ''}
          onAuth={handleAuth}
        />
      </div>
    </div>
  );
}
