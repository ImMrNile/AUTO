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
      // Запускаем анимацию выхода
      const logoutElement = document.getElementById('logout-animation');
      if (logoutElement) {
        logoutElement.classList.add('animate-logout');
      }

      // Ждем завершения анимации
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (response.ok) {
        await refreshUser();
        router.push('/auth/login');
      } else {
        setError('Ошибка при выходе');
        setLoading(false);
        setShowLogoutConfirm(false);
      }
    } catch (error) {
      setError('Ошибка при выходе');
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


  if (authLoading) {
    return (
      <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 text-center shadow-xl">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-gray-900 font-semibold">Загрузка...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 text-center shadow-xl">
        <User className="w-16 h-16 mx-auto text-gray-600 mb-4" />
        <p className="text-gray-700 mb-4 font-semibold">Необходимо войти в систему</p>
        <p className="text-gray-600 text-sm">Пожалуйста, авторизуйтесь для доступа к управлению аккаунтом</p>
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
    <div className="space-y-6">
      {/* Заголовок с кнопкой выхода */}
      <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{user.name || 'Пользователь'}</h3>
              <p className="text-gray-700">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-semibold">{user.role}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  user.isActive 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {user.isActive ? '✓ Активен' : '✗ Неактивен'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            id="logout-animation"
            onClick={() => setShowLogoutConfirm(true)}
            className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition-all flex items-center gap-2 border-2 border-red-300 hover:border-red-400 shadow-lg transform hover:scale-105"
            disabled={loading}
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </div>

      {/* Навигация по разделам */}
      <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-3 shadow-xl">
        <div className="flex gap-2">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 p-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-semibold ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-2 border-transparent'
                }`}
              >
                <IconComponent size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент разделов */}
      <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 shadow-xl">
        {activeSection === 'profile' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Информация профиля</h4>
              <p className="text-gray-600">Основные данные вашего аккаунта</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                  <div className="bg-white/80 border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-medium">
                    {user.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Роль</label>
                  <div className="bg-white/80 border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-medium">
                    {user.role}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Статус</label>
                  <div className={`border-2 rounded-xl px-4 py-3 font-semibold ${
                    user.isActive 
                      ? 'bg-green-100 border-green-300 text-green-700' 
                      : 'bg-red-100 border-red-300 text-red-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} />
                      {user.isActive ? '✓ Активен' : '✗ Неактивен'}
                    </div>
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
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Ключи
                </h4>
                <p className="text-gray-600">
                  Управление API ключами для интеграции
                </p>
              </div>
              <button
                onClick={() => setShowAddKeyForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg"
                disabled={loading}
              >
                <Plus size={16} />
                Добавить ключ
              </button>
            </div>

            {/* Список API ключей */}
            {loading && apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-semibold">Загрузка API ключей...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-2 text-gray-900 font-semibold">API ключи не найдены</p>
                <p className="text-sm text-gray-600">Создайте первый API ключ для интеграции</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="bg-white/80 border-2 border-gray-300 rounded-xl p-4 hover:bg-white transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-semibold text-gray-900">{apiKey.name}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            apiKey.isActive
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            {apiKey.isActive ? '✓ Активен' : '✗ Неактивен'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm text-purple-700">
                            {showKey[apiKey.id] ? apiKey.key : '*'.repeat(32)}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title={showKey[apiKey.id] ? 'Скрыть' : 'Показать'}
                          >
                            {showKey[apiKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
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
                        className="text-gray-600 hover:text-red-600 p-2"
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
              <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Безопасность
              </h4>
              <p className="text-gray-600">Управление безопасностью вашего аккаунта</p>
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
              <div className="flex gap-4">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-900 font-semibold mb-2">Ваш аккаунт защищен</p>
                  <p className="text-gray-700 text-sm">
                    Все ваши данные зашифрованы и хранятся на защищенных серверах в соответствии с требованиями безопасности.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Сообщения */}
      {error && (
        <div className="liquid-glass rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-lg">
          <div className="flex items-center gap-2 text-red-700 font-semibold">
            <AlertTriangle size={16} />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="liquid-glass rounded-xl border-2 border-green-300 bg-green-50 p-4 shadow-lg">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle size={16} />
            {success}
          </div>
        </div>
      )}

      {/* Модальное окно добавления API ключа */}
      {showAddKeyForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Создать API ключ</h3>
              <button
                onClick={() => {
                  setShowAddKeyForm(false);
                  setNewKeyName('');
                  setError('');
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Название ключа *
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-white/80 border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="Мой API ключ"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-red-700 text-sm font-semibold">
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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-900 font-semibold transition-colors border-2 border-gray-300"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                onClick={createApiKey}
                disabled={loading || !newKeyName.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Key size={16} />
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="liquid-glass rounded-3xl border-2 border-gray-300 p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Подтверждение выхода</h3>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="text-gray-600 hover:text-gray-900"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 font-semibold">
                Вы уверены, что хотите выйти из системы?
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-900 font-semibold transition-colors border-2 border-gray-300"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                onClick={logout}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold transition-colors flex items-center gap-2 shadow-lg"
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
