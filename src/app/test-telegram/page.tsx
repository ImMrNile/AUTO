'use client';

import { useEffect, useRef, useState } from 'react';

export default function TestTelegramAuth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [botUsername, setBotUsername] = useState('');
  const [status, setStatus] = useState('Загрузка...');

  useEffect(() => {
    // Проверяем переменную окружения
    const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '';
    setBotUsername(username);

    if (!username) {
      setStatus('❌ NEXT_PUBLIC_TELEGRAM_BOT_USERNAME не настроен!');
      return;
    }

    setStatus(`✅ Бот: @${username}`);

    // Добавляем Telegram Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', username);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;

    // Глобальная функция для обработки
    (window as any).onTelegramAuth = async (user: any) => {
      console.log('🎉 Telegram auth data:', user);
      setStatus('🎉 Авторизация успешна! Проверьте консоль.');

      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });

        const data = await response.json();
        console.log('📡 Ответ сервера:', data);

        if (data.success) {
          setStatus('✅ Авторизация завершена! Токен получен.');
        } else {
          setStatus(`❌ Ошибка: ${data.error}`);
        }
      } catch (error) {
        console.error('❌ Ошибка:', error);
        setStatus('❌ Ошибка отправки на сервер');
      }
    };

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🧪 Тест Telegram OAuth
        </h1>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
            <p className="font-semibold text-blue-900">Статус:</p>
            <p className="text-blue-700">{status}</p>
          </div>

          {botUsername && (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl">
              <p className="font-semibold text-green-900">Настройки:</p>
              <p className="text-green-700">Бот: @{botUsername}</p>
              <p className="text-sm text-green-600 mt-2">
                ✅ Переменная окружения настроена правильно
              </p>
            </div>
          )}

          <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
            <p className="font-semibold text-yellow-900 mb-2">Инструкция:</p>
            <ol className="list-decimal list-inside text-yellow-700 space-y-1">
              <li>Настройте домен в @BotFather: <code>/setdomain</code></li>
              <li>Выберите @{botUsername || 'your_bot'}</li>
              <li>Введите: <code>localhost</code></li>
              <li>Нажмите кнопку ниже</li>
            </ol>
          </div>

          <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 border-2 border-gray-300 rounded-xl">
            <p className="text-gray-700 font-semibold">
              Нажмите кнопку для авторизации:
            </p>
            <div ref={containerRef} className="telegram-login-button" />
          </div>

          <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-xl">
            <p className="font-semibold text-purple-900 mb-2">Консоль браузера:</p>
            <p className="text-sm text-purple-700">
              Откройте DevTools (F12) и смотрите вкладку Console для логов
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
