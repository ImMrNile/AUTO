'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';

export default function DebugPage() {
  const { user, loading, authError, refreshUser } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [cabinetsData, setCabinetsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setSessionInfo(data);
    } catch (error) {
      console.error('Ошибка проверки сессии:', error);
      setSessionInfo({ error: 'Ошибка при проверке сессии' });
    } finally {
      setIsLoading(false);
    }
  };

  const testCabinets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cabinets');
      const data = await response.json();
      setCabinetsData(data);
    } catch (error) {
      console.error('Ошибка загрузки кабинетов:', error);
      setCabinetsData({ error: 'Ошибка при загрузке кабинетов' });
    } finally {
      setIsLoading(false);
    }
  };

  const fixAuth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/fix-auth', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert('Аутентификация исправлена!');
        await refreshUser();
        await checkSession();
        window.location.reload();
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('Ошибка исправления:', error);
      alert('Ошибка при исправлении аутентификации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">🔧 Debug Dashboard</h1>
        
        {/* AuthProvider состояние */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">AuthProvider State</h2>
          <div className="space-y-2 text-gray-300">
            <div><strong>Loading:</strong> {loading ? 'Да' : 'Нет'}</div>
            <div><strong>User:</strong> {user ? `${user.email} (${user.role})` : 'Не авторизован'}</div>
            <div><strong>Auth Error:</strong> {authError || 'Нет'}</div>
          </div>
        </div>

        {/* Управление */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Управление</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={checkSession}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
            >
              📊 Проверить сессию
            </button>
            
            <button
              onClick={testCabinets}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
            >
              🏢 Тест кабинетов
            </button>
            
            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const response = await fetch('/api/force-login', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                    alert('✅ Принудительный вход выполнен!');
                    await refreshUser();
                    window.location.reload();
                  } else {
                    alert(`❌ Ошибка: ${data.error}`);
                  }
                } catch (error) {
                  console.error('Ошибка принудительного входа:', error);
                  alert('❌ Ошибка при принудительном входе');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 font-bold"
            >
              🚀 ПРИНУДИТЕЛЬНЫЙ ВХОД
            </button>
            
            <button
              onClick={fixAuth}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50"
            >
              🔧 Исправить Auth
            </button>
            
            <button
              onClick={refreshUser}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
            >
              🔄 Обновить
            </button>
            
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              🔑 Войти заново
            </button>
          </div>
        </div>

        {/* Сессия */}
        {sessionInfo && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Session Info</h2>
            <pre className="bg-black/30 p-4 rounded text-green-400 text-sm overflow-auto">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Кабинеты */}
        {cabinetsData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Cabinets Data</h2>
            <pre className="bg-black/30 p-4 rounded text-green-400 text-sm overflow-auto">
              {JSON.stringify(cabinetsData, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Навигация */}
        <div className="mt-8 flex gap-4">
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← На главную
          </a>
          <a 
            href="/?tab=cabinets" 
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            🏢 Кабинеты
          </a>
        </div>
      </div>
    </div>
  );
}
