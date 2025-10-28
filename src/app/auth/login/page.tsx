'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('loginjon90@gmail.com');
  const [password, setPassword] = useState('919014095@Man');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();
  const supabase = createClient();

  // Проверяем URL параметры для ошибок
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlError = urlParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, []);

  // Инициализируем Telegram Web App и очищаем невалидный токен
  useEffect(() => {
    // Очищаем невалидный токен сессии если он есть
    const clearInvalidToken = async () => {
      try {
        console.log('🔄 Проверяем валидность токена сессии...');
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.success) {
          console.log('❌ Токен невалидный, очищаем cookie...');
          // Вызываем logout чтобы очистить cookie
          await fetch('/api/auth/logout', { method: 'POST' });
          console.log('✅ Cookie очищен');
        } else {
          console.log('✅ Токен валидный');
        }
      } catch (error) {
        console.error('⚠️ Ошибка при проверке токена:', error);
      }
    };
    
    clearInvalidToken();
    
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleTelegramLogin = async () => {
    try {
      setTelegramLoading(true);
      setError('');

      // @ts-ignore
      const WebApp = window.Telegram?.WebApp;
      
      // Если это Mini App (Telegram Web App доступен)
      if (WebApp && WebApp.initData) {
        console.log('📱 Авторизация через Telegram Mini App');
        
        const initData = WebApp.initData;
        console.log('🔐 Отправка Telegram initData...', { 
          length: initData.length,
          hasUser: initData.includes('user='),
        });

        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log('✅ Авторизация через Telegram Mini App успешна');
          setError('');

          // Обновляем контекст пользователя
          await refreshUser();

          // Перенаправляем на главную страницу
          router.push('/');
          router.refresh();
        } else {
          console.error('❌ Ошибка авторизации Telegram:', data.error);
          setError(data.error || 'Ошибка авторизации через Telegram');
        }
      } else {
        // Если это веб-версия на ПК - перенаправляем на страницу с QR-кодом
        console.log('💻 Авторизация через QR-код для веб-версии на ПК');
        router.push('/auth/telegram-desktop');
      }
    } catch (error: any) {
      console.error('❌ Ошибка при авторизации Telegram:', error);
      setError(`Ошибка: ${error?.message || 'Неизвестная ошибка'}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Авторизация через Supabase...');
      
      // Используем Supabase для авторизации
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Ошибка авторизации Supabase:', signInError);
        
        // Переводим ошибки на русский
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Неверный email или пароль');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Email не подтвержден. Проверьте вашу почту.');
        } else {
          setError(signInError.message || 'Ошибка авторизации');
        }
        return;
      }

      if (data?.user) {
        console.log('✅ Авторизация успешна через Supabase:', data.user.email);
        
        // Обновляем контекст пользователя
        await refreshUser();
        
        // Проверяем есть ли кабинеты
        try {
          const response = await fetch('/api/cabinets');
          if (response.ok) {
            const cabinets = await response.json();
            
            // Если нет кабинетов - редирект на онбординг
            if (!cabinets || cabinets.length === 0) {
              console.log('📋 Нет кабинетов, редирект на онбординг');
              router.push('/onboarding');
              return;
            }
          }
        } catch (error) {
          console.log('⚠️ Ошибка проверки кабинетов, редирект на главную');
        }
        
        // Перенаправляем на главную страницу
        router.push('/');
        router.refresh();
      }
    } catch (error: any) {
      console.error('❌ Ошибка авторизации:', error);
      setError(error?.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

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
            Добро пожаловать
          </h1>
          <p className="text-gray-600">
            Войдите в свой аккаунт WB Automation
          </p>
        </div>

        {/* Main Card */}
        <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/80 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Введите ваш пароль"
                  className="w-full px-4 py-3 bg-white/80 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 text-gray-600">или</span>
            </div>
          </div>

          {/* Telegram Button - Single unified button for web and Mini App */}
          <button
            type="button"
            onClick={handleTelegramLogin}
            disabled={telegramLoading}
            className="w-full py-3 bg-white/80 border-2 border-gray-300 hover:border-blue-400 text-gray-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.127-.01l.214-3.053 5.56-5.023c.242-.213-.054-.328-.373-.115l-6.869 4.332-2.96-.924c-.643-.204-.658-.643.135-.953l11.566-4.458c.54-.203 1.01.122.84.953z" />
            </svg>
            {telegramLoading ? 'Вход...' : 'Войти через Telegram'}
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-700">Нет аккаунта? </span>
            <Link
              href="/auth/register"
              className="text-purple-600 hover:text-purple-700 font-semibold underline"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Нажимая "Войти", вы принимаете наши{' '}
          <Link href="/cookies" className="text-purple-600 hover:underline">
            политики использования cookie
          </Link>
        </p>
      </div>
    </div>
  );
}