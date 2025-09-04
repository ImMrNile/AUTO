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
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Кабинеты Wildberries
          </h4>
          <p className="text-sm text-gray-400">
            Управление кабинетами продавца для работы с WB API
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="glass-button-primary flex items-center gap-2"
          disabled={loading}
        >
          <Plus size={16} />
          Добавить кабинет
        </button>
      </div>

      {/* Список кабинетов */}
      {loading && cabinets.length === 0 ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-400" />
          <p className="text-gray-400">Загрузка кабинетов...</p>
        </div>
      ) : cabinets.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Кабинеты не настроены</p>
          <p className="text-sm">Добавьте первый кабинет для начала работы</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cabinets.map((cabinet) => (
            <div key={cabinet.id} className="glass-container p-6 hover:bg-white/5 transition-colors">
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
                      <h5 className="font-semibold text-white text-lg">{cabinet.name}</h5>
                    )}
                    
                    <button
                      onClick={() => setEditingId(editingId === cabinet.id ? null : cabinet.id)}
                      className="text-gray-400 hover:text-white p-1"
                      disabled={loading}
                    >
                      {editingId === cabinet.id ? <X size={16} /> : <Edit3 size={16} />}
                    </button>
                    
                    <button
                      onClick={() => toggleCabinetStatus(cabinet)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        cabinet.isActive
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                      disabled={loading}
                    >
                      {cabinet.isActive ? 'Активен' : 'Неактивен'}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">
                      <strong>ID Поставщика:</strong> 
                      <code className="ml-2 bg-white/10 px-2 py-1 rounded text-blue-300">
                        {cabinet.supplierId}
                      </code>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">API Ключ:</span>
                      <code className="bg-white/10 px-3 py-1 rounded font-mono text-sm text-blue-300">
                        {showKey[cabinet.id] ? cabinet.apiKey : '*'.repeat(20)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(cabinet.id)}
                        className="text-gray-400 hover:text-white p-1"
                        title={showKey[cabinet.id] ? 'Скрыть' : 'Показать'}
                      >
                        {showKey[cabinet.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-3">
                      <span>Создан: {new Date(cabinet.createdAt).toLocaleDateString('ru-RU')}</span>
                      {cabinet.lastSyncAt && (
                        <span>Синхронизация: {new Date(cabinet.lastSyncAt).toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <a
                    href={`https://seller.wildberries.ru/supplier-settings/access-to-api`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 p-2"
                    title="Открыть настройки API в WB"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => deleteCabinet(cabinet.id)}
                    className="text-gray-400 hover:text-red-400 p-2"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-container p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Добавить кабинет</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewCabinet({ name: '', supplierId: '', apiKey: '' });
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
                  Название кабинета *
                </label>
                <input
                  type="text"
                  value={newCabinet.name}
                  onChange={(e) => setNewCabinet(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  placeholder="Мой основной кабинет"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID Поставщика *
                </label>
                <input
                  type="text"
                  value={newCabinet.supplierId}
                  onChange={(e) => setNewCabinet(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  placeholder="123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Ключ *
                </label>
                <input
                  type="password"
                  value={newCabinet.apiKey}
                  onChange={(e) => setNewCabinet(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  placeholder="Введите API ключ из личного кабинета WB"
                />
              </div>
              
              <div className="text-sm text-gray-400 bg-white/5 rounded-lg p-3">
                <p className="mb-2">💡 Как получить API ключ:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Войдите в <a href="https://seller.wildberries.ru" target="_blank" className="text-blue-400 hover:underline">личный кабинет WB</a></li>
                  <li>Перейдите в "Настройки" → "Доступ к API"</li>
                  <li>Создайте новый токен с нужными правами</li>
                  <li>Скопируйте токен сюда</li>
                </ol>
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
                  setShowAddForm(false);
                  setNewCabinet({ name: '', supplierId: '', apiKey: '' });
                  setError('');
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                disabled={loading}
              >
                Отмена
              </button>
              
              <button
                onClick={createCabinet}
                disabled={loading || !newCabinet.name.trim() || !newCabinet.supplierId.trim() || !newCabinet.apiKey.trim()}
                className="glass-button-primary px-6 py-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
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
