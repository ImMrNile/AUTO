'use client';

import { useState, useEffect } from 'react';
import { Cabinet } from '../../../lib/types/cabinet';
import { useAuth } from './AuthProvider';
import { Loader2, Plus, Settings, Trash2, Eye, EyeOff, TestTube, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CabinetManagerProps {
  onUpdate: () => void;
}

export default function CabinetManager({ onUpdate }: CabinetManagerProps) {
  const { user, loading: authLoading } = useAuth();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showTokenInputModal, setShowTokenInputModal] = useState(false);
  const [selectedCabinetForTest, setSelectedCabinetForTest] = useState<Cabinet | null>(null);
  const [testTokenInput, setTestTokenInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    apiToken: '',
    description: '',
  });
  const [testResults, setTestResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    console.log('🔍 [CabinetManager] useEffect сработал:', { authLoading, user: user?.email });
    if (!authLoading && user) {
      console.log('🔍 [CabinetManager] Загружаем кабинеты для пользователя:', user.email);
      loadCabinets();
    } else if (authLoading) {
      console.log('🔍 [CabinetManager] Ожидаем загрузки авторизации...');
    } else if (!user) {
      console.log('🔍 [CabinetManager] Пользователь не найден');
    }
  }, [authLoading, user]);

  const loadCabinets = async () => {
    console.log('🔍 [CabinetManager] loadCabinets вызван');
    if (authLoading || !user) {
      console.log('🔍 [CabinetManager] loadCabinets пропущен:', { authLoading, hasUser: !!user });
      return;
    }

    try {
      console.log('🔍 [CabinetManager] Отправляем запрос к /api/cabinets');
      setLoading(true);
      const response = await fetch('/api/cabinets');
      
      console.log('🔍 [CabinetManager] Ответ получен:', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 [CabinetManager] Данные получены:', { success: data.success, cabinetsCount: data.cabinets?.length });
      
      setCabinets(data.cabinets || []);
    } catch (e) {
      console.error('❌ [CabinetManager] Ошибка загрузки кабинетов:', e);
      setError(`Ошибка загрузки кабинетов: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (token?: string) => {
    const testToken = token || formData.apiToken;

    if (!testToken || !testToken.trim()) {
      setError('Введите API‑токен для тестирования');
      return;
    }

    // Если токен замаскирован (содержит *), не можем тестировать
    if (testToken.includes('*')) {
      setError('Не могу протестировать замаскированный токен. Введите полный токен.');
      return;
    }

    setIsTesting(true);
    setError('');

    try {
      const response = await fetch('/api/wb/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: testToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResults(data.results);
        setShowTestModal(true);
      } else {
        setError(data.error || 'Ошибка тестирования соединения');
      }
    } catch (e) {
      console.error('Ошибка тестирования:', e);
      setError('Ошибка при тестировании соединения');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (skipValidation = false) => {
    if (!formData.name.trim() || !formData.apiToken.trim()) {
      setError('Заполните название и API‑токен');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cabinets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          skipValidation,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setFormData({ name: '', apiToken: '', description: '' });
        setShowAddForm(false);
        loadCabinets();
        onUpdate();

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error);

        // если предлагается пропустить валидацию – покажем кнопку для добавления без проверки
      }
    } catch (e) {
      console.error('Ошибка добавления кабинета:', e);
      setError('Ошибка при добавлении кабинета');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCabinet = async (cabinetId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот кабинет?')) return;

    try {
      const response = await fetch(`/api/cabinets?id=${cabinetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadCabinets();
        onUpdate();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при удалении кабинета');
      }
    } catch (e) {
      console.error('Ошибка удаления кабинета:', e);
      setError('Ошибка при удалении кабинета');
    }
  };

  const toggleCabinet = async (cabinetId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/cabinets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cabinetId,
          isActive: !currentStatus,
          skipValidation: true,
        }),
      });

      if (response.ok) {
        loadCabinets();
        onUpdate();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при обновлении кабинета');
      }
    } catch (e) {
      console.error('Ошибка обновления кабинета:', e);
      setError('Ошибка при обновлении кабинета');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500 mr-3" />
        <span>Загрузка авторизации...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Необходимо войти в систему для управления кабинетами</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <div className="spinner-lg mx-auto mb-4" />
        <p>Загрузка кабинетов…</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Кнопка добавления */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Кабинеты Wildberries</h3>
            <p className="text-sm text-gray-600">
              Управление API‑токенами для публикации товаров
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Добавить кабинет
          </button>
        </div>

        {/* Список кабинетов */}
        {cabinets.length === 0 ? (
          <div className="card p-6 text-center text-gray-500">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-2">Кабинеты не найдены</p>
            <p className="text-sm">Добавьте хотя бы один кабинет для публикации товаров</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cabinets.map((cabinet) => (
              <div key={cabinet.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold">{cabinet.name}</h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          cabinet.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {cabinet.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>

                    {cabinet.description && (
                      <p className="text-gray-600 mb-3">{cabinet.description}</p>
                    )}

                    {/* Адаптивная сетка с метриками */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Всего товаров:</span>
                        <span className="ml-2">{cabinet.stats?.totalProducts || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium">Опубликовано:</span>
                        <span className="ml-2 text-green-600">{cabinet.stats?.publishedProducts || 0}</span>
                      </div>
                      <div>
                        <span className="font-medium">В обработке:</span>
                        <span className="ml-2 text-orange-600">{cabinet.stats?.processingProducts || 0}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      Создан: {new Date(cabinet.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>

                  {/* Кнопки управления: на мобильных – столбцом, на desktop – строкой */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        if (cabinet.apiToken && !cabinet.apiToken.includes('*')) {
                          testConnection(cabinet.apiToken);
                        } else {
                          setSelectedCabinetForTest(cabinet);
                          setShowTokenInputModal(true);
                        }
                      }}
                      className="btn-secondary"
                      title="Тестировать соединение"
                    >
                      <TestTube size={16} />
                    </button>

                    <button
                      onClick={() => toggleCabinet(cabinet.id, cabinet.isActive)}
                      className={cabinet.isActive ? 'btn-secondary' : 'btn-primary'}
                      title={cabinet.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      {cabinet.isActive ? 'Отключить' : 'Включить'}
                    </button>

                    <button
                      onClick={() => deleteCabinet(cabinet.id)}
                      className="btn-danger"
                      title="Удалить кабинет"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Сообщения об ошибках/успехе */}
        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}
      </div>

      {/* Модальное окно добавления кабинета */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Добавить кабинет Wildberries</h3>
            </div>
            
            <div className="card-body space-y-4">
              <div className="form-group">
                <label className="form-label">Название кабинета *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="Мой кабинет WB"
                />
              </div>

              <div className="form-group">
                <label className="form-label">API токен Wildberries *</label>
                <textarea
                  value={formData.apiToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiToken: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                  placeholder="Вставьте ваш API токен из личного кабинета WB"
                />
                <div className="form-hint">
                  Получить токен можно в личном кабинете Wildberries в разделе "Настройки" → "Доступ к API"
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Описание (опционально)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="form-input"
                  placeholder="Краткое описание кабинета"
                />
              </div>

              {/* Кнопка тестирования */}
              <div className="flex gap-2">
                <button
                  onClick={() => testConnection()}
                  disabled={!formData.apiToken.trim() || isTesting}
                  className="btn-secondary flex-1"
                >
                  {isTesting ? (
                    <>
                      <div className="spinner mr-2" />
                      Тестируем...
                    </>
                  ) : (
                    <>
                      <TestTube size={16} />
                      Проверить соединение
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="alert alert-error">
                  <AlertTriangle size={16} />
                  <div>
                    <p>{error}</p>
                    {error.includes('Не удается подключиться') && (
                      <p className="text-sm mt-1">
                        Вы можете добавить кабинет без проверки токена и протестировать его позже.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', apiToken: '', description: '' });
                  setError('');
                }}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Отмена
              </button>
              
              {error && error.includes('Не удается подключиться') && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="btn-secondary"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner mr-2" />
                      Добавляем...
                    </>
                  ) : (
                    'Добавить без проверки'
                  )}
                </button>
              )}
              
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner mr-2" />
                    Добавляем...
                  </>
                ) : (
                  'Добавить кабинет'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно ввода токена для тестирования */}
      {showTokenInputModal && selectedCabinetForTest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="card-header">
              <h3 className="text-xl font-semibold">Тестирование кабинета "{selectedCabinetForTest.name}"</h3>
            </div>
            
            <div className="card-body space-y-4">
              <p className="text-gray-600">
                Для тестирования соединения введите полный API токен (токен не будет сохранен):
              </p>
              
              <div className="form-group">
                <label className="form-label">API токен</label>
                <textarea
                  value={testTokenInput}
                  onChange={(e) => setTestTokenInput(e.target.value)}
                  className="form-textarea"
                  rows={3}
                  placeholder="Введите полный API токен для тестирования"
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}
            </div>

            <div className="card-footer flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTokenInputModal(false);
                  setSelectedCabinetForTest(null);
                  setTestTokenInput('');
                  setError('');
                }}
                className="btn-secondary"
              >
                Отмена
              </button>
              
              <button
                onClick={() => {
                  testConnection(testTokenInput);
                  setShowTokenInputModal(false);
                  setSelectedCabinetForTest(null);
                  setTestTokenInput('');
                }}
                disabled={!testTokenInput.trim() || isTesting}
                className="btn-primary"
              >
                {isTesting ? (
                  <>
                    <div className="spinner mr-2" />
                    Тестируем...
                  </>
                ) : (
                  <>
                    <TestTube size={16} />
                    Тестировать
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно результатов тестирования */}
      {showTestModal && testResults && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="card-header">
              <h3 className="text-xl font-semibold">Результаты тестирования API</h3>
            </div>
            
            <div className="card-body">
              {/* Общая сводка */}
              <div className="mb-6 p-4 rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-2">Сводка</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Всего тестов: {testResults.summary.totalTests}</div>
                  <div className="text-green-600">Успешно: {testResults.summary.successCount}</div>
                  <div className="text-red-600">Ошибок: {testResults.summary.failureCount}</div>
                  <div>Статус: 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      testResults.summary.overallStatus === 'partial' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : testResults.summary.overallStatus === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {testResults.summary.overallStatus === 'partial' ? 'Частично' :
                       testResults.summary.overallStatus === 'failed' ? 'Ошибка' : 'Успешно'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                  <strong>Рекомендация:</strong> {testResults.summary.recommendation}
                </div>
              </div>

              {/* Детальные результаты */}
              <div className="space-y-3">
                <h4 className="font-semibold">Детальные результаты</h4>
                {testResults.tests.map((test: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {test.status === 'success' ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <XCircle size={20} className="text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-gray-600">{test.description}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className={`font-medium ${
                          test.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {test.message}
                        </div>
                        <div className="text-gray-500">{test.responseTime}</div>
                      </div>
                    </div>
                    
                    {test.httpStatus && (
                      <div className="text-xs text-gray-500 mt-2">
                        HTTP {test.httpStatus} • {test.endpoint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card-footer flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="btn-primary"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}