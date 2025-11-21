'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { clientLogger } from '@/lib/logger';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useProductsCache } from '../../hooks/useProductsCache';
import ProductsLoadingSkeleton from './ProductsLoadingSkeleton';
import ProductEditModal from './ProductEditModal';
import AiOptimizationModal from '../AiOptimizationModal';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Eye,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertCircle,
  Edit2,
  Save,
  X,
  ExternalLink,
  Loader2,
  ArrowLeft,
  User,
  Warehouse,
  Filter,
  Check,
  Lock,
  Unlock,
  Info,
  Sparkles
} from 'lucide-react';

interface ProductAnalytics {
  nmID: number;
  vendorCode: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  
  price: number;
  discountPrice: number;
  discount: number;
  costPrice: number;
  
  stock: number;
  reserved: number;
  inTransit: number;
  inReturn: number;
  
  analytics: {
    sales: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      units: number;
    };
    conversion: {
      views: number;
      addToCart: number;
      cartToOrder: number;
      ctr: number;
    };
    searchQueries: {
      topQueries: Array<{
        query: string;
        openCard: number;
        addToCart: number;
        orders: number;
        avgPosition: number;
      }>;
      totalQueries: number;
    };
  };
  
  images: string[];
  rating: number;
  reviewsCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductsWithAnalyticsProps {
  cabinetId?: string | null;
}

export default function ProductsWithAnalytics({ cabinetId }: ProductsWithAnalyticsProps) {
  const router = useRouter();
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'oldest' | 'price-high' | 'price-low' | 'name-asc' | 'name-desc'>('name-asc');
  const [editingCostPrice, setEditingCostPrice] = useState<{nmID: number, value: number} | null>(null);
  const [savingCostPrice, setSavingCostPrice] = useState(false);
  const [returnTaskId, setReturnTaskId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductAnalytics | null>(null);
  const [warehouseStocks, setWarehouseStocks] = useState<Map<number, any>>(new Map());
  const [loadingWarehouseStocks, setLoadingWarehouseStocks] = useState(false);
  const [editingStock, setEditingStock] = useState<{nmID: number, warehouseId: number, value: number} | null>(null);
  const [savingStock, setSavingStock] = useState(false);
  const [editingStockInline, setEditingStockInline] = useState<{nmID: number, type: 'FBS' | 'FBW', value: number} | null>(null);
  const [todayOrders, setTodayOrders] = useState<Map<number, {count: number, totalQuantity: number, totalSum: number}>>(new Map());
  const [loadingTodayOrders, setLoadingTodayOrders] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const [editingPrice, setEditingPrice] = useState<{nmID: number, originalPrice: number, discountPrice: number} | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [editingPriceInline, setEditingPriceInline] = useState<{nmID: number, originalPrice: number, discountPrice: number} | null>(null);
  const [savingPriceInline, setSavingPriceInline] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [editingDiscount, setEditingDiscount] = useState<{nmID: number, discount: number, originalPrice: number} | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [priceNotification, setPriceNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [priceLockStatus, setPriceLockStatus] = useState<Map<number, {locked: boolean, price: number}>>(new Map());
  const [loadingPriceLock, setLoadingPriceLock] = useState(false);
  const [syncingStocks, setSyncingStocks] = useState(false);

  // AI оптимизация
  const [aiOptimizationModal, setAiOptimizationModal] = useState<{
    isOpen: boolean;
    productId: string;
    productName: string;
  } | null>(null);

  // Функция загрузки товаров
  const fetchProducts = useCallback(async (signal?: AbortSignal, forceSync = false) => {
    clientLogger.log('Начинаем загрузку товаров...', forceSync ? '(принудительная синхронизация)' : '', cabinetId ? `(кабинет: ${cabinetId})` : '');
    
    // Если НЕ принудительная синхронизация - пробуем загрузить из БД
    if (!forceSync) {
      try {
        const dbUrl = new URL('/api/wb/products', window.location.origin);
        dbUrl.searchParams.set('source', 'db');
        if (cabinetId) dbUrl.searchParams.set('cabinetId', cabinetId);
        const dbResponse = await fetch(dbUrl.toString(), { signal });
        const dbData = await dbResponse.json();
      
      // АВТОСИНХРОНИЗАЦИЯ: Если товаров нет или данные устарели
      if (dbResponse.ok && dbData.needsSync) {
        clientLogger.log('⚠️ Требуется синхронизация:', dbData.syncMessage);
        // Если товаров совсем нет - автоматически синхронизируем
        if (dbData.products.length === 0) {
          clientLogger.log('🔄 Автоматическая синхронизация при первом запуске...');
          throw new Error('NO_PRODUCTS'); // Переходим к загрузке с WB
        }
      }
        
        if (dbResponse.ok && dbData.products && dbData.products.length > 0) {
          clientLogger.log('✅ Загружены товары из БД:', dbData.products.length);
          
          // Преобразуем данные из БД
          const transformedProducts = dbData.products
            .map((p: any) => {
              const nmID = parseInt(p.wbNmId) || parseInt(p.id) || 0;
              const wbData = p.wbData || {};
              
              // Извлекаем фотки из wbData
              let images: string[] = [];
              if (wbData.images && Array.isArray(wbData.images)) {
                images = wbData.images;
              } else if (wbData.photos && Array.isArray(wbData.photos)) {
                images = wbData.photos;
              } else if (wbData.mediaFiles && Array.isArray(wbData.mediaFiles)) {
                images = wbData.mediaFiles;
              }
              
              // Логирование для отладки
              if (images.length === 0) {
                clientLogger.warn(`⚠️ Товар ${nmID}: изображения не найдены. wbData:`, wbData);
              }
              
              const vendorCode = p.vendorCode || wbData.vendorCode || `UNKNOWN-${nmID}`;
              if (!p.vendorCode && !wbData.vendorCode) {
                clientLogger.warn(`⚠️ Товар ${nmID}: артикул отсутствует`);
              }
              
              return {
                nmID,
                vendorCode,
                title: p.generatedName || p.name || wbData.title || '',
                description: p.seoDescription || wbData.description || '',
                brand: p.brand || wbData.brand || 'Не указан',
                category: wbData.category || wbData.object || 'Не указана',
                price: p.price || 0,
                discountPrice: p.discountPrice || p.price || 0,
                discount: p.discount || 0,
                costPrice: p.costPrice || 0,
                stock: p.stock || 0,
                reserved: p.reserved || 0,
                inTransit: p.inTransit || 0,
                inReturn: p.inReturn || 0,
                analytics: {
                  sales: { orders: 0, revenue: 0, avgOrderValue: 0, units: 0 },
                  conversion: { views: 0, addToCart: 0, cartToOrder: 0, ctr: 0 },
                  searchQueries: { topQueries: [], totalQueries: 0 }
                },
                images: images,
                rating: 0,
                reviewsCount: 0,
                status: p.status || 'draft',
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
              };
            })
            .filter((p: any) => p.nmID > 0); // Фильтруем товары без валидного ID
          
          // Проверяем дубликаты
          const uniqueNmIds = new Set(transformedProducts.map((p: any) => p.nmID));
          if (uniqueNmIds.size !== transformedProducts.length) {
            clientLogger.warn(`⚠️ [Products] ДУБЛИКАТЫ! Уникальных: ${uniqueNmIds.size}, всего: ${transformedProducts.length}`);
            // Удаляем дубликаты
            const uniqueProducts = Array.from(
              new Map(transformedProducts.map((p: any) => [p.nmID, p])).values()
            );
            clientLogger.log(`✅ [Products] Дубликаты удалены: ${uniqueProducts.length} товаров`);
            return uniqueProducts;
          }
          
          clientLogger.log(`✅ [Products] Загружено из БД: ${transformedProducts.length} товаров (без дубликатов)`);
          return transformedProducts;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        clientLogger.log('⚠️ БД недоступна или пуста, загружаем с WB...', err.message);
      }
    }
    
    // Если БД пуста, загружаем с WB + остатки
    clientLogger.log('📥 Загрузка товаров с Wildberries + реальные остатки...');
    const wbResponse = await fetch('/api/wb/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'get-products', 
        syncToDb: true,
        ...(cabinetId && { cabinetId })
      }),
      signal
    });
    
    const wbData = await wbResponse.json();
    
    if (!wbResponse.ok) {
      throw new Error(wbData.error || 'Ошибка загрузки товаров с WB');
    }
    
    // Преобразуем данные с WB
    const transformedProducts = wbData.products.map((p: any) => ({
      nmID: p.nmID,
      vendorCode: p.vendorCode,
      title: p.title,
      description: p.description,
      brand: p.brand,
      category: p.category,
      price: p.price,
      discountPrice: p.discountPrice,
      discount: p.discount,
      costPrice: p.costPrice,
      stock: p.stock,
      reserved: p.reserved,
      inTransit: p.inTransit,
      inReturn: p.inReturn,
      analytics: {
        sales: { orders: 0, revenue: 0, avgOrderValue: 0, units: 0 },
        conversion: { views: 0, addToCart: 0, cartToOrder: 0, ctr: 0 },
        searchQueries: { topQueries: [], totalQueries: 0 }
      },
      images: p.images,
      rating: 0,
      reviewsCount: 0,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    clientLogger.log('✅ Получено товаров с WB:', transformedProducts.length);
    
    // Показываем информацию о синхронизации
    if (wbData.synced && wbData.syncResult) {
      clientLogger.log('✅ Результат синхронизации:', wbData.syncResult);
    }
    
    return transformedProducts;
  }, [cabinetId]);

  // Используем кеш товаров
  const cacheConfig = useMemo(() => ({
    key: 'wb-products-cache',
    ttl: 30 * 60 * 1000, // 30 минут
    backgroundRefresh: true // Включено - после оптимизации (без сортировки в SQL)
  }), []);
  
  const { 
    data: products, 
    loading, 
    backgroundLoading,
    error, 
    lastUpdate,
    isFromCache,
    refresh 
  } = useProductsCache<ProductAnalytics[]>(fetchProducts, cacheConfig);

  useEffect(() => {
    const taskId = sessionStorage.getItem('returnToTask');
    if (taskId) {
      setReturnTaskId(taskId);
    }
  }, []);

  // Закрытие селектора категорий при нажатии Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && categoryDropdownOpen) {
        setCategoryDropdownOpen(false);
        setCategorySearchTerm('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [categoryDropdownOpen]);

  // Закрытие селектора категорий при скролле страницы
  useEffect(() => {
    const handleScroll = () => {
      if (categoryDropdownOpen) {
        setCategoryDropdownOpen(false);
        setCategorySearchTerm('');
      }
    };
    document.addEventListener('scroll', handleScroll);
    return () => document.removeEventListener('scroll', handleScroll);
  }, [categoryDropdownOpen]);

  // Фокус на input цены без автоматической прокрутки
  useEffect(() => {
    if (editingPriceInline && priceInputRef.current) {
      setTimeout(() => {
        priceInputRef.current?.focus({ preventScroll: true });
      }, 0);
    }
  }, [editingPriceInline]);

  // Загружаем данные об остатках на складах
  useEffect(() => {
    if (!products || products.length === 0) return;
    
    const loadWarehouseStocks = async () => {
      try {
        setLoadingWarehouseStocks(true);
        const stocksUrl = cabinetId ? `/api/wb/stocks?cabinetId=${cabinetId}` : '/api/wb/stocks';
        clientLogger.log(`📦 [Stocks] Загрузка остатков с ${stocksUrl}`);
        
        const response = await fetch(stocksUrl);
        if (response.ok) {
          const data = await response.json();
          clientLogger.log(`📦 [Stocks] Ответ получен:`, data);
          
          const stocksMap = new Map();
          
          // Преобразуем данные в Map для удобного использования
          if (data.stocks && Array.isArray(data.stocks)) {
            data.stocks.forEach((stock: any) => {
              stocksMap.set(stock.nmId, stock);
            });
          }
          
          setWarehouseStocks(stocksMap);
          clientLogger.log(`📦 [Stocks] Загружены остатки для ${stocksMap.size} товаров`);
          clientLogger.log(`📦 [Stocks] Пример данных:`, Array.from(stocksMap.entries()).slice(0, 3));
          
          // Показываем сводную информацию
          const totalFBS = Array.from(stocksMap.values()).reduce((sum: number, s: any) => sum + (s.fbsStock || 0), 0);
          const totalFBW = Array.from(stocksMap.values()).reduce((sum: number, s: any) => sum + (s.fbwStock || 0), 0);
          clientLogger.log(`📊 [Stocks Summary] FBS: ${totalFBS}, FBW: ${totalFBW}`);
        } else {
          clientLogger.error(`❌ [Stocks] Ошибка HTTP: ${response.status}`);
        }
      } catch (error) {
        clientLogger.error('❌ Ошибка загрузки остатков по складам:', error);
      } finally {
        setLoadingWarehouseStocks(false);
      }
    };
    
    loadWarehouseStocks();
  }, [products, cabinetId]);

  // Загружаем заказы за сегодня
  useEffect(() => {
    if (!products || products.length === 0) return;
    
    const loadTodayOrders = async () => {
      try {
        setLoadingTodayOrders(true);
        const ordersUrl = cabinetId ? `/api/wb/orders/today?cabinetId=${cabinetId}` : '/api/wb/orders/today';
        clientLogger.log(`📋 [Orders] Загрузка заказов с ${ordersUrl}`);
        
        const response = await fetch(ordersUrl);
        if (response.ok) {
          const data = await response.json();
          clientLogger.log(`📋 [Orders] Ответ получен:`, data);
          
          const ordersMap = new Map();
          
          // Преобразуем данные в Map для удобного использования
          if (data.data && data.data.byProduct) {
            Object.entries(data.data.byProduct).forEach(([nmId, orderData]: [string, any]) => {
              ordersMap.set(parseInt(nmId), {
                count: orderData.ordersCount,
                totalQuantity: orderData.totalQuantity,
                totalSum: orderData.totalSum
              });
            });
          }
          
          setTodayOrders(ordersMap);
          const totalOrders = data.data?.summary?.totalOrders || 0;
          clientLogger.log(`📋 [Orders] Загружено заказов: ${totalOrders} (${ordersMap.size} товаров)`);
        } else {
          clientLogger.error(`❌ [Orders] Ошибка HTTP: ${response.status}`);
        }
      } catch (error) {
        clientLogger.error('❌ Ошибка загрузки заказов за сегодня:', error);
      } finally {
        setLoadingTodayOrders(false);
      }
    };
    
    loadTodayOrders();
  }, [products, cabinetId]);

  // Загружаем статус закрепления цен только для закрепленных товаров
  useEffect(() => {
    if (!products || products.length === 0) return;
    
    const loadPriceLockStatus = async () => {
      try {
        setLoadingPriceLock(true);
        
        // Собираем все nmId
        const nmIds = products.map(p => p.nmID).join(',');
        
        // Загружаем статусы одним запросом
        const response = await fetch(`/api/products/price-locks?nmIds=${nmIds}`);
        if (response.ok) {
          const data = await response.json();
          const lockStatusMap = new Map();
          
          // Преобразуем объект в Map, добавляем только закрепленные товары
          Object.entries(data.data).forEach(([nmId, status]: [string, any]) => {
            if (status.locked) {
              lockStatusMap.set(parseInt(nmId), {
                locked: status.locked,
                price: status.price
              });
            }
          });
          
          setPriceLockStatus(lockStatusMap);
        }
      } catch (error) {
        clientLogger.error('Ошибка загрузки статуса закрепления цен:', error);
      } finally {
        setLoadingPriceLock(false);
      }
    };
    
    loadPriceLockStatus();
  }, [products]);

  const handleSaveCostPrice = async () => {
    if (!editingCostPrice) return;
    
    try {
      setSavingCostPrice(true);
      
      // Сохраняем себестоимость в БД
      const response = await fetch('/api/products/update-cost-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nmID: editingCostPrice.nmID,
          costPrice: editingCostPrice.value
        })
      });
      
      if (!response.ok) {
        throw new Error('Ошибка сохранения себестоимости');
      }
      
      // Обновляем локальное состояние товара СРАЗУ
      if (products) {
        const updatedProduct = products.find(p => p.nmID === editingCostPrice.nmID);
        if (updatedProduct) {
          updatedProduct.costPrice = editingCostPrice.value;
        }
      }
      
      setEditingCostPrice(null);
      clientLogger.log('✅ Себестоимость сохранена и обновлена в интерфейсе');
      
      // НЕ обновляем данные с сервера, чтобы не перезагружать страницу
      // refresh(false);
      
    } catch (error) {
      clientLogger.error('❌ Ошибка сохранения себестоимости:', error);
      alert('Ошибка при сохранении себестоимости');
    } finally {
      setSavingCostPrice(false);
    }
  };

  const handleSavePrice = async () => {
    if (!editingPrice) return;
    
    // Валидация: цена со скидкой не может быть больше оригинальной
    if (editingPrice.discountPrice > editingPrice.originalPrice) {
      setPriceNotification({
        type: 'error',
        message: `❌ Цена со скидкой (${editingPrice.discountPrice}₽) не может быть больше оригинальной (${editingPrice.originalPrice}₽)`
      });
      setTimeout(() => setPriceNotification(null), 5000);
      return;
    }
    
    try {
      setSavingPrice(true);
      
      const response = await fetch(`/api/products/${editingPrice.nmID}/update-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrice: editingPrice.originalPrice,
          discountPrice: editingPrice.discountPrice
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сохранения цены');
      }
      
      setEditingPrice(null);
      
      if (data.data?.wbSync?.success) {
        setPriceNotification({
          type: 'success',
          message: '✅ Цена успешно обновлена и синхронизирована с Wildberries!'
        });
      } else if (data.data?.wbSync?.error) {
        setPriceNotification({
          type: 'error',
          message: `⚠️ Цена обновлена в БД, но не удалось синхронизировать с WB: ${data.data.wbSync.error}`
        });
      } else {
        setPriceNotification({
          type: 'success',
          message: '✅ Цена успешно обновлена!'
        });
      }
      
      // Обновляем локальное состояние товара (мутация для мгновенного отображения)
      if (products) {
        const updatedProduct = products.find(p => p.nmID === editingPrice.nmID);
        if (updatedProduct) {
          updatedProduct.price = editingPrice.originalPrice;
          updatedProduct.discountPrice = editingPrice.discountPrice;
        }
      }
      
      setTimeout(() => setPriceNotification(null), 5000);
      
      // Перезагружаем данные с сервера для синхронизации (принудительно, без кеша)
      setTimeout(() => refresh(true), 100);
      
    } catch (error) {
      clientLogger.error('❌ Ошибка сохранения цены:', error);
      setPriceNotification({
        type: 'error',
        message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
      setTimeout(() => setPriceNotification(null), 5000);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSavePriceInline = async () => {
    if (!editingPriceInline) return;
    
    // Валидация: цена со скидкой не может быть больше оригинальной
    if (editingPriceInline.discountPrice > editingPriceInline.originalPrice) {
      setPriceNotification({
        type: 'error',
        message: `❌ Цена со скидкой (${editingPriceInline.discountPrice}₽) не может быть больше оригинальной (${editingPriceInline.originalPrice}₽)`
      });
      setTimeout(() => setPriceNotification(null), 5000);
      return;
    }
    
    try {
      setSavingPriceInline(true);
      
      const response = await fetch(`/api/products/${editingPriceInline.nmID}/update-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrice: editingPriceInline.originalPrice,
          discountPrice: editingPriceInline.discountPrice
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сохранения цены');
      }
      
      setEditingPriceInline(null);
      
      if (data.data?.wbSync?.success) {
        setPriceNotification({
          type: 'success',
          message: '✅ Цена успешно обновлена и синхронизирована с Wildberries!'
        });
      } else if (data.data?.wbSync?.error) {
        setPriceNotification({
          type: 'error',
          message: `⚠️ Цена обновлена в БД, но не удалось синхронизировать с WB: ${data.data.wbSync.error}`
        });
      } else {
        setPriceNotification({
          type: 'success',
          message: '✅ Цена успешно обновлена!'
        });
      }
      
      setTimeout(() => setPriceNotification(null), 5000);
      
      // Обновляем локальное состояние товара (мутация для мгновенного отображения)
      if (products) {
        const updatedProduct = products.find(p => p.nmID === editingPriceInline.nmID);
        if (updatedProduct) {
          updatedProduct.price = editingPriceInline.originalPrice;
          updatedProduct.discountPrice = editingPriceInline.discountPrice;
        }
      }
      
      // Перезагружаем данные с сервера для синхронизации (принудительно, без кеша)
      setTimeout(() => refresh(true), 100);
      
    } catch (error) {
      clientLogger.error('❌ Ошибка сохранения цены:', error);
      setPriceNotification({
        type: 'error',
        message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
      setTimeout(() => setPriceNotification(null), 5000);
    } finally {
      setSavingPriceInline(false);
    }
  };

  const handleSaveStockInline = async () => {
    if (!editingStockInline) return;
    
    try {
      setSavingStock(true);
      
      // Получаем товар и его склады
      const product = products?.find(p => p.nmID === editingStockInline.nmID);
      if (!product) {
        throw new Error('Товар не найден');
      }
      
      // Получаем данные о складах для товара
      const stockData = warehouseStocks.get(editingStockInline.nmID);
      if (!stockData || !stockData.warehouses) {
        throw new Error('Данные о складах не загружены. Обновите страницу.');
      }
      
      // Ищем FBS склады
      const fbsWarehouses = stockData.warehouses.filter((w: any) => w.warehouseType === 'FBS');
      
      if (!fbsWarehouses || fbsWarehouses.length === 0) {
        throw new Error('FBS склад не найден для этого товара');
      }
      
      const warehouse = fbsWarehouses[0];
      
      const updateStockUrl = cabinetId ? `/api/wb/stocks-enhanced?cabinetId=${cabinetId}` : '/api/wb/stocks-enhanced';
      const response = await fetch(updateStockUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: warehouse.warehouseId,
          sku: product.vendorCode,
          amount: editingStockInline.value
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка обновления остатков');
      }
      
      setEditingStockInline(null);
      
      // Перезагружаем остатки с enhanced API
      const stocksUrl = cabinetId ? `/api/wb/stocks-enhanced?cabinetId=${cabinetId}` : '/api/wb/stocks-enhanced';
      const stocksResponse = await fetch(stocksUrl);
      if (stocksResponse.ok) {
        const data = await stocksResponse.json();
        const stocksMap = new Map();
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((stock: any) => {
            stocksMap.set(stock.nmId, stock);
          });
        }
        setWarehouseStocks(stocksMap);
      }
      
    } catch (error) {
      clientLogger.error('❌ Ошибка сохранения остатков:', error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setSavingStock(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (!editingDiscount) return;
    
    try {
      setSavingDiscount(true);
      
      const response = await fetch(`/api/products/${editingDiscount.nmID}/update-discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount: editingDiscount.discount,
          originalPrice: editingDiscount.originalPrice
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сохранения скидки');
      }
      
      setEditingDiscount(null);
      
      if (data.data?.wbSync?.success) {
        setPriceNotification({
          type: 'success',
          message: '✅ Скидка успешно обновлена и синхронизирована с Wildberries!'
        });
      } else if (data.data?.wbSync?.error) {
        setPriceNotification({
          type: 'error',
          message: `⚠️ Скидка обновлена в БД, но не удалось синхронизировать с WB: ${data.data.wbSync.error}`
        });
      } else {
        setPriceNotification({
          type: 'success',
          message: '✅ Скидка успешно обновлена!'
        });
      }
      
      setTimeout(() => setPriceNotification(null), 5000);
      refresh(false);
      
    } catch (error) {
      clientLogger.error('❌ Ошибка сохранения скидки:', error);
      setPriceNotification({
        type: 'error',
        message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
      setTimeout(() => setPriceNotification(null), 5000);
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleTogglePriceLock = async (nmID: number) => {
    try {
      const currentStatus = priceLockStatus.get(nmID);
      const isCurrentlyLocked = currentStatus?.locked || false;
      
      if (isCurrentlyLocked) {
        // Отключаем закрепление
        const response = await fetch('/api/products/price-locks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nmId: nmID,
            locked: false
          })
        });
        
        if (response.ok) {
          setPriceLockStatus(prev => new Map(prev.set(nmID, { locked: false, price: 0 })));
          setPriceNotification({
            type: 'success',
            message: '🔓 Закрепление цены отключено'
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка отключения закрепления');
        }
      } else {
        // Включаем закрепление на текущей цене
        const product = products?.find(p => p.nmID === nmID);
        if (!product) {
          throw new Error('Товар не найден');
        }
        
        const lockPrice = product.discountPrice || product.price;
        
        const response = await fetch('/api/products/price-locks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nmId: nmID,
            locked: true,
            price: lockPrice
          })
        });
        
        if (response.ok) {
          setPriceLockStatus(prev => new Map(prev.set(nmID, { locked: true, price: lockPrice })));
          setPriceNotification({
            type: 'success',
            message: `🔒 Цена закреплена на ${lockPrice.toLocaleString('ru-RU')}₽`
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка закрепления цены');
        }
      }
      
      setTimeout(() => setPriceNotification(null), 5000);
    } catch (error) {
      clientLogger.error('❌ Ошибка управления закреплением цены:', error);
      setPriceNotification({
        type: 'error',
        message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
      setTimeout(() => setPriceNotification(null), 5000);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!products) return;
    
    try {
      clientLogger.log(`📥 Экспорт в формате ${format}...`);
      
      if (format === 'json') {
        // Экспорт в JSON
        const dataStr = JSON.stringify(products, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wb-products-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Экспорт в CSV
        const headers = [
          'nmID', 'Артикул', 'Название', 'Бренд', 'Категория',
          'Цена', 'Цена со скидкой', 'Скидка %',
          'Остаток', 'Зарезервировано', 'В пути', 'Возврат',
          'Заказы', 'Выручка', 'Средний чек',
          'Просмотры', 'В корзину', 'Конверсия корзина-заказ', 'CTR %'
        ];
        
        const rows = products.map(p => [
          p.nmID,
          p.vendorCode,
          `"${p.title.replace(/"/g, '""')}"`,
          p.brand,
          p.category,
          p.price,
          p.discountPrice,
          p.discount,
          p.stock,
          p.reserved,
          p.inTransit,
          p.inReturn,
          p.analytics.sales.orders,
          p.analytics.sales.revenue,
          p.analytics.sales.avgOrderValue,
          p.analytics.conversion.views,
          p.analytics.conversion.addToCart,
          p.analytics.conversion.cartToOrder,
          p.analytics.conversion.ctr
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wb-products-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      clientLogger.log('✅ Экспорт завершен');
      
    } catch (err) {
      clientLogger.error('❌ Ошибка экспорта:', err);
      alert('Ошибка при экспорте данных');
    }
  };

  // Получаем уникальные категории
  const categories = ['all', ...Array.from(new Set((products || []).map(p => p.category).filter(Boolean)))];
  
  const filteredProducts = (products || [])
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nmID.toString().includes(searchTerm);
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price-high':
          return (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0);
        case 'price-low':
          return (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0);
        case 'name-asc':
          return a.title.localeCompare(b.title, 'ru');
        case 'name-desc':
          return b.title.localeCompare(a.title, 'ru');
        default:
          return 0;
      }
    });
  
  // Отладка: логируем состояние товаров
  useEffect(() => {
    clientLogger.log('📊 [ProductsWithAnalytics] Состояние:', {
      loading,
      hasProducts: !!products,
      productsCount: products?.length || 0,
      filteredCount: filteredProducts.length,
      error
    });
  }, [loading, products, filteredProducts.length, error]);

  const toggleExpand = (nmID: number) => {
    setExpandedProduct(prev => prev === nmID ? null : nmID);
  };

  if (loading && !products) {
    return <ProductsLoadingSkeleton />;
  }

  if (error) {
    // Проверяем, есть ли информация о кабинете
    const isNoCabinet = error.includes('кабинет') || error.includes('API токен');
    
    return (
      <div className="glass-container p-8 text-center fade-in">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Ошибка загрузки товаров</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        
        {isNoCabinet ? (
          <button 
            className="glass-button-primary"
            onClick={() => router.push('/?tab=account')}
          >
            <User className="w-4 h-4" />
            Перейти в настройки кабинета
          </button>
        ) : (
          <button 
            className="glass-button-primary"
            onClick={() => refresh(true)}
          >
            <RefreshCw className="w-4 h-4" />
            Повторить попытку
          </button>
        )}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="glass-container p-8 text-center fade-in">
        <Package className="w-12 h-12 mx-auto text-gray-400 mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-white mb-2">Товары не найдены</h3>
        <p className="text-gray-400 mb-4">У вас пока нет товаров на Wildberries</p>
        
        <button 
          className="glass-button-primary inline-flex items-center gap-2"
          onClick={() => refresh(true)}
          disabled={backgroundLoading}
        >
          <RefreshCw className={`w-5 h-5 ${backgroundLoading ? 'animate-spin' : ''}`} />
          {backgroundLoading ? 'Загрузка товаров...' : 'Загрузить товары'}
        </button>
        
        {backgroundLoading && (
          <p className="text-sm text-gray-400 mt-4">
            Получаем данные с Wildberries, это может занять несколько минут...
          </p>
        )}
      </div>
    );
  }

  const totalStats = {
    totalProducts: products?.length || 0,
    totalFBWStock: Array.from(warehouseStocks.values()).reduce((sum, stock) => {
      return sum + (stock.fbwStock || 0);
    }, 0),
    totalFBSStock: Array.from(warehouseStocks.values()).reduce((sum, stock) => {
      return sum + (stock.fbsStock || 0);
    }, 0),
    totalTodayOrders: Array.from(todayOrders.values()).reduce((sum, order) => sum + order.count, 0),
    totalStock: products?.reduce((sum, p) => sum + p.stock, 0) || 0,
  };
  
  // Отладка статистики (только если есть проблемы)
  if (totalStats.totalFBWStock === 0 && totalStats.totalFBSStock === 0 && warehouseStocks.size > 0) {
    clientLogger.warn('⚠️ [Stats] Остатки не рассчитываются!', {
      warehouseStocksSize: warehouseStocks.size,
      firstStock: Array.from(warehouseStocks.values())[0]
    });
  }
  
  if (totalStats.totalTodayOrders === 0 && todayOrders.size > 0) {
    clientLogger.warn('⚠️ [Stats] Заказы не рассчитываются!', {
      todayOrdersSize: todayOrders.size,
      firstOrder: Array.from(todayOrders.values())[0]
    });
  }

  return (
    <div className="fade-in space-y-4 md:space-y-6 px-4 sm:px-6">
      {/* Кнопка возврата к отслеживанию */}
      {returnTaskId && (
        <div className="liquid-glass rounded-xl p-4">
          <button
            onClick={() => {
              sessionStorage.removeItem('returnToTask');
              setReturnTaskId(null);
              router.push(`/?tab=in-progress`);
            }}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Вернуться к отслеживанию создания товара</span>
          </button>
        </div>
      )}

      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Товары с аналитикой</h2>
          <p className="text-gray-600 text-sm md:text-base">
            Общая сводка по вашим товарам на Wildberries
            {isFromCache && lastUpdate && (
              <span className="ml-2 text-gray-500 text-sm">
                (обновлено {new Date(lastUpdate).toLocaleTimeString('ru-RU')})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {backgroundLoading && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Обновление...</span>
            </div>
          )}
          <button
            onClick={async () => {
              if (!cabinetId || syncingStocks) return;
              
              setSyncingStocks(true);
              try {
                clientLogger.log('🔄 [Sync Stocks] Запуск синхронизации остатков...');
                const response = await fetch('/api/sync/stocks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ cabinetId: cabinetId })
                });
                
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                clientLogger.log('📦 [Sync Stocks] Ответ от сервера:', data);
                
                if (data.success) {
                  clientLogger.log('✅ [Sync Stocks] Остатки синхронизированы:', data.stats);
                  alert(`✅ Остатки синхронизированы!\n\nОбновлено: ${data.stats.updated} товаров\nНе найдено в БД: ${data.stats.notFound} товаров`);
                  // Перезагружаем страницу для обновления данных
                  window.location.reload();
                } else {
                  clientLogger.error('❌ [Sync Stocks] Ошибка синхронизации:', data.error);
                  alert(`❌ Ошибка синхронизации остатков:\n${data.error || 'Неизвестная ошибка'}`);
                }
              } catch (error) {
                clientLogger.error('❌ [Sync Stocks] Критическая ошибка:', error);
                alert(`❌ Ошибка синхронизации остатков:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
              } finally {
                setSyncingStocks(false);
              }
            }}
            disabled={syncingStocks || !cabinetId}
            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncingStocks ? 'animate-spin' : ''}`} />
            {syncingStocks ? 'Синхронизация...' : 'Синхронизировать остатки'}
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="liquid-glass rounded-xl p-3 md:p-4 border border-gray-300 shadow-lg">
          <div className="text-xs md:text-sm text-gray-800 mb-1 font-semibold">Товаров</div>
          <div className="text-xl md:text-3xl font-bold text-gray-900" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{totalStats.totalProducts}</div>
        </div>
        
        <div className="liquid-glass rounded-xl p-3 md:p-4 border border-purple-300 shadow-lg">
          <div className="text-xs md:text-sm text-gray-800 mb-1 font-semibold">FBW</div>
          <div className="text-xl md:text-3xl font-bold text-purple-700" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            {loadingWarehouseStocks ? (
              <div className="h-9 bg-purple-200 rounded w-20 animate-pulse"></div>
            ) : (
              <>{totalStats.totalFBWStock} шт.</>
            )}
          </div>
        </div>
        
        <div className="liquid-glass rounded-xl p-3 md:p-4 border border-green-300 shadow-lg">
          <div className="text-xs md:text-sm text-gray-800 mb-1 font-semibold">FBS</div>
          <div className="text-xl md:text-3xl font-bold text-green-700" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            {loadingWarehouseStocks ? (
              <div className="h-9 bg-green-200 rounded w-20 animate-pulse"></div>
            ) : (
              <>{totalStats.totalFBSStock} шт.</>
            )}
          </div>
        </div>
        
        <div className="liquid-glass rounded-xl p-3 md:p-4 border border-blue-300 shadow-lg">
          <div className="text-xs md:text-sm text-gray-800 mb-1 font-semibold">Сегодня</div>
          <div className="text-xl md:text-3xl font-bold text-blue-700" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            {loadingTodayOrders ? (
              <div className="h-9 bg-blue-200 rounded w-16 animate-pulse"></div>
            ) : (
              <>{totalStats.totalTodayOrders}</>
            )}
          </div>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="liquid-glass rounded-xl p-3 md:p-4 border border-gray-300 shadow-lg relative" style={{ zIndex: 1000 }}>
        <div className="flex flex-col md:flex-row gap-2 md:gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск по названию, артикулу, баркоду"
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Кастомный селектор категорий */}
          <div className="relative flex-1 md:flex-initial">
            <button
              ref={categoryButtonRef}
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="w-full md:w-auto px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center gap-2 md:min-w-[200px] shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              <Filter className="w-4 h-4" />
              <span className="flex-1 text-left truncate">
                {categoryFilter === 'all' ? 'Категории' : categoryFilter}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Сортировка */}
          <div className="relative flex-1 md:flex-initial">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full md:w-auto px-3 md:px-4 py-2 md:py-2.5 bg-white border-2 border-gray-300 rounded-lg font-medium transition-all duration-300 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 hover:border-purple-400 cursor-pointer text-sm md:text-base appearance-none pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="name-asc">По алфавиту: А → Я</option>
              <option value="name-desc">По алфавиту: Я → А</option>
              <option value="newest">Новые товары</option>
              <option value="oldest">Старые товары</option>
              <option value="price-high">Цена: высокая → низкая</option>
              <option value="price-low">Цена: низкая → высокая</option>
            </select>
          </div>

        {/* Category Dropdown Portal */}
        {categoryDropdownOpen && typeof window !== 'undefined' && (
          createPortal(
            <>
              {/* Overlay для закрытия при клике вне */}
                <div 
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setCategoryDropdownOpen(false)}
                />
                
                {/* Выпадающее меню */}
                <div 
                  className="fixed bg-white rounded-lg shadow-2xl border-2 border-purple-500/20 overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200"
                  style={{
                    top: categoryButtonRef.current ? `${categoryButtonRef.current.getBoundingClientRect().bottom + 8}px` : '0px',
                    left: categoryButtonRef.current ? `${categoryButtonRef.current.getBoundingClientRect().left}px` : '0px',
                    minWidth: categoryButtonRef.current ? `${categoryButtonRef.current.offsetWidth}px` : '250px',
                    maxWidth: '400px'
                  }}
                >
                  {/* Поле поиска */}
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Поиск категории..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {/* Опция "Все категории" */}
                    {(!categorySearchTerm || 'все категории'.includes(categorySearchTerm.toLowerCase())) && (
                      <button
                        onClick={() => {
                          setCategoryFilter('all');
                          setCategoryDropdownOpen(false);
                          setCategorySearchTerm('');
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center justify-between group ${
                          categoryFilter === 'all' ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${categoryFilter === 'all' ? 'bg-purple-600' : 'bg-gray-300'}`} />
                          Все категории
                        </span>
                        {categoryFilter === 'all' && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                    )}
                    
                    {/* Разделитель */}
                    {(!categorySearchTerm || 'все категории'.includes(categorySearchTerm.toLowerCase())) && (
                      <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent my-1" />
                    )}
                    
                    {/* Остальные категории с фильтрацией */}
                    {categories
                      .filter(c => c !== 'all')
                      .filter(c => !categorySearchTerm || c.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                      .map((cat, index) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategoryFilter(cat);
                          setCategoryDropdownOpen(false);
                          setCategorySearchTerm('');
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center justify-between group ${
                          categoryFilter === cat ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700'
                        }`}
                        style={{
                          animationDelay: `${index * 20}ms`
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full transition-colors ${
                            categoryFilter === cat ? 'bg-purple-600' : 'bg-gray-300 group-hover:bg-purple-400'
                          }`} />
                          {cat}
                        </span>
                        {categoryFilter === cat && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                    ))}
                    
                    {/* Сообщение "Ничего не найдено" */}
                    {categorySearchTerm && 
                     categories.filter(c => c !== 'all').filter(c => c.toLowerCase().includes(categorySearchTerm.toLowerCase())).length === 0 &&
                     !'все категории'.includes(categorySearchTerm.toLowerCase()) && (
                      <div className="px-4 py-8 text-center">
                        <div className="text-gray-400 mb-2">
                          <Search className="w-8 h-8 mx-auto opacity-50" />
                        </div>
                        <p className="text-sm text-gray-500">Категория не найдена</p>
                        <p className="text-xs text-gray-400 mt-1">Попробуйте другой запрос</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Футер с количеством категорий */}
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-purple-200/50">
                    <p className="text-xs text-gray-600 text-center font-medium">
                      {categories.length - 1} {categories.length - 1 === 1 ? 'категория' : 'категорий'}
                    </p>
                  </div>
                </div>
            </>,
            document.body
          )
        )}
        
        <div className="flex gap-2 md:gap-3">
            <button 
              className="flex-1 md:flex-initial px-3 md:px-4 py-2 md:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
              onClick={() => refresh(true)}
              disabled={backgroundLoading}
            >
              <RefreshCw className={`w-4 h-4 ${backgroundLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Обновить</span>
            </button>
            
            <button 
              className="flex-1 md:flex-initial px-3 md:px-4 py-2 md:py-2.5 bg-white/90 hover:bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
              onClick={() => handleExport('json')}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            
            <button 
              className="flex-1 md:flex-initial px-3 md:px-4 py-2 md:py-2.5 bg-white/90 hover:bg-white border-2 border-gray-300 text-gray-900 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
              onClick={() => handleExport('csv')}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
        </div>
        </div>
      </div>

      {/* Список товаров */}
      <div className="space-y-2 md:space-y-3">
        {filteredProducts.map((product, index) => (
          <div key={`${product.nmID}-${product.vendorCode}-${index}`} className="liquid-glass rounded-2xl md:rounded-xl overflow-hidden border border-gray-300 shadow-lg">
            {/* Компактная карточка товара */}
            <div 
              className="p-3 md:p-4 transition-colors cursor-pointer md:cursor-default"
              onClick={(e) => {
                // На мобильных - раскрываем карточку при клике
                // На десктопе - только через кнопку
                if (window.innerWidth < 768) {
                  // Проверяем, что клик не по интерактивным элементам
                  const target = e.target as HTMLElement;
                  if (!target.closest('button') && !target.closest('input')) {
                    toggleExpand(product.nmID);
                  }
                }
              }}
            >
              <div className="flex items-start md:items-center gap-2 md:gap-4">
                {/* Изображение */}
                <img 
                  src={product.images && product.images.length > 0 
                    ? product.images[0] 
                    : '/placeholder.png'}
                  alt={product.title}
                  className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg flex-shrink-0 bg-gray-700"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.png';
                  }}
                />
                
                {/* Название и артикул */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 line-clamp-2 md:truncate" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    {product.title}
                  </h3>
                  <div className="text-xs md:text-sm text-gray-700 font-medium truncate">
                    {product.vendorCode}
                  </div>
                </div>
                
                {/* Цены */}
                <div className="text-right flex-shrink-0">
                  {editingPriceInline?.nmID === product.nmID ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={priceInputRef}
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editingPriceInline.discountPrice === 0 ? '' : editingPriceInline.discountPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Если пустое поле - оставляем пустым
                          if (value === '' || value === '-') {
                            setEditingPriceInline({
                              nmID: product.nmID,
                              originalPrice: product.price,
                              discountPrice: 0
                            });
                            return;
                          }
                          // Парсим число
                          const numValue = parseFloat(value);
                          // Проверяем что число валидное и не отрицательное
                          if (!isNaN(numValue) && numValue >= 0) {
                            setEditingPriceInline({
                              nmID: product.nmID,
                              originalPrice: product.price,
                              discountPrice: numValue
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          // Запрещаем ввод минуса
                          if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                            e.preventDefault();
                            return;
                          }
                          if (e.key === 'Enter') {
                            handleSavePriceInline();
                          } else if (e.key === 'Escape') {
                            setEditingPriceInline(null);
                          }
                        }}
                        className="w-24 px-2 py-1 text-sm bg-white border-2 border-blue-500 rounded text-gray-900 font-bold"
                        min="0"
                        step="1"
                        placeholder="Цена"
                      />
                      <button
                        onClick={handleSavePriceInline}
                        disabled={savingPriceInline || editingPriceInline.discountPrice <= 0}
                        className="p-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded transition-colors"
                        title="Сохранить"
                      >
                        {savingPriceInline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingPriceInline(null)}
                        className="p-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                        title="Отмена"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 justify-end">
                      <div className="text-base md:text-xl font-bold text-gray-900" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {(product.discountPrice || 0).toLocaleString('ru-RU')} ₽
                      </div>
                      <button
                        onClick={() => setEditingPriceInline({
                          nmID: product.nmID,
                          originalPrice: product.price,
                          discountPrice: product.discountPrice
                        })}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Редактировать цену"
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Статистика в строку - скрываем на мобильных, показываем ниже */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  {/* Остатки FBW */}
                  <div className="text-center">
                    <div className="text-gray-700 text-xs mb-1 font-semibold">FBW</div>
                    {loadingWarehouseStocks ? (
                      <div className="h-5 bg-purple-200 rounded w-8 mx-auto animate-pulse"></div>
                    ) : (
                      <div className="font-bold text-purple-700 text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {warehouseStocks.get(product.nmID)?.fbwStock || 0}
                      </div>
                    )}
                  </div>
                  
                  {/* Остатки FBS - с редактированием */}
                  <div className="text-center">
                    <div className="text-gray-700 text-xs mb-1 font-semibold">FBS</div>
                    {editingStockInline?.nmID === product.nmID && editingStockInline.type === 'FBS' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingStockInline.value}
                          onChange={(e) => setEditingStockInline({
                            ...editingStockInline,
                            value: parseInt(e.target.value) || 0
                          })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveStockInline();
                            } else if (e.key === 'Escape') {
                              setEditingStockInline(null);
                            }
                          }}
                          className="w-16 px-1 py-0.5 text-sm bg-white border-2 border-green-500 rounded text-gray-900 font-bold text-center"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveStockInline}
                          disabled={savingStock}
                          className="p-0.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded transition-colors"
                          title="Сохранить"
                        >
                          {savingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setEditingStockInline(null)}
                          className="p-0.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                          title="Отмена"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : loadingWarehouseStocks ? (
                      <div className="h-5 bg-green-200 rounded w-8 mx-auto animate-pulse"></div>
                    ) : (
                      <div 
                        className="flex items-center gap-1 justify-center cursor-pointer hover:bg-green-50 rounded px-1 transition-colors group"
                        onClick={() => {
                          const fbsStock = warehouseStocks.get(product.nmID)?.fbsStock || 0;
                          setEditingStockInline({
                            nmID: product.nmID,
                            type: 'FBS',
                            value: fbsStock
                          });
                        }}
                        title="Нажмите для редактирования"
                      >
                        <div className="font-bold text-green-700 text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                          {warehouseStocks.get(product.nmID)?.fbsStock || 0}
                        </div>
                        <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-green-600 transition-colors" />
                      </div>
                    )}
                  </div>
                  
                  {/* Заказы за сегодня */}
                  <div className="text-center">
                    <div className="text-gray-700 text-xs mb-1 font-semibold">Сегодня</div>
                    {loadingTodayOrders ? (
                      <div className="h-5 bg-blue-200 rounded w-8 mx-auto animate-pulse"></div>
                    ) : (
                      <div className="font-bold text-blue-700 text-base" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {todayOrders.get(product.nmID)?.count || 0}
                      </div>
                    )}
                    {todayOrders.get(product.nmID) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {todayOrders.get(product.nmID)?.totalQuantity || 0} шт
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Кнопка развернуть - только на десктопе */}
                <button
                  type="button"
                  onClick={() => toggleExpand(product.nmID)}
                  className="hidden md:block p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                >
                  {expandedProduct === product.nmID ? (
                    <ChevronUp className="w-5 h-5 text-gray-700" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-700" />
                  )}
                </button>
              </div>
              
              {/* Мобильная статистика - показываем под основной информацией */}
              <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-around text-center">
                {/* FBW */}
                <div>
                  <div className="text-xs text-gray-600 mb-1">FBW</div>
                  {loadingWarehouseStocks ? (
                    <div className="h-5 bg-purple-200 rounded w-12 mx-auto animate-pulse"></div>
                  ) : (
                    <div className="text-sm font-bold text-purple-700">
                      {warehouseStocks.get(product.nmID)?.fbwStock || 0}
                    </div>
                  )}
                </div>
                
                {/* FBS - редактируемый */}
                <div>
                  <div className="text-xs text-gray-600 mb-1">FBS</div>
                  {editingStockInline?.nmID === product.nmID && editingStockInline.type === 'FBS' ? (
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        value={editingStockInline.value}
                        onChange={(e) => setEditingStockInline({
                          ...editingStockInline,
                          value: parseInt(e.target.value) || 0
                        })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveStockInline();
                          } else if (e.key === 'Escape') {
                            setEditingStockInline(null);
                          }
                        }}
                        className="w-16 px-1 py-0.5 text-sm bg-white border-2 border-green-500 rounded text-gray-900 font-bold text-center"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveStockInline}
                        disabled={savingStock}
                        className="p-0.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded transition-colors"
                      >
                        {savingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => setEditingStockInline(null)}
                        className="p-0.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : loadingWarehouseStocks ? (
                    <div className="h-5 bg-green-200 rounded w-12 mx-auto animate-pulse"></div>
                  ) : (
                    <div 
                      className="flex items-center gap-1 justify-center cursor-pointer active:bg-green-50 rounded px-2 py-1 transition-colors"
                      onClick={() => {
                        const fbsStock = warehouseStocks.get(product.nmID)?.fbsStock || 0;
                        setEditingStockInline({
                          nmID: product.nmID,
                          type: 'FBS',
                          value: fbsStock
                        });
                      }}
                    >
                      <div className="text-sm font-bold text-green-700">
                        {warehouseStocks.get(product.nmID)?.fbsStock || 0}
                      </div>
                      <Edit2 className="w-3 h-3 text-green-600" />
                    </div>
                  )}
                </div>
                
                {/* Сегодня */}
                <div>
                  <div className="text-xs text-gray-600 mb-1">Сегодня</div>
                  {loadingTodayOrders ? (
                    <div className="h-5 bg-blue-200 rounded w-12 mx-auto animate-pulse"></div>
                  ) : (
                    <div className="text-sm font-bold text-blue-700">
                      {todayOrders.get(product.nmID)?.count || 0}
                    </div>
                  )}
                </div>
                </div>
                
                {/* Индикатор раскрытия для мобильных */}
                <div className="flex justify-center mt-2">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {expandedProduct === product.nmID ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Скрыть детали</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Показать детали</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Детальная аналитика (раскрывающаяся) */}
            {expandedProduct === product.nmID && (
              <div className="border-t border-gray-200 p-3 md:p-5 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Продажи и финансы */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">
                      Цены и скидки
                    </h4>
                    <div className="space-y-1.5">
                      {editingPrice?.nmID === product.nmID ? (
                        <div className="space-y-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Базовая цена (₽)</label>
                            <input
                              type="number"
                              value={editingPrice.originalPrice}
                              onChange={(e) => setEditingPrice({
                                ...editingPrice,
                                originalPrice: parseFloat(e.target.value) || 0
                              })}
                              className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded text-gray-900"
                              min="0"
                              step="1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Цена со скидкой (₽)</label>
                            <input
                              type="number"
                              value={editingPrice.discountPrice}
                              onChange={(e) => setEditingPrice({
                                ...editingPrice,
                                discountPrice: parseFloat(e.target.value) || 0
                              })}
                              className="w-full px-2 py-1 text-sm bg-white border border-blue-300 rounded text-gray-900"
                              min="0"
                              step="1"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={handleSavePrice}
                              disabled={savingPrice || editingPrice.originalPrice <= 0 || editingPrice.discountPrice <= 0 || editingPrice.discountPrice >= editingPrice.originalPrice}
                              className="flex-1 px-2 py-1 text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded font-medium transition-colors"
                            >
                              {savingPrice ? '⏳ Сохранение...' : '✓ Сохранить'}
                            </button>
                            <button
                              onClick={() => setEditingPrice(null)}
                              className="flex-1 px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium transition-colors"
                            >
                              ✕ Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-600">Базовая цена:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 font-semibold">
                                {(product.price || 0).toLocaleString('ru-RU')} ₽
                              </span>
                              <button
                                onClick={() => setEditingPrice({
                                  nmID: product.nmID,
                                  originalPrice: product.price,
                                  discountPrice: product.discountPrice
                                })}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Редактировать цену"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-600">Цена со скидкой:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 font-semibold">
                                {(product.discountPrice || 0).toLocaleString('ru-RU')} ₽
                              </span>
                              {product.discount > 0 && (
                                <>
                                  <span className="text-red-600 font-semibold text-xs">
                                    (-{product.discount}%)
                                  </span>
                                  <button
                                    onClick={() => setEditingDiscount({
                                      nmID: product.nmID,
                                      discount: product.discount,
                                      originalPrice: product.price
                                    })}
                                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="Редактировать скидку"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Закрепление цены */}
                          <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-start gap-2">
                              <div className="flex items-center gap-1.5 flex-1">
                                <span className="text-gray-600 text-sm font-semibold">Закрепление цены</span>
                                <div className="group relative">
                                  <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help transition-colors" />
                                  <div className="absolute left-0 top-6 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div className="font-semibold mb-1.5 text-blue-300">🔒 Что такое закрепление цены?</div>
                                    <p className="mb-2 leading-relaxed">
                                      Защита от автоматического снижения цены товара Wildberries для участия в акциях.
                                    </p>
                                    <div className="font-semibold mb-1 text-green-300">✅ Как это работает:</div>
                                    <ul className="space-y-1 mb-2 leading-relaxed">
                                      <li>• Система проверяет цену каждые 30 минут</li>
                                      <li>• Если WB снизил цену - автоматически восстанавливает</li>
                                      <li>• Вы контролируете минимальную цену товара</li>
                                    </ul>
                                    <div className="text-yellow-300 text-xs mt-2 pt-2 border-t border-gray-700">
                                      💡 Рекомендуется для товаров с высокой маржой
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {loadingPriceLock ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                ) : (
                                  <button
                                    onClick={() => handleTogglePriceLock(product.nmID)}
                                    className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 text-xs shadow-sm ${
                                      priceLockStatus.get(product.nmID)?.locked
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                    }`}
                                  >
                                    {priceLockStatus.get(product.nmID)?.locked ? (
                                      <>
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Закреплено на {priceLockStatus.get(product.nmID)?.price?.toLocaleString('ru-RU')}₽</span>
                                      </>
                                    ) : (
                                      <>
                                        <Unlock className="w-3.5 h-3.5" />
                                        <span>Закрепить цену</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            {priceLockStatus.get(product.nmID)?.locked && (
                              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                  Система автоматически восстановит цену, если WB попытается её снизить
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {editingDiscount?.nmID === product.nmID && (
                        <div className="space-y-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Процент скидки (%)</label>
                            <input
                              type="number"
                              value={editingDiscount.discount}
                              onChange={(e) => setEditingDiscount({
                                ...editingDiscount,
                                discount: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                              })}
                              className="w-full px-2 py-1 text-sm bg-white border border-orange-300 rounded text-gray-900"
                              min="0"
                              max="100"
                              step="1"
                            />
                          </div>
                          <div className="text-xs text-gray-600">
                            Цена со скидкой: {Math.round(editingDiscount.originalPrice * (1 - editingDiscount.discount / 100))} ₽
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={handleSaveDiscount}
                              disabled={savingDiscount || editingDiscount.discount < 0 || editingDiscount.discount > 100}
                              className="flex-1 px-2 py-1 text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded font-medium transition-colors"
                            >
                              {savingDiscount ? '⏳ Сохранение...' : '✓ Сохранить'}
                            </button>
                            <button
                              onClick={() => setEditingDiscount(null)}
                              className="flex-1 px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium transition-colors"
                            >
                              ✕ Отмена
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">Себестоимость:</span>
                        {editingCostPrice?.nmID === product.nmID ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingCostPrice.value === 0 ? '' : editingCostPrice.value}
                              onChange={(e) => setEditingCostPrice({
                                nmID: product.nmID,
                                value: e.target.value === '' ? 0 : parseFloat(e.target.value)
                              })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveCostPrice();
                                }
                              }}
                              placeholder="0"
                              className="w-20 px-2 py-1 text-sm bg-white border border-blue-500 rounded text-gray-900"
                              autoFocus
                              onFocus={(e) => e.target.select()}
                            />
                            <button
                              onClick={handleSaveCostPrice}
                              disabled={savingCostPrice}
                              className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                              title="Сохранить"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCostPrice(null)}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Отмена"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-orange-600 font-semibold">
                              {(product.costPrice || 0).toLocaleString('ru-RU')} ₽
                            </span>
                            <button
                              onClick={() => setEditingCostPrice({
                                nmID: product.nmID,
                                value: product.costPrice || 0
                              })}
                              className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Редактировать себестоимость"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Заказы за сегодня */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">📋</span>
                      </div>
                      Заказы сегодня
                    </h4>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
                      {loadingTodayOrders ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                          <span className="text-sm text-gray-600">Загрузка заказов...</span>
                        </div>
                      ) : todayOrders.get(product.nmID) ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-700">
                                {todayOrders.get(product.nmID)?.count || 0}
                              </div>
                              <div className="text-xs text-gray-600">заказов</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-purple-700">
                                {todayOrders.get(product.nmID)?.totalQuantity || 0}
                              </div>
                              <div className="text-xs text-gray-600">штук</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-700">
                                {((todayOrders.get(product.nmID)?.totalSum || 0) / 100).toLocaleString('ru-RU')} ₽
                              </div>
                              <div className="text-xs text-gray-600">сумма</div>
                            </div>
                          </div>
                          <div className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1 text-center">
                            📊 Данные обновлены в реальном времени
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <div className="text-lg mb-1">📦</div>
                          <div className="text-sm">Заказов сегодня пока нет</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Остатки по складам */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-purple-600" />
                      Остатки по складам
                      <span className="text-xs text-gray-500 font-normal ml-auto">Дважды кликните для редактирования FBS</span>
                    </h4>
                    {loadingWarehouseStocks ? (
                      <div className="space-y-2">
                        {/* Анимация загрузки */}
                        <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg border border-gray-200 animate-pulse">
                          <div className="text-center">
                            <div className="h-3 bg-gray-300 rounded w-12 mx-auto mb-2"></div>
                            <div className="h-6 bg-gray-300 rounded w-8 mx-auto"></div>
                          </div>
                          <div className="text-center">
                            <div className="h-3 bg-gray-300 rounded w-12 mx-auto mb-2"></div>
                            <div className="h-6 bg-gray-300 rounded w-8 mx-auto"></div>
                          </div>
                          <div className="text-center">
                            <div className="h-3 bg-gray-300 rounded w-12 mx-auto mb-2"></div>
                            <div className="h-6 bg-gray-300 rounded w-8 mx-auto"></div>
                          </div>
                          <div className="text-center">
                            <div className="h-3 bg-gray-300 rounded w-12 mx-auto mb-2"></div>
                            <div className="h-6 bg-gray-300 rounded w-8 mx-auto"></div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-gray-50 border-gray-200 animate-pulse">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="h-3 bg-gray-300 rounded w-3"></div>
                                <div className="h-3 bg-gray-300 rounded w-32"></div>
                                <div className="h-4 bg-gray-300 rounded w-10"></div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-3 bg-gray-300 rounded w-16"></div>
                                <div className="h-3 bg-gray-300 rounded w-16"></div>
                                <div className="h-3 bg-gray-300 rounded w-16"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Загрузка данных об остатках...</span>
                        </div>
                      </div>
                    ) : warehouseStocks.get(product.nmID) ? (
                      <div className="space-y-2">
                        {/* Остатки FBW (склад WB) */}
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Warehouse className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-semibold text-gray-900">FBW (Склад WB)</span>
                            </div>
                            <div className="text-lg font-bold text-purple-600">
                              {warehouseStocks.get(product.nmID)?.fbwStock || 0} шт
                            </div>
                          </div>
                        </div>

                        {/* Остатки FBS (склад пользователя) */}
                        <div className="space-y-1.5">
                          {warehouseStocks.get(product.nmID)?.warehouses
                            ?.filter((w: any) => w.warehouseType === 'FBS')
                            .map((warehouse: any, idx: number) => (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                warehouse.warehouseType === 'FBS' 
                                  ? 'bg-green-50/50 border-green-200 hover:bg-green-100/50 cursor-pointer' 
                                  : 'bg-purple-50/50 border-purple-200'
                              }`}
                              onDoubleClick={() => {
                                if (warehouse.warehouseType === 'FBS') {
                                  setEditingStock({
                                    nmID: product.nmID,
                                    warehouseId: warehouse.warehouseId,
                                    value: warehouse.stock
                                  });
                                }
                              }}
                              title={warehouse.warehouseType === 'FBS' ? 'Дважды кликните для редактирования' : 'Только для чтения (FBO)'}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Warehouse className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs text-gray-700 font-medium">{warehouse.warehouseName}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  warehouse.warehouseType === 'FBS' 
                                    ? 'bg-green-500/20 text-green-700' 
                                    : 'bg-purple-500/20 text-purple-700'
                                }`}>
                                  {warehouse.warehouseType}
                                </span>
                              </div>
                              
                              {editingStock?.nmID === product.nmID && editingStock?.warehouseId === warehouse.warehouseId ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editingStock.value}
                                    onChange={(e) => setEditingStock({
                                      ...editingStock,
                                      value: parseInt(e.target.value) || 0
                                    })}
                                    className="w-16 px-2 py-1 text-xs bg-white border border-blue-500 rounded text-gray-900 text-right"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!editingStock) return;
                                      
                                      try {
                                        setSavingStock(true);
                                        const updateUrl = cabinetId ? `/api/wb/stocks-enhanced?cabinetId=${cabinetId}` : '/api/wb/stocks-enhanced';
      const response = await fetch(updateUrl, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            warehouseId: editingStock.warehouseId,
                                            sku: product.vendorCode,
                                            amount: editingStock.value
                                          })
                                        });
                                        
                                        if (!response.ok) {
                                          const data = await response.json();
                                          throw new Error(data.error || 'Ошибка обновления остатков');
                                        }
                                        
                                        setEditingStock(null);
                                        // Перезагружаем остатки с enhanced API
                                        const reloadUrl = cabinetId ? `/api/wb/stocks-enhanced?cabinetId=${cabinetId}` : '/api/wb/stocks-enhanced';
      const stocksResponse = await fetch(reloadUrl);
                                        if (stocksResponse.ok) {
                                          const data = await stocksResponse.json();
                                          const stocksMap = new Map();
                                          if (data.data && Array.isArray(data.data)) {
                                            data.data.forEach((stock: any) => {
                                              stocksMap.set(stock.nmId, stock);
                                            });
                                          }
                                          setWarehouseStocks(stocksMap);
                                        }
                                      } catch (error) {
                                        clientLogger.error('Ошибка сохранения остатков:', error);
                                        alert('Ошибка при сохранении остатков');
                                      } finally {
                                        setSavingStock(false);
                                      }
                                    }}
                                    disabled={savingStock}
                                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                    title="Сохранить"
                                  >
                                    {savingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingStock(null);
                                    }}
                                    className="p-1 text-red-600 hover:text-red-700"
                                    title="Отмена"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 text-xs">
                                  <div>
                                    <span className="text-gray-500">Остаток: </span>
                                    <span className="font-bold text-gray-900">{warehouse.stock}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Резерв: </span>
                                    <span className="font-bold text-yellow-600">{warehouse.reserved}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Доступно: </span>
                                    <span className="font-bold text-green-600">{warehouse.stock - warehouse.reserved}</span>
                                  </div>
                                  {warehouse.warehouseType === 'FBS' && (
                                    <Edit2 className="w-3 h-3 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Заголовок FBS */}
                        <div className="text-xs font-semibold text-gray-600 mt-2 mb-1">FBS (Склад пользователя)</div>
                        
                        {/* Логистика */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">В пути к клиенту:</span>
                              <span className="text-blue-600 font-semibold">{product.inTransit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Возвраты:</span>
                              <span className="text-red-600 font-semibold">{product.inReturn}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p>Загрузка данных об остатках...</p>
                        <p className="text-xs text-gray-500 mt-1">Данные обновляются автоматически</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Конверсия */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">
                      Конверсия
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Просмотры:</span>
                        {product.analytics.conversion.views === 0 && loadingWarehouseStocks ? (
                          <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                        ) : (
                          <span className="text-gray-900 font-semibold">
                            {product.analytics.conversion.views}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Добавлений в корзину:</span>
                        {product.analytics.conversion.addToCart === 0 && loadingWarehouseStocks ? (
                          <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                        ) : (
                          <span className="text-gray-900 font-semibold">
                            {product.analytics.conversion.addToCart}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">CTR:</span>
                        {product.analytics.conversion.ctr === 0 && loadingWarehouseStocks ? (
                          <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                        ) : (
                          <span className="text-blue-600 font-semibold">
                            {product.analytics.conversion.ctr.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Конверсия корзина→заказ:</span>
                        {product.analytics.conversion.cartToOrder === 0 && loadingWarehouseStocks ? (
                          <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
                        ) : (
                          <span className="text-purple-600 font-semibold">
                            {(product.analytics.conversion.cartToOrder * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Поисковые запросы */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">
                      Топ поисковых запросов
                    </h4>
                    {product.analytics.searchQueries.topQueries.length > 0 ? (
                      <div className="space-y-2">
                        {product.analytics.searchQueries.topQueries.slice(0, 5).map((query, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-700 truncate flex-1">{query.query}</span>
                              <span className="text-gray-600 text-xs ml-2">
                                {query.orders} заказов
                              </span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min(100, (query.orders / product.analytics.sales.orders) * 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Данные о поисковых запросах недоступны
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Кнопки действий */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
                  <a
                    href={`https://www.wildberries.ru/catalog/${product.nmID}/detail.aspx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть на Wildberries
                  </a>
                  
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Редактировать товар
                  </button>
                  
                  <button
                    onClick={() => {
                      // Получаем ID товара из БД
                      fetch(`/api/products/by-nmId/${product.nmID}`)
                        .then(res => res.json())
                        .then(data => {
                          if (data.product) {
                            setAiOptimizationModal({
                              isOpen: true,
                              productId: data.product.id,
                              productName: product.title
                            });
                          } else {
                            console.error('Товар не найден в БД');
                          }
                        })
                        .catch(err => {
                          console.error('Ошибка получения товара:', err);
                        });
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                    title="Запустить AI оптимизацию товара"
                  >
                    <Sparkles className="w-4 h-4" />
                    Оптимизировать через AI
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Уведомление о результате сохранения цены/скидки */}
      {priceNotification && (
        <div className={`fixed top-8 right-8 liquid-glass rounded-lg p-4 shadow-2xl z-50 animate-fade-in max-w-sm ${
          priceNotification.type === 'success' 
            ? 'border-2 border-green-300 bg-green-50/90' 
            : 'border-2 border-red-300 bg-red-50/90'
        }`}>
          <p className={`text-sm font-medium ${
            priceNotification.type === 'success' 
              ? 'text-green-800' 
              : 'text-red-800'
          }`}>
            {priceNotification.message}
          </p>
        </div>
      )}

      {/* Индикатор фоновой загрузки */}
      {backgroundLoading && (
        <div className="fixed bottom-8 right-8 liquid-glass rounded-full p-4 shadow-2xl z-50 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Обновление товаров...</div>
              <div className="text-xs text-gray-600">Получаем данные из Wildberries</div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      <ProductEditModal
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={async (updates) => {
          if (!editingProduct) return;
          
          const response = await fetch('/api/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nmID: editingProduct.nmID,
              updates
            })
          });
          
          if (!response.ok) {
            throw new Error('Ошибка сохранения товара');
          }
          
          // Обновляем данные
          refresh(false);
        }}
      />

      {/* Модальное окно AI оптимизации */}
      <AiOptimizationModal
        isOpen={aiOptimizationModal?.isOpen || false}
        onClose={() => setAiOptimizationModal(null)}
        productId={aiOptimizationModal?.productId || ''}
        productName={aiOptimizationModal?.productName || ''}
        onOptimizationStarted={(result) => {
          console.log('✅ AI оптимизация запущена:', result);
          setAiOptimizationModal(null);
          // Можно добавить уведомление об успешном запуске
          setPriceNotification({
            type: 'success',
            message: `🎯 AI оптимизация "${result.product.name}" запущена! ${result.chats.length} чатов создано.`
          });
          setTimeout(() => setPriceNotification(null), 5000);
        }}
      />
    </div>
  );
}
