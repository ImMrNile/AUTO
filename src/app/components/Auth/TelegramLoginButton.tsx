'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface TelegramLoginButtonProps {
  botUsername: string;
  onAuth?: (user: any) => void;
}

export default function TelegramLoginButton({ botUsername, onAuth }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;

    (window as any).onTelegramAuth = async (user: any) => {
      try {
        console.log('Telegram auth data:', user);

        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user)
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('sessionToken', data.sessionToken);
          localStorage.setItem('user', JSON.stringify(data.user));

          if (onAuth) {
            onAuth(data.user);
          }

          router.push('/');
        } else {
          console.error('Auth failed:', data.error);
          alert('Ошибка авторизации: ' + data.error);
        }
      } catch (error) {
        console.error('Auth error:', error);
        alert('Ошибка авторизации');
      }
    };

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botUsername, onAuth, router]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-bold text-gray-900">
        Вход через Telegram
      </h2>
      <p className="text-sm text-gray-600 text-center">
        Нажмите кнопку ниже для авторизации через Telegram
      </p>
      <div ref={containerRef} className="telegram-login-button" />
      <p className="text-xs text-gray-500 text-center max-w-md">
        Ваши данные будут синхронизированы между всеми устройствами.
        Вы сможете использовать приложение как на ПК, так и в Telegram Mini App.
      </p>
    </div>
  );
}
