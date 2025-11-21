'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  // Инициализируем Telegram Web App
  useEffect(() => {
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
      setError(null);

      // @ts-ignore
      const WebApp = window.Telegram?.WebApp;
      
      // Если это Mini App (Telegram Web App доступен)
      if (WebApp && WebApp.initData) {
        console.log('📱 Регистрация через Telegram Mini App');
        
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
          console.log('✅ Регистрация через Telegram Mini App успешна');
          setError(null);
          setSuccess(true);

          // Перенаправляем на страницу онбординга через 2 секунды
          setTimeout(() => {
            router.push('/onboarding');
            router.refresh();
          }, 2000);
        } else {
          console.error('❌ Ошибка регистрации Telegram:', data.error);
          setError(data.error || 'Ошибка регистрации через Telegram');
        }
      } else {
        // Если это веб-версия на ПК - перенаправляем на страницу с QR-кодом
        console.log('💻 Регистрация через QR-код для веб-версии на ПК');
        router.push('/auth/telegram-desktop');
      }
    } catch (error: any) {
      console.error('❌ Ошибка при регистрации Telegram:', error);
      setError(`Ошибка: ${error?.message || 'Неизвестная ошибка'}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!agreedToTerms || !agreedToPrivacy) {
      setError('Вы должны согласиться с политиками');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSuccess(true);

      await fetch('/api/auth/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email,
        }),
      });
    } catch (error: any) {
      setError(error.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
        <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Регистрация успешна!
            </h2>
            <p className="text-gray-600 mb-6">
              Проверьте вашу почту <strong>{email}</strong> и подтвердите регистрацию
            </p>
            
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 mb-2">
                📧 Мы отправили письмо с подтверждением на вашу почту
              </p>
              <p className="text-sm text-gray-600">
                Перейдите по ссылке в письме, чтобы подтвердить email и получить доступ к приложению
              </p>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700">
                ⚠️ <strong>Важно:</strong> После подтверждения вы сможете войти в систему и добавить кабинет WB
              </p>
            </div>

            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              Перейти к входу
            </Link>
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
            Добро пожаловать
          </h1>
          <p className="text-gray-600">
            Создайте аккаунт в WB Automation
          </p>
        </div>

        {/* Main Card */}
        <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Ваше имя
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Иван Петров"
                className="w-full px-4 py-3 bg-white/80 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-500"
              />
            </div>

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
                  minLength={6}
                  placeholder="Минимум 6 символов"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Повторите пароль"
                  className="w-full px-4 py-3 bg-white/80 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-gray-900 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Agreement Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-200 cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                  Я согласен с{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-purple-600 hover:text-purple-700 font-semibold underline"
                  >
                    Пользовательским соглашением
                  </Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-200 cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                  Я согласен с{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-purple-600 hover:text-purple-700 font-semibold underline"
                  >
                    Политикой конфиденциальности
                  </Link>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !agreedToTerms || !agreedToPrivacy}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
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

          {/* Telegram Button */}
          <button
            type="button"
            onClick={handleTelegramLogin}
            disabled={telegramLoading}
            className="w-full py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.127-.01l.214-3.053 5.56-5.023c.242-.213-.054-.328-.373-.115l-6.869 4.332-2.96-.924c-.643-.204-.658-.643.135-.953l11.566-4.458c.54-.203 1.01.122.84.953z" />
            </svg>
            {telegramLoading ? 'Вход...' : 'Войти через Telegram'}
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-700">Уже есть аккаунт? </span>
            <Link
              href="/auth/login"
              className="text-purple-600 hover:text-purple-700 font-semibold underline"
            >
              Войти
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Нажимая "Зарегистрироваться", вы принимаете наши{' '}
          <Link href="/cookies" className="text-purple-600 hover:underline">
            политики использования cookie
          </Link>
        </p>
      </div>
    </div>
  );
}