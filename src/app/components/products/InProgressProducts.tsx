'use client';

import { useEffect, useState } from 'react';
import { clientLogger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Sparkles,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Clock,
  Edit2,
  Save,
  X,
  Upload,
  ChevronDown,
  Check,
  Trash2
} from 'lucide-react';

interface ProductInProgress {
  id: string;
  productName: string;
  status: 'CREATING' | 'ANALYZING' | 'PUBLISHING' | 'COMPLETED' | 'ERROR';
  progress: number;
  currentStage?: string;
  errorMessage?: string;
  productId?: string;
  createdAt: Date | string;
  // Данные от ИИ
  generatedName?: string;
  seoDescription?: string;
  // Категория
  categoryId?: number;
  categoryName?: string;
  // Характеристики
  characteristics?: Array<{
    id: string;
    name: string;
    value: string;
  }>;
  // Комплектация
  packaging?: string;
  price?: number;
  discountPrice?: number;
  costPrice?: number;
  stock?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  // Статус товара (DRAFT, PUBLISHED, etc.)
  productStatus?: string;
}

interface InProgressProductsProps {
  cabinetId?: string | null;
  isCompact?: boolean; // Добавляем флаг компактного режима
}

export default function InProgressProducts({ cabinetId, isCompact = false }: InProgressProductsProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<ProductInProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTasks, setEditedTasks] = useState<Record<string, ProductInProgress>>({});
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Загрузка списка товаров в работе
  useEffect(() => {
    const loadTasks = async () => {
      try {
        clientLogger.log('📥 [InProgress] Загружаем список товаров в работе...', cabinetId ? `(кабинет: ${cabinetId})` : '');
        const tasksUrl = new URL('/api/tasks', window.location.origin);
        // Фильтруем по статусу "в работе" - активные + DRAFT товары
        tasksUrl.searchParams.set('status', 'in-progress');
        if (cabinetId) tasksUrl.searchParams.set('cabinetId', cabinetId);
        const response = await fetch(tasksUrl.toString(), {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.tasks) {
            clientLogger.log(`✅ [InProgress] Загружено товаров: ${data.tasks.length}`);
            data.tasks.forEach((task: any) => {
              clientLogger.log(`   - ${task.generatedName || task.productName} (${task.status}, прогресс: ${task.progress}%)`);
            });
            // Бэкенд уже фильтрует по статусу "in-progress"
            setTasks(data.tasks);
          }
        } else {
          clientLogger.error('❌ [InProgress] Ошибка загрузки данных:', response.status);
          setError('Ошибка загрузки данных');
        }
      } catch (err) {
        clientLogger.error('❌ [InProgress] Ошибка загрузки задач:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [cabinetId]);

  // ✅ Server-Sent Events для real-time обновления задач
  useEffect(() => {
    clientLogger.log('📡 SSE: Подключаемся к потоку обновлений задач...');
    
    // Формируем URL для SSE
    const sseUrl = new URL('/api/tasks/stream', window.location.origin);
    if (cabinetId) sseUrl.searchParams.set('cabinetId', cabinetId);
    
    // Создаем EventSource для SSE
    const eventSource = new EventSource(sseUrl.toString());

    eventSource.onmessage = (event) => {
      try {
        const tasks = JSON.parse(event.data);
        
        // Проверяем на ошибку
        if (tasks.error) {
          clientLogger.error('❌ SSE: Ошибка от сервера:', tasks.error);
          return;
        }
        
        clientLogger.log(`📡 SSE: Получены обновления задач (${tasks.length})`);
        setTasks(tasks);
        setLoading(false);
        setError(null);
      } catch (error) {
        clientLogger.error('❌ SSE: Ошибка парсинга данных', error);
      }
    };

    eventSource.onerror = (error) => {
      clientLogger.error('❌ SSE: Ошибка соединения', error);
      eventSource.close();
      
      // Fallback на обычный запрос при ошибке SSE
      clientLogger.log('🔄 SSE: Переключаемся на fallback запрос...');
      setTimeout(async () => {
        try {
          const tasksUrl = new URL('/api/tasks', window.location.origin);
          tasksUrl.searchParams.set('status', 'in-progress');
          if (cabinetId) tasksUrl.searchParams.set('cabinetId', cabinetId);
          
          const response = await fetch(tasksUrl.toString(), {
            method: 'GET',
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.tasks) {
              clientLogger.log(`✅ Fallback: Загружено ${data.tasks.length} задач`);
              setTasks(data.tasks);
              setLoading(false);
            }
          }
        } catch (err) {
          clientLogger.error('❌ Fallback: Ошибка загрузки задач', err);
          setError('Ошибка загрузки данных');
        }
      }, 5000);
    };

    eventSource.onopen = () => {
      clientLogger.log('✅ SSE: Соединение установлено');
    };

    // Cleanup при размонтировании компонента
    return () => {
      clientLogger.log('📡 SSE: Закрываем соединение');
      eventSource.close();
    };
  }, [cabinetId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CREATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border-2 border-blue-300">
            <Loader2 className="w-3 h-3 animate-spin" />
            Создание
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold border-2 border-purple-300">
            <Brain className="w-3 h-3 animate-pulse" />
            Анализ ИИ
          </span>
        );
      case 'PUBLISHING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border-2 border-green-300">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Публикация
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border-2 border-green-300">
            <CheckCircle className="w-3 h-3" />
            Готово
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border-2 border-red-300">
            <AlertCircle className="w-3 h-3" />
            Ошибка
          </span>
        );
      default:
        return null;
    }
  };

  // Компактный режим для мобильных
  if (isCompact) {
    return (
      <div className="w-full">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            <span className="text-sm text-gray-600">Загрузка...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <span className="text-xs text-gray-500">Нет задач</span>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : task.status === 'ERROR' ? (
                      <AlertCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {task.generatedName || task.productName}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {tasks.length > 3 && (
              <div className="text-center">
                <span className="text-xs text-gray-500">+{tasks.length - 3} ещё</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-0">
        {/* Header skeleton */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-5 bg-gray-200 rounded-full w-8 animate-pulse"></div>
          </div>
        </div>
        
        {/* Cards skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border-2 border-gray-200 p-3 sm:p-4 shadow-md">
              <div className="w-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                </div>
                
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-10 animate-pulse"></div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full w-full animate-pulse"></div>
                </div>
                
                {/* Expandable section */}
                <div className="bg-gray-100 rounded-lg p-2.5 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header - адаптивный */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Товары в работе</h1>
          <span className="text-xs md:text-sm text-gray-500">({tasks.length})</span>
        </div>
        <p className="text-xs md:text-sm text-gray-600 hidden md:block">Обрабатываются ИИ</p>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="liquid-glass rounded-2xl border-2 border-gray-300 p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Нет товаров в работе</h3>
          <p className="text-gray-600 mb-6">Создайте новый товар, чтобы увидеть его здесь</p>
          <button
            onClick={() => router.push('/?tab=upload')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg transform hover:scale-105"
          >
            Создать товар
          </button>
        </div>
      )}

      {/* Tasks list */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-xl border-2 border-purple-200 p-3 sm:p-4 shadow-md hover:shadow-lg transition-all">
            {/* Content */}
            <div className="w-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    {/* Название товара - редактируемое */}
                    {editingField === `name-${task.id}` && editedTasks[task.id] ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={editedTasks[task.id].generatedName || ''}
                          onChange={(e) => {
                            const updated = { ...editedTasks[task.id] };
                            updated.generatedName = e.target.value;
                            setEditedTasks({ ...editedTasks, [task.id]: updated });
                          }}
                          className="flex-1 px-3 py-2 border-2 border-purple-500 rounded-lg bg-white text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const updatedTasks = tasks.map(t => 
                              t.id === task.id ? { ...t, generatedName: editedTasks[task.id].generatedName } : t
                            );
                            setTasks(updatedTasks);
                            setEditingField(null);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Check className="w-5 h-5 text-green-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="group">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                          {editedTasks[task.id]?.generatedName ?? task.generatedName ?? task.productName}
                        </h3>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(task.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(task.status)}
                  </div>
                </div>

                {/* Progress bar */}
                {task.status !== 'COMPLETED' && task.status !== 'ERROR' && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-600">Прогресс</span>
                      <span className="text-xs font-bold text-purple-600">{task.progress}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* AI Generated Data */}
                {task.generatedName && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <button
                      onClick={() => setExpandedSections({ ...expandedSections, [`ai-${task.id}`]: !expandedSections[`ai-${task.id}`] })}
                      className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-sm sm:text-base font-bold text-gray-900">Данные товара</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-600 transition-transform ${
                          expandedSections[`ai-${task.id}`] ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedSections[`ai-${task.id}`] && (
                    <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-2 sm:space-y-3 border-t-2 border-purple-200">
                      {/* Category */}
                      {(task.categoryName || editedTasks[task.id]?.categoryName) && (
                        <div className="bg-white rounded-lg p-2.5 sm:p-3 border-2 border-purple-200">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Категория</label>
                          <p className="text-sm text-gray-900 font-medium">{editedTasks[task.id]?.categoryName ?? task.categoryName}</p>
                        </div>
                      )}

                      {/* Description */}
                      {task.seoDescription && (
                        <div className="bg-white rounded-lg p-2.5 sm:p-3 border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-gray-600">Описание товара</label>
                            <Edit2 
                              onClick={() => {
                                if (!editedTasks[task.id]) {
                                  setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                }
                                setEditingField(`desc-${task.id}`);
                              }}
                              className="w-3.5 h-3.5 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                            />
                          </div>
                          {editingField === `desc-${task.id}` && editedTasks[task.id] ? (
                            <textarea
                              autoFocus
                              value={editedTasks[task.id].seoDescription || ''}
                              onChange={(e) => {
                                const updated = { ...editedTasks[task.id] };
                                updated.seoDescription = e.target.value;
                                setEditedTasks({ ...editedTasks, [task.id]: updated });
                              }}
                              onBlur={() => {
                                setEditingField(null);
                              }}
                              className="w-full px-2.5 py-2 bg-white border-2 border-purple-300 rounded-lg text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none caret-black"
                              rows={3}
                              style={{caretColor: 'black'}}
                            />
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">{editedTasks[task.id]?.seoDescription ?? task.seoDescription}</p>
                          )}
                        </div>
                      )}

                      {/* Prices and Stock - компактная сетка */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Price */}
                        <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-600">Цена</label>
                            <Edit2 
                              onClick={() => {
                                if (!editedTasks[task.id]) {
                                  setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                }
                                setEditingField(`price-${task.id}`);
                              }}
                              className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                            />
                          </div>
                          {editingField === `price-${task.id}` && editedTasks[task.id] ? (
                            <input
                              autoFocus
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editedTasks[task.id].price ?? 0}
                              onChange={(e) => {
                                const updated = { ...editedTasks[task.id] };
                                updated.price = parseFloat(e.target.value) || 0;
                                setEditedTasks({ ...editedTasks, [task.id]: updated });
                              }}
                              onBlur={() => setEditingField(null)}
                              className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                              style={{caretColor: 'black'}}
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-bold text-gray-900">{editedTasks[task.id]?.price ?? task.price ?? 0} ₽</p>
                          )}
                        </div>

                        {/* Discount Price */}
                        <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-600">Со скидкой</label>
                            <Edit2 
                              onClick={() => {
                                if (!editedTasks[task.id]) {
                                  setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                }
                                setEditingField(`discount-${task.id}`);
                              }}
                              className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                            />
                          </div>
                          {editingField === `discount-${task.id}` && editedTasks[task.id] ? (
                            <input
                              autoFocus
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editedTasks[task.id].discountPrice ?? 0}
                              onChange={(e) => {
                                const updated = { ...editedTasks[task.id] };
                                updated.discountPrice = parseFloat(e.target.value) || 0;
                                setEditedTasks({ ...editedTasks, [task.id]: updated });
                              }}
                              onBlur={() => setEditingField(null)}
                              className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                              style={{caretColor: 'black'}}
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-bold text-green-600">{editedTasks[task.id]?.discountPrice ?? task.discountPrice ?? 0} ₽</p>
                          )}
                        </div>

                        {/* Cost Price */}
                        <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-600">Себестоимость</label>
                            <Edit2 
                              onClick={() => {
                                if (!editedTasks[task.id]) {
                                  setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                }
                                setEditingField(`cost-${task.id}`);
                              }}
                              className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                            />
                          </div>
                          {editingField === `cost-${task.id}` && editedTasks[task.id] ? (
                            <input
                              autoFocus
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editedTasks[task.id].costPrice ?? 0}
                              onChange={(e) => {
                                const updated = { ...editedTasks[task.id] };
                                updated.costPrice = parseFloat(e.target.value) || 0;
                                setEditedTasks({ ...editedTasks, [task.id]: updated });
                              }}
                              onBlur={() => setEditingField(null)}
                              className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                              style={{caretColor: 'black'}}
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-bold text-orange-600">{editedTasks[task.id]?.costPrice ?? task.costPrice ?? 0} ₽</p>
                          )}
                        </div>

                        {/* Stock */}
                        <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-gray-600">Остаток</label>
                            <Edit2 
                              onClick={() => {
                                if (!editedTasks[task.id]) {
                                  setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                }
                                setEditingField(`stock-${task.id}`);
                              }}
                              className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                            />
                          </div>
                          {editingField === `stock-${task.id}` && editedTasks[task.id] ? (
                            <input
                              autoFocus
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editedTasks[task.id].stock ?? 0}
                              onChange={(e) => {
                                const updated = { ...editedTasks[task.id] };
                                updated.stock = parseInt(e.target.value) || 0;
                                setEditedTasks({ ...editedTasks, [task.id]: updated });
                              }}
                              onBlur={() => setEditingField(null)}
                              className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                              style={{caretColor: 'black'}}
                            />
                          ) : (
                            <p className="text-sm sm:text-base font-bold text-purple-600">{editedTasks[task.id]?.stock ?? task.stock ?? 0} шт</p>
                          )}
                        </div>
                      </div>

                      {/* Dimensions */}
                      {task.dimensions && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {/* Length */}
                          <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-gray-600">Длина</label>
                              <Edit2 
                                onClick={() => {
                                  if (!editedTasks[task.id]) {
                                    setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                  }
                                  setEditingField(`length-${task.id}`);
                                }}
                                className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                              />
                            </div>
                            {editingField === `length-${task.id}` && editedTasks[task.id] ? (
                              <input
                                autoFocus
                                type="number"
                                inputMode="decimal"
                                value={editedTasks[task.id].dimensions?.length ?? 0}
                                onChange={(e) => {
                                  const updated = { ...editedTasks[task.id] };
                                  if (!updated.dimensions) updated.dimensions = {};
                                  updated.dimensions.length = parseFloat(e.target.value) || 0;
                                  setEditedTasks({ ...editedTasks, [task.id]: updated });
                                }}
                                onBlur={() => setEditingField(null)}
                                className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                                style={{caretColor: 'black'}}
                              />
                            ) : (
                              <p className="text-sm font-bold text-gray-900">{editedTasks[task.id]?.dimensions?.length ?? task.dimensions.length ?? '-'} см</p>
                            )}
                          </div>
                          
                          {/* Width */}
                          <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-gray-600">Ширина</label>
                              <Edit2 
                                onClick={() => {
                                  if (!editedTasks[task.id]) {
                                    setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                  }
                                  setEditingField(`width-${task.id}`);
                                }}
                                className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                              />
                            </div>
                            {editingField === `width-${task.id}` && editedTasks[task.id] ? (
                              <input
                                autoFocus
                                type="number"
                                inputMode="decimal"
                                value={editedTasks[task.id].dimensions?.width ?? 0}
                                onChange={(e) => {
                                  const updated = { ...editedTasks[task.id] };
                                  if (!updated.dimensions) updated.dimensions = {};
                                  updated.dimensions.width = parseFloat(e.target.value) || 0;
                                  setEditedTasks({ ...editedTasks, [task.id]: updated });
                                }}
                                onBlur={() => setEditingField(null)}
                                className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                                style={{caretColor: 'black'}}
                              />
                            ) : (
                              <p className="text-sm font-bold text-gray-900">{editedTasks[task.id]?.dimensions?.width ?? task.dimensions.width ?? '-'} см</p>
                            )}
                          </div>
                          
                          {/* Height */}
                          <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-gray-600">Высота</label>
                              <Edit2 
                                onClick={() => {
                                  if (!editedTasks[task.id]) {
                                    setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                  }
                                  setEditingField(`height-${task.id}`);
                                }}
                                className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                              />
                            </div>
                            {editingField === `height-${task.id}` && editedTasks[task.id] ? (
                              <input
                                autoFocus
                                type="number"
                                inputMode="decimal"
                                value={editedTasks[task.id].dimensions?.height ?? 0}
                                onChange={(e) => {
                                  const updated = { ...editedTasks[task.id] };
                                  if (!updated.dimensions) updated.dimensions = {};
                                  updated.dimensions.height = parseFloat(e.target.value) || 0;
                                  setEditedTasks({ ...editedTasks, [task.id]: updated });
                                }}
                                onBlur={() => setEditingField(null)}
                                className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                                style={{caretColor: 'black'}}
                              />
                            ) : (
                              <p className="text-sm font-bold text-gray-900">{editedTasks[task.id]?.dimensions?.height ?? task.dimensions.height ?? '-'} см</p>
                            )}
                          </div>
                          
                          {/* Weight */}
                          <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-gray-600">Вес</label>
                              <Edit2 
                                onClick={() => {
                                  if (!editedTasks[task.id]) {
                                    setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                  }
                                  setEditingField(`weight-${task.id}`);
                                }}
                                className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" 
                              />
                            </div>
                            {editingField === `weight-${task.id}` && editedTasks[task.id] ? (
                              <input
                                autoFocus
                                type="number"
                                inputMode="decimal"
                                value={editedTasks[task.id].dimensions?.weight ?? 0}
                                onChange={(e) => {
                                  const updated = { ...editedTasks[task.id] };
                                  if (!updated.dimensions) updated.dimensions = {};
                                  updated.dimensions.weight = parseFloat(e.target.value) || 0;
                                  setEditedTasks({ ...editedTasks, [task.id]: updated });
                                }}
                                onBlur={() => setEditingField(null)}
                                className="w-full px-2 py-1 bg-white border-2 border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 caret-black"
                                style={{caretColor: 'black'}}
                              />
                            ) : (
                              <p className="text-sm font-bold text-gray-900">{editedTasks[task.id]?.dimensions?.weight ?? task.dimensions.weight ?? '-'} кг</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Packaging */}
                      <div
                        onDoubleClick={() => {
                          setEditingTaskId(task.id);
                          setEditingField(`packaging-${task.id}`);
                          if (!editedTasks[task.id]) {
                            setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                          }
                        }}
                        className="group cursor-pointer bg-white/80 rounded-lg p-4 border border-amber-200 hover:border-amber-400 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700">Комплектация</label>
                          <Edit2 
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditingField(`packaging-${task.id}`);
                              if (!editedTasks[task.id]) {
                                setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                              }
                            }}
                            className="w-4 h-4 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" />
                        </div>
                        {editingField === `packaging-${task.id}` && editedTasks[task.id] ? (
                          <textarea
                            autoFocus
                            value={editedTasks[task.id].packaging || ''}
                            onChange={(e) => {
                              const updated = { ...editedTasks[task.id] };
                              updated.packaging = e.target.value;
                              setEditedTasks({ ...editedTasks, [task.id]: updated });
                            }}
                            onBlur={() => {
                              const updatedTasks = tasks.map(t => 
                                t.id === task.id ? { ...t, packaging: editedTasks[task.id].packaging } : t
                              );
                              setTasks(updatedTasks);
                              setEditingField(null);
                            }}
                            className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                            rows={3}
                            placeholder="Опишите комплектацию товара..."
                          />
                        ) : (
                          <p className={`text-gray-900 leading-relaxed ${!editedTasks[task.id]?.packaging && !task.packaging ? 'text-gray-400 italic' : ''}`}>
                            {editedTasks[task.id]?.packaging ?? task.packaging ?? '(не заполнено)'}
                          </p>
                        )}
                      </div>

                      {/* Characteristics */}
                      {task.characteristics && task.characteristics.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Характеристики ({task.characteristics.length})
                          </label>
                          <div className="space-y-3">
                            {task.characteristics.map((char, idx) => {
                              const currentValue = editedTasks[task.id]?.characteristics?.[idx]?.value ?? char.value;
                              const isEmptyField = !currentValue || (typeof currentValue === 'string' && currentValue.trim() === '');
                              return (
                                <div
                                  key={idx}
                                  onDoubleClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditingField(`char-${task.id}-${idx}`);
                                    if (!editedTasks[task.id]) {
                                      setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                    }
                                  }}
                                  className={`group cursor-pointer rounded-lg p-4 border transition-colors ${
                                    isEmptyField
                                      ? 'bg-gray-50 border-gray-200 hover:border-purple-300'
                                      : 'bg-white/80 border-gray-200 hover:border-purple-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-gray-700">{char.name}</p>
                                    <Edit2 
                                      onClick={() => {
                                        setEditingTaskId(task.id);
                                        setEditingField(`char-${task.id}-${idx}`);
                                        if (!editedTasks[task.id]) {
                                          setEditedTasks({ ...editedTasks, [task.id]: JSON.parse(JSON.stringify(task)) });
                                        }
                                      }}
                                      className="w-3 h-3 text-gray-400 hover:text-purple-600 transition-colors cursor-pointer" />
                                  </div>
                                  {editingField === `char-${task.id}-${idx}` && editedTasks[task.id]?.characteristics?.[idx] ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editedTasks[task.id].characteristics?.[idx]?.value || ''}
                                      onChange={(e) => {
                                        const updated = { ...editedTasks[task.id] };
                                        if (updated.characteristics && updated.characteristics[idx]) {
                                          updated.characteristics[idx].value = e.target.value;
                                          setEditedTasks({ ...editedTasks, [task.id]: updated });
                                        }
                                      }}
                                      onBlur={() => {
                                        const updatedTasks = tasks.map(t => {
                                          if (t.id === task.id && editedTasks[task.id]?.characteristics) {
                                            return { ...t, characteristics: editedTasks[task.id].characteristics };
                                          }
                                          return t;
                                        });
                                        setTasks(updatedTasks);
                                        setEditingField(null);
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                                      placeholder="Введите значение"
                                    />
                                  ) : (
                                    <p className={isEmptyField && !editedTasks[task.id]?.characteristics?.[idx]?.value ? 'text-gray-400 italic' : 'text-gray-900'}>
                                      {editedTasks[task.id]?.characteristics?.[idx]?.value || char.value || '(не заполнено)'}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {task.status === 'ERROR' && task.errorMessage && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-bold text-red-900">Ошибка</span>
                    </div>
                    <p className="text-sm text-red-700">{task.errorMessage}</p>
                  </div>
                )}

                {/* Кнопки действий */}
                {task.status === 'COMPLETED' && (
                  <div className="flex flex-wrap gap-2 mt-4 mb-3">
                    {task.productStatus !== 'PUBLISHED' && (
                      <button
                        onClick={async () => {
                          // ВСЕГДА сохраняем изменения перед публикацией
                          // Используем отредактированные данные если они есть, иначе текущие данные задачи
                          const dataToSave = editedTasks[task.id] || task;
                          
                          clientLogger.log(`📝 [InProgress] Начинаем публикацию товара: ${task.productId}`);
                          clientLogger.log(`   - Task ID: ${task.id}`);
                          clientLogger.log(`   - Название: ${dataToSave.generatedName}`);
                          
                          setSavingTaskId(task.id);
                          try {
                            clientLogger.log(`💾 [InProgress] Сохраняем данные товара...`);
                            const response = await fetch(`/api/products/${task.productId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                generatedName: dataToSave.generatedName,
                                seoDescription: dataToSave.seoDescription,
                                price: dataToSave.price,
                                discountPrice: dataToSave.discountPrice,
                                costPrice: dataToSave.costPrice,
                                stock: dataToSave.stock,
                                packaging: dataToSave.packaging,
                                aiCharacteristics: {
                                  characteristics: dataToSave.characteristics || []
                                }
                              })
                            });

                            if (!response.ok) {
                              clientLogger.error(`❌ [InProgress] Ошибка сохранения: ${response.status}`);
                              setSavingTaskId(null);
                              return;
                            }
                            clientLogger.log(`✅ [InProgress] Данные товара успешно сохранены`);
                          } catch (err) {
                            clientLogger.error('❌ [InProgress] Ошибка сохранения:', err);
                            setSavingTaskId(null);
                            return;
                          }

                          // Затем публикуем
                          setPublishingTaskId(task.id);
                          try {
                            clientLogger.log(`🚀 [InProgress] Отправляем товар на публикацию на WB...`);
                            
                            // 🔥 ФИЛЬТРУЕМ: отправляем только заполненные характеристики
                            const filledCharacteristics = (dataToSave.characteristics || []).filter((char: any) => {
                              const hasValue = char.value !== null && 
                                              char.value !== undefined && 
                                              char.value !== '' &&
                                              (typeof char.value === 'string' ? char.value.trim() !== '' : true);
                              return hasValue;
                            });
                            
                            clientLogger.log(`📊 [InProgress] Характеристики: всего ${dataToSave.characteristics?.length || 0}, заполненных ${filledCharacteristics.length}`);
                            
                            const publishBody = {
                              characteristics: filledCharacteristics,
                              seoTitle: dataToSave.generatedName,
                              seoDescription: dataToSave.seoDescription,
                              finalStatus: 'PUBLISHED'
                            };
                            clientLogger.log(`📤 [InProgress] Тело запроса:`, publishBody);
                            
                            const response = await fetch(`/api/products/${task.productId}/publish`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify(publishBody)
                            });
                            
                            clientLogger.log(`📥 [InProgress] Статус ответа: ${response.status}`);

                            const publishResult = await response.json();
                            
                            if (response.ok && publishResult.success) {
                              clientLogger.log(`✅ [InProgress] Товар успешно опубликован на WB!`);
                              clientLogger.log(`   - WB Product ID: ${publishResult.wbProductId}`);
                              clientLogger.log(`   - Vendor Code: ${publishResult.vendorCode}`);
                              clientLogger.log(`   - Barcode: ${publishResult.barcode}`);
                              
                              // 🔥 УДАЛЯЕМ товар из раздела "В работе"
                              clientLogger.log(`🗑️ [InProgress] Удаляем товар из раздела "В работе"...`);
                              const filteredTasks = tasks.filter(t => t.id !== task.id);
                              setTasks(filteredTasks);
                              clientLogger.log(`✅ [InProgress] Товар удален из раздела. Осталось товаров: ${filteredTasks.length}`);
                              
                              setEditingTaskId(null);
                              setEditedTasks({});
                              setEditingField(null);
                            } else {
                              clientLogger.error(`❌ [InProgress] Ошибка публикации на WB:`, publishResult.error);
                              clientLogger.error(`   - Детали: ${publishResult.details}`);
                            }
                          } catch (err) {
                            clientLogger.error('❌ [InProgress] Ошибка публикации:', err);
                          } finally {
                            setSavingTaskId(null);
                            setPublishingTaskId(null);
                          }
                        }}
                        disabled={publishingTaskId === task.id || savingTaskId === task.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-md text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        {publishingTaskId === task.id || savingTaskId === task.id ? 'Обработка...' : 'Опубликовать'}
                      </button>
                    )}
                    {task.productStatus === 'PUBLISHED' && (
                      <button
                        onClick={() => router.push(`/?tab=products&productId=${task.productId}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-all shadow-md text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Перейти к товару
                      </button>
                    )}
                    {/* Кнопка удаления */}
                    <button
                      onClick={async () => {
                        if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
                        
                        setDeletingTaskId(task.id);
                        try {
                          clientLogger.log(`🗑️ [InProgress] Удаляем товар: ${task.productId}`);
                          
                          const response = await fetch(`/api/products/${task.productId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                          });
                          
                          if (response.ok) {
                            clientLogger.log(`✅ [InProgress] Товар успешно удален`);
                            // Удаляем из списка
                            const filteredTasks = tasks.filter(t => t.id !== task.id);
                            setTasks(filteredTasks);
                            clientLogger.log(`✅ [InProgress] Товар удален из раздела. Осталось товаров: ${filteredTasks.length}`);
                          } else {
                            const error = await response.json();
                            clientLogger.error(`❌ [InProgress] Ошибка удаления:`, error);
                            alert('Ошибка удаления товара');
                          }
                        } catch (err) {
                          clientLogger.error('❌ [InProgress] Ошибка удаления:', err);
                          alert('Ошибка удаления товара');
                        } finally {
                          setDeletingTaskId(null);
                        }
                      }}
                      disabled={deletingTaskId === task.id || publishingTaskId === task.id || savingTaskId === task.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 rounded-lg font-semibold transition-all shadow-md text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingTaskId === task.id ? 'Удаление...' : 'Удалить'}
                    </button>
                  </div>
                )}
              </div>
          </div>
        ))}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
