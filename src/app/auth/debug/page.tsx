'use client';

import { useState } from 'react';
import { useAuth } from '../../components/Auth';

export default function AuthDebugPage() {
  const { user, loading, authError, refreshUser } = useAuth();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug/fix-auth');
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error('Ошибка диагностики:', error);
      setDiagnostics({ error: 'Ошибка при выполнении диагностики' });
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Диагностика аутентификации</h1>
        
        {/* Текущее состояние */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Текущее состояние</h2>
          <div className="space-y-2 text-gray-300">
            <div>Загрузка: {loading ? 'Да' : 'Нет'}</div>
            <div>Пользователь: {user ? `${user.email} (${user.role})` : 'Не авторизован'}</div>
            {authError && <div className="text-red-400">Ошибка: {authError}</div>}
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : 'Запустить диагностику'}
          </button>
          
          <button
            onClick={fixAuth}
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : '🔧 Исправить аутентификацию'}
          </button>
          
          <button
            onClick={refreshUser}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Обновить пользователя
          </button>
        </div>

        {/* Результаты диагностики */}
        {diagnostics && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Результаты диагностики</h2>
            <pre className="bg-black/30 p-4 rounded text-green-400 text-sm overflow-auto">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Навигация */}
        <div className="mt-8">
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
}
