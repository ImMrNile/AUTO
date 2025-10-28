'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function EmailConfirmedPage() {
  const router = useRouter();

  useEffect(() => {
    // Автоматический редирект через 3 секунды
    const timer = setTimeout(() => {
      router.push('/onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      {/* Фоновые фигуры */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 max-w-md w-full shadow-2xl relative z-10">
        <div className="text-center">
          {/* Иконка успеха */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Заголовок */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Email подтвержден! 🎉
          </h1>
          
          {/* Описание */}
          <p className="text-gray-600 mb-6">
            Ваш email успешно подтвержден. Сейчас вы будете перенаправлены на страницу добавления кабинета WB.
          </p>

          {/* Информационный блок */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Что дальше?</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Добавьте ваш первый кабинет Wildberries с API токеном, чтобы начать работу с приложением
            </p>
          </div>

          {/* Анимация загрузки */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
