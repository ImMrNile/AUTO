'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Компонент для защиты маршрутов - проверяет авторизацию и редиректит на логин если нужно
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Публичные пути - не требуют авторизации
  const publicPaths = ['/auth/login', '/auth/register', '/auth/telegram-desktop', '/privacy', '/terms', '/cookies'];
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 [AuthGuard] Проверяем авторизацию для пути:', pathname);

        // Если это публичный путь - не проверяем
        if (isPublicPath) {
          console.log('✅ [AuthGuard] Публичный путь, пропускаем проверку');
          setIsAuthorized(true);
          setIsChecking(false);
          return;
        }

        // Проверяем сессию
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        const data = await response.json();

        if (data.success && data.user) {
          console.log('✅ [AuthGuard] Пользователь авторизован:', data.user.email);
          setIsAuthorized(true);
        } else {
          console.log('❌ [AuthGuard] Пользователь не авторизован, редирект на логин');
          // Очищаем невалидный токен
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
          // Редиректим на логин
          router.push('/auth/login');
          return;
        }
      } catch (error) {
        console.error('❌ [AuthGuard] Ошибка проверки авторизации:', error);
        // При ошибке редиректим на логин
        router.push('/auth/login');
        return;
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicPath, router]);

  // Пока проверяем авторизацию - показываем загрузку
  if (isChecking) {
    return (
      <div className="min-h-screen relative z-10 flex items-center justify-center px-4">
        <div className="liquid-glass rounded-2xl md:rounded-3xl p-8 md:p-12 text-center max-w-md w-full">
          <Loader2 className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-purple-600 animate-spin" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">
            Проверка авторизации...
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            Пожалуйста, подождите
          </p>
        </div>
      </div>
    );
  }

  // Если авторизован - показываем контент
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Если не авторизован и не публичный путь - показываем загрузку (редирект в процессе)
  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4">
      <div className="liquid-glass rounded-2xl md:rounded-3xl p-8 md:p-12 text-center max-w-md w-full">
        <Loader2 className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-purple-600 animate-spin" />
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-3">
          Перенаправление...
        </h2>
        <p className="text-sm md:text-base text-gray-600">
          Требуется авторизация
        </p>
      </div>
    </div>
  );
}
