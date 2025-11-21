'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Loader,
  Edit3,
  Save,
  X
} from 'lucide-react';

interface Cabinet {
  id: string;
  name: string;
  supplierId: string;
  apiKey: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

export default function CabinetSection() {
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showKey, setShowKey] = useState<{[key: string]: boolean}>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Форма нового кабинета
  const [newCabinet, setNewCabinet] = useState({
    name: '',
    supplierId: '',
    apiKey: ''
  });

  useEffect(() => {
    loadCabinets();
  }, []);

  const loadCabinets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cabinets');
      const data = await response.json();
      if (data.success) {
        setCabinets(data.cabinets || []);
      } else {
        setError(data.error || 'Ошибка загрузки кабинетов');
      }
    } catch (error) {
      console.error('Ошибка загрузки кабинетов:', error);
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const createCabinet = async () => {
    if (!newCabinet.name.trim() || !newCabinet.supplierId.trim() || !newCabinet.apiKey.trim()) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/cabinets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCabinet)
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Кабинет добавлен успешно');
        setNewCabinet({ name: '', supplierId: '', apiKey: '' });
        setShowAddForm(false);
        loadCabinets();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка создания кабинета');
      }
    } catch (error) {
      setError('Ошибка при создании кабинета');
    } finally {
      setLoading(false);
    }
  };

  const updateCabinet = async (cabinetId: string, updates: Partial<Cabinet>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cabinets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cabinetId, ...updates })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Кабинет обновлен');
        setEditingId(null);
        loadCabinets();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка обновления кабинета');
      }
    } catch (error) {
      setError('Ошибка при обновлении кабинета');
    } finally {
      setLoading(false);
    }
  };

  const deleteCabinet = async (cabinetId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот кабинет?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/cabinets?id=${cabinetId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Кабинет удален');
        loadCabinets();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка удаления кабинета');
      }
    } catch (error) {
      setError('Ошибка при удалении кабинета');
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (cabinetId: string) => {
    setShowKey(prev => ({
      ...prev,
      [cabinetId]: !prev[cabinetId]
    }));
  };

  const toggleCabinetStatus = (cabinet: Cabinet) => {
    updateCabinet(cabinet.id, { isActive: !cabinet.isActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 md:w-5 md:h-5" />
            Кабинеты Wildberries
          </h4>
          <p className="text-xs md:text-sm text-gray-600">
            Управление кабинетами продавца для работы с WB API
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg text-sm"
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          Добавить кабинет
        </button>
      </div>

      {/* Список кабинетов */}
      {loading && cabinets.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Загрузка кабинетов...</p>
        </div>
      ) : cabinets.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="mb-2 text-gray-900 font-semibold">Кабинеты не настроены</p>
          <p className="text-sm text-gray-600">Добавьте первый кабинет для начала работы</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cabinets.map((cabinet) => (
            <div key={cabinet.id} className="bg-white/80 border-2 border-gray-300 rounded-xl p-4 md:p-6 hover:bg-white transition-colors shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {editingId === cabinet.id ? (
                      <input
                        type="text"
                        defaultValue={cabinet.name}
                        className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white"
                        onBlur={(e) => {
                          if (e.target.value !== cabinet.name) {
                            updateCabinet(cabinet.id, { name: e.target.value });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <h5 className="font-semibold text-gray-900 text-base md:text-lg">{cabinet.name}</h5>
                    )}
                    
                    <button
                      onClick={() => setEditingId(editingId === cabinet.id ? null : cabinet.id)}
                      className="text-gray-400 hover:text-white p-1"
                      disabled={loading}
                    >
                      {editingId === cabinet.id ? <X size={16} /> : <Edit3 size={16} />}
                    </button>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        cabinet.isActive
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                      {cabinet.isActive ? '✓ Активен' : '✗ Неактивен'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs md:text-sm text-gray-700">
                      <strong>ID Поставщика:</strong> 
                      <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-purple-700 text-xs">
                        {cabinet.supplierId}
                      </code>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs md:text-sm text-gray-700 font-semibold">API Ключ:</span>
                      <code className="bg-gray-100 px-2 md:px-3 py-1 rounded font-mono text-xs text-purple-700 break-all">
                        {showKey[cabinet.id] ? cabinet.apiKey : '*'.repeat(20)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(cabinet.id)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title={showKey[cabinet.id] ? 'Скрыть' : 'Показать'}
                      >
                        {showKey[cabinet.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs text-gray-600 mt-3">
                      <span>Создан: {new Date(cabinet.createdAt).toLocaleDateString('ru-RU')}</span>
                      {cabinet.lastSyncAt && (
                        <span>Синхронизация: {new Date(cabinet.lastSyncAt).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-0 md:ml-4 mt-2 md:mt-0">
                  <button
                    onClick={() => deleteCabinet(cabinet.id)}
                    className="text-gray-600 hover:text-red-600 p-2"
                    title="Удалить кабинет"
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Модальное окно добавления кабинета */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="liquid-glass rounded-2xl md:rounded-3xl border-2 border-gray-300 p-4 md:p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Добавить кабинет</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCabinet({ name: '', supplierId: '', apiKey: '' });
                  setError('');
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2">
                  Название кабинета *
                </label>
                <input
                  type="text"
                  value={newCabinet.name}
                  onChange={(e) => setNewCabinet(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Мой основной кабинет"
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2">
                  ID Поставщика *
                </label>
                <input
                  type="text"
                  value={newCabinet.supplierId}
                  onChange={(e) => setNewCabinet(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Введите ID поставщика"
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2">
                  API Ключ *
                </label>
                <input
                  type="password"
                  value={newCabinet.apiKey}
                  onChange={(e) => setNewCabinet(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full bg-white border-2 border-gray-300 rounded-lg px-3 md:px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="Введите API ключ из личного кабинета WB"
                />
              </div>
              
              <div className="text-xs md:text-sm text-gray-700 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <p className="mb-2 font-semibold">💡 Как получить API ключ:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Войдите в <a href="https://seller.wildberries.ru" target="_blank" className="text-blue-600 hover:underline font-semibold">личный кабинет WB</a></li>
                  <li>Перейдите в "Настройки" → "Доступ к API"</li>
                  <li>Создайте новый токен с нужными правами</li>
                  <li>Скопируйте токен сюда</li>
                </ol>
              </div>
              
              {error && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700 text-xs md:text-sm font-semibold">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-2 md:gap-3 mt-4 md:mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCabinet({ name: '', supplierId: '', apiKey: '' });
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-semibold transition-colors text-sm"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                onClick={createCabinet}
                disabled={loading || !newCabinet.name.trim() || !newCabinet.supplierId.trim() || !newCabinet.apiKey.trim()}
                className="px-4 md:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Добавить
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
