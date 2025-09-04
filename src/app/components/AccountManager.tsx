'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import CabinetSection from './CabinetSection';
import { 
  User, 
  LogOut, 
  Settings, 
  Key, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  UserCheck,
  X
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsedAt?: string;
  createdAt: string;
  isActive: boolean;
}

type AccountSection = 'profile' | 'cabinets' | 'apiKeys' | 'security';

export default function AccountManager() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AccountSection>('profile');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddKeyForm, setShowAddKeyForm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showKey, setShowKey] = useState<{[key: string]: boolean}>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/account/api-keys');
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки API ключей:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      setError('Введите название для API ключа');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('API ключ создан успешно');
        setNewKeyName('');
        setShowAddKeyForm(false);
        loadApiKeys();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка создания API ключа');
      }
    } catch (error) {
      setError('Ошибка при создании API ключа');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот API ключ?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/account/api-keys?id=${keyId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('API ключ удален');
        loadApiKeys();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка удаления API ключа');
      }
    } catch (error) {
      setError('Ошибка при удалении API ключа');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (response.ok) {
        // Очищаем локальное состояние
        await refreshUser();
        // Перенаправляем на страницу входа
        router.push('/auth/login');
      } else {
        setError('Ошибка при выходе');
      }
    } catch (error) {
      setError('Ошибка при выходе');
    } finally {
      setLoading(false);
      setShowLogoutConfirm(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const forceLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/force-login', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSuccess('Принудительный вход выполнен!');
        await refreshUser();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка принудительного входа');
      }
    } catch (error) {
      setError('Ошибка при принудительном входе');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="glass-container p-8 text-center fade-in">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-white">Загрузка...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-container p-8 text-center fade-in">
        <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-300 mb-4">Необходимо войти в систему</p>
        <button
          onClick={forceLogin}
          className="glass-button-primary bg-red-600/20 hover:bg-red-600/30 border-red-500/30"
        >
          🚀 Принудительный вход
        </button>
      </div>
    );
  }

  const sections = [
    { id: 'profile' as AccountSection, label: 'Профиль', icon: User },
    { id: 'cabinets' as AccountSection, label: 'Кабинеты WB', icon: Users },
    { id: 'apiKeys' as AccountSection, label: 'API Ключи', icon: Key },
    { id: 'security' as AccountSection, label: 'Безопасность', icon: Shield },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Заголовок с кнопкой выхода */}
      <div className="glass-container p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{user.name || 'Пользователь'}</h3>
              <p className="text-gray-300">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">{user.role}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.isActive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {user.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="glass-button-secondary text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-400/50 flex items-center gap-2"
            disabled={loading}
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </div>

      {/* Навигация по разделам */}
      <div className="glass-container p-2">
        <div className="flex gap-2">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <IconComponent size={18} />
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент разделов */}
      <div className="glass-container p-6">
        {activeSection === 'profile' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Информация профиля</h4>
              <p className="text-gray-400">Основные данные вашего аккаунта</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white">
                    {user.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Роль</label>
                  <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white">
                    {user.role}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Статус</label>
                  <div className={`border rounded-lg px-4 py-3 ${
                    user.isActive 
                      ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                      : 'bg-red-500/20 border-red-500/30 text-red-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} />
                      {user.isActive ? 'Активен' : 'Неактивен'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ID пользователя</label>
                  <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-sm">
                    {user.id}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'cabinets' && (
          <CabinetSection />
        )}

        {activeSection === 'apiKeys' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Ключи
                </h4>
                <p className="text-gray-400">
                  Управление API ключами для интеграции
                </p>
              </div>
              <button
                onClick={() => setShowAddKeyForm(true)}
                className="glass-button-primary flex items-center gap-2"
                disabled={loading}
              >
                <Plus size={16} />
                Добавить ключ
              </button>
            </div>

            {/* Список API ключей */}
            {loading && apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Загрузка API ключей...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">API ключи не найдены</p>
                <p className="text-sm">Создайте первый API ключ для интеграции</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-white">{apiKey.name}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            apiKey.isActive
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {apiKey.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-white/10 px-3 py-1 rounded font-mono text-sm text-blue-300">
                            {showKey[apiKey.id] ? apiKey.key : '*'.repeat(32)}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="text-gray-400 hover:text-white p-1"
                            title={showKey[apiKey.id] ? 'Скрыть' : 'Показать'}
                          >
                            {showKey[apiKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            Создан: {new Date(apiKey.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                          {apiKey.lastUsedAt && (
                            <div className="flex items-center gap-1">
                              <Settings size={14} />
                              Использован: {new Date(apiKey.lastUsedAt).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => deleteApiKey(apiKey.id)}
                        className="text-gray-400 hover:text-red-400 p-2"
                        title="Удалить API ключ"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'security' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Экстренные действия
              </h4>
              <p className="text-gray-400">Действия для решения проблем с доступом</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={forceLogin}
                className="glass-button-secondary bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400 hover:text-red-300 p-4 rounded-lg text-left"
                disabled={loading}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🚀</div>
                  <div>
                    <div className="font-semibold">Принудительный вход</div>
                    <div className="text-sm opacity-70">Восстановить сессию</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => router.push('/debug')}
                className="glass-button-secondary bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-400 hover:text-blue-300 p-4 rounded-lg text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🔧</div>
                  <div>
                    <div className="font-semibold">Debug Dashboard</div>
                    <div className="text-sm opacity-70">Диагностика системы</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Сообщения */}
      {error && (
        <div className="glass-container p-4 border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={16} />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="glass-container p-4 border border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            {success}
          </div>
        </div>
      )}

      {/* Модальное окно добавления API ключа */}
      {showAddKeyForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-container p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Создать API ключ</h3>
              <button
                onClick={() => {
                  setShowAddKeyForm(false);
                  setNewKeyName('');
                  setError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название ключа *
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  placeholder="Мой API ключ"
                />
              </div>
              
              {error && (
                <div className="glass-container p-3 border border-red-500/30 bg-red-500/10">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddKeyForm(false);
                  setNewKeyName('');
                  setError('');
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                onClick={createApiKey}
                disabled={loading || !newKeyName.trim()}
                className="glass-button-primary px-6 py-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Key size={16} className="mr-2" />
                    Создать ключ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения выхода */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-container p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Подтверждение выхода</h3>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="text-gray-400 hover:text-white"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300">
                Вы уверены, что хотите выйти из системы?
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                onClick={logout}
                disabled={loading}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Выход...
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    Выйти
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
