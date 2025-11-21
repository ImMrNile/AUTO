// Одностраничная форма создания товара - все поля на одной странице

'use client';

import { useState, useEffect } from 'react';
import { clientLogger } from '@/lib/logger';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Upload, Loader2, Sparkles, BarChart3, Home, CheckCircle, Plus, CloudUpload, Image as ImageIcon, Store, MessageSquare, RefreshCw, X } from 'lucide-react';
import { useTaskContext } from '../BackgroundTasks/TaskProvider';

interface Cabinet {
  id: string;
  name: string;
  hasToken?: boolean;
  sellerId?: string;
  shopName?: string;
  isActive: boolean;
}

interface SinglePageProductFormProps {
  cabinetId?: string | null;
  onSuccess?: () => void;
  onTaskStart?: (productName: string) => string;
  onTaskUpdate?: (taskId: string, updates: any) => void;
  onTaskComplete?: (taskId: string, productId?: string) => void;
  onTaskError?: (taskId: string, error: string) => void;
}

// Функция генерации баркода
function generateEAN13Barcode(): string {
  let code = '22';
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
}

export default function SinglePageProductForm({ 
  cabinetId,
  onSuccess,
  onTaskStart,
  onTaskUpdate,
  onTaskComplete,
  onTaskError
}: SinglePageProductFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Используем TaskContext для глобальных уведомлений
  const { createTask, updateTask, completeTask, errorTask } = useTaskContext();
  
  // Отслеживание задачи из URL
  const [trackingTask, setTrackingTask] = useState<any>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  
  // Основные данные
  const [productName, setProductName] = useState('');
  const [packageContents, setPackageContents] = useState('Товар - 1 шт., упаковка - 1 шт.');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageComments, setImageComments] = useState('');
  const [selectedCabinetId, setSelectedCabinetId] = useState(cabinetId || '');
  
  // Размеры товара (варианты)
  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setSizes] = useState<Array<{size: string; russianSize: string; barcode: string}>>([]);
  
  // Кабинеты
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [isLoadingCabinets, setIsLoadingCabinets] = useState(false);
  
  // Изображения
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  
  // Размеры
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  // Категория (определяется AI или выбирается вручную)
  const [detectedCategory, setDetectedCategory] = useState<any>(null);
  const [isCategoryDetecting, setIsCategoryDetecting] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [categoryHasSizeCharacteristic, setCategoryHasSizeCharacteristic] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  
  // Состояние создания
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdProductId, setCreatedProductId] = useState('');
  const [aiResults, setAiResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [editingCharacteristics, setEditingCharacteristics] = useState<{[key: number]: boolean}>({});
  const [allCategoryCharacteristics, setAllCategoryCharacteristics] = useState<any[]>([]);
  const [currentCharacteristics, setCurrentCharacteristics] = useState<any[]>([]);

  // Генерация артикула
  const generateVendorCode = () => {
    const productPrefix = productName ? productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD' : 'PRD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newVendorCode = `${productPrefix}${timestamp}${random}`.substring(0, 13);
    setVendorCode(newVendorCode);
  };

  // Генерация баркода
  const generateBarcode = () => {
    setBarcode(generateEAN13Barcode());
  };

  // Добавление размера
  const handleAddSize = () => {
    setSizes([...sizes, { size: '', russianSize: '', barcode: generateEAN13Barcode() }]);
  };

  // Удаление размера
  const handleRemoveSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  // Обновление размера
  const handleUpdateSize = (index: number, field: 'size' | 'russianSize' | 'barcode', value: string) => {
    const newSizes = [...sizes];
    newSizes[index][field] = value;
    setSizes(newSizes);
  };

  // Генерация баркода для конкретного размера
  const handleGenerateSizeBarcode = (index: number) => {
    const newSizes = [...sizes];
    newSizes[index].barcode = generateEAN13Barcode();
    setSizes(newSizes);
  };

  // 🔥 Функция очистки формы после успешной отправки
  const resetForm = () => {
    clientLogger.log('🧹 Очистка формы...');
    setProductName('');
    setPackageContents('Товар - 1 шт., упаковка - 1 шт.');
    setPrice('');
    setDiscountPrice('');
    setCostPrice('');
    setVendorCode('');
    setBarcode('');
    setImageComments('');
    setMainImage(null);
    setMainImagePreview('');
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);
    setLength('');
    setWidth('');
    setHeight('');
    setWeight('');
    setDetectedCategory(null);
    setHasSizes(false);
    setSizes([]);
    setError('');
    setSuccess('');
    setIsCreating(false);
    clientLogger.log('✅ Форма очищена');
  };

  // Загрузка задачи из URL параметра
  useEffect(() => {
    const taskIdFromUrl = searchParams?.get('taskId');
    if (taskIdFromUrl) {
      loadTaskFromUrl(taskIdFromUrl);
    }
  }, [searchParams]);

  // Функция загрузки задачи
  const loadTaskFromUrl = async (taskId: string) => {
    try {
      setIsLoadingTask(true);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.task) {
          setTrackingTask(data.task);
          setCurrentTaskId(taskId);
          
          // Если задача завершена и есть productId, показываем результаты
          if (data.task.status === 'COMPLETED' && data.task.productId) {
            setCreatedProductId(data.task.productId);
            setShowResults(true);
          }
        }
      }
    } catch (err) {
      clientLogger.error('Ошибка загрузки задачи:', err);
    } finally {
      setIsLoadingTask(false);
    }
  };

  // Polling для активной задачи (каждые 50 секунд)
  useEffect(() => {
    if (!trackingTask || trackingTask.status === 'COMPLETED' || trackingTask.status === 'ERROR') {
      return;
    }

    const interval = setInterval(async () => {
      const taskIdFromUrl = searchParams?.get('taskId');
      if (taskIdFromUrl) {
        await loadTaskFromUrl(taskIdFromUrl);
      }
    }, 50000); // 50 секунд

    return () => clearInterval(interval);
  }, [trackingTask, searchParams]);

  // Загрузка кабинетов при монтировании
  useEffect(() => {
    loadCabinets();
    generateVendorCode();
    generateBarcode();
    
    // Восстанавливаем состояние из localStorage при загрузке
    const savedState = localStorage.getItem('productFormState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        clientLogger.log('📦 Восстановлено состояние формы из localStorage', state);
        
        // Восстанавливаем только если это недавнее сохранение (не старше 1 часа)
        const savedTime = state.savedAt ? new Date(state.savedAt).getTime() : 0;
        const now = new Date().getTime();
        const hourInMs = 60 * 60 * 1000;
        
        if (now - savedTime < hourInMs && state.isCreating) {
          setProductName(state.productName || '');
          setPrice(state.price || '');
          setDiscountPrice(state.discountPrice || '');
          setCostPrice(state.costPrice || '');
          setPackageContents(state.packageContents || '');
          setVendorCode(state.vendorCode || '');
          setBarcode(state.barcode || '');
          setImageComments(state.imageComments || '');
          setLength(state.length || '');
          setWidth(state.width || '');
          setHeight(state.height || '');
          setWeight(state.weight || '');
          
          // Показываем уведомление
          alert('Обнаружено незавершенное создание товара. Данные восстановлены.');
        }
      } catch (e) {
        clientLogger.warn('⚠️ Не удалось восстановить состояние формы', e);
      }
    }
  }, []);
  
  // Сохраняем состояние в localStorage при изменении (только во время создания)
  useEffect(() => {
    if (isCreating) {
      const state = {
        productName,
        price,
        discountPrice,
        costPrice,
        packageContents,
        vendorCode,
        barcode,
        imageComments,
        length,
        width,
        height,
        weight,
        isCreating,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('productFormState', JSON.stringify(state));
    } else {
      // Очищаем при успешном завершении
      localStorage.removeItem('productFormState');
    }
  }, [isCreating, productName, price, discountPrice, costPrice, packageContents, vendorCode, barcode, imageComments, length, width, height, weight]);
  
  // Предупреждение при попытке уйти со страницы во время создания
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCreating) {
        e.preventDefault();
        e.returnValue = 'Товар создается. Вы уверены, что хотите прервать процесс?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCreating]);

  const loadCabinets = async () => {
    setIsLoadingCabinets(true);
    try {
      const response = await fetch('/api/user/cabinets');
      if (response.ok) {
        const result = await response.json();
        clientLogger.log('📋 Получены кабинеты:', result);
        
        // API возвращает { success: true, data: { cabinets: [...] } }
        const cabinetsList = result.data?.cabinets || result.cabinets || [];
        setCabinets(cabinetsList);
        
        clientLogger.log(`✅ Загружено кабинетов: ${cabinetsList.length}`);
        
        // Автоматически выбираем первый активный кабинет
        const firstActive = cabinetsList.find((c: Cabinet) => c.isActive);
        if (firstActive) {
          setSelectedCabinetId(firstActive.id);
          clientLogger.log(`✅ Автовыбран кабинет: ${firstActive.name}`);
        }
      }
    } catch (error) {
      clientLogger.error('❌ Ошибка загрузки кабинетов:', error);
    } finally {
      setIsLoadingCabinets(false);
    }
  };

  // Определение категории при загрузке первых фото
  useEffect(() => {
    if (productName && (mainImage || additionalImages.length > 0)) {
      detectCategory();
    }
  }, [productName, mainImage, additionalImages]);

  // Загрузка всех категорий для селектора
  const loadAllCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await fetch('/api/products/categories');
      if (response.ok) {
        const result = await response.json();
        setAllCategories(result.categories || []);
        clientLogger.log(`✅ Загружено ${result.categories?.length || 0} категорий`);
      }
    } catch (error) {
      clientLogger.error('❌ Ошибка загрузки категорий:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Проверка категории на наличие характеристики "Размер"
  const checkCategoryForSizeCharacteristic = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/products/category/${categoryId}/characteristics`);
      if (response.ok) {
        const result = await response.json();
        const characteristics = result.characteristics || [];
        
        // Ищем характеристику с названием "Размер" или "Размер продавца"
        const hasSizeChar = characteristics.some((char: any) => 
          char.name && (char.name.toLowerCase().includes('размер') || char.name.toLowerCase().includes('size'))
        );
        
        setCategoryHasSizeCharacteristic(hasSizeChar);
        
        if (hasSizeChar) {
          clientLogger.log('✅ Категория требует указания размеров');
          // Автоматически включаем режим размеров
          setHasSizes(true);
          // Добавляем первый размер по умолчанию
          if (sizes.length === 0) {
            setSizes([{ size: '42-54', russianSize: '42', barcode: generateEAN13Barcode() }]);
          }
        }
      }
    } catch (error) {
      clientLogger.error('Ошибка проверки характеристик категории:', error);
    }
  };

  const detectCategory = async () => {
    // Не определяем если уже есть категория
    if (detectedCategory) {
      clientLogger.log('ℹ️ Категория уже определена:', detectedCategory.name);
      return;
    }
    
    // Нужно название и хотя бы одно фото
    if (!productName || (!mainImage && additionalImages.length === 0)) return;
    
    setIsCategoryDetecting(true);
    setCategoryError('');
    
    try {
      // Создаем FormData для загрузки изображений
      const formData = new FormData();
      formData.append('productName', productName);
      
      // Добавляем главное изображение
      if (mainImage) {
        formData.append('mainImage', mainImage);
      }
      
      // Добавляем дополнительные изображения
      additionalImages.forEach((file, index) => {
        formData.append(`additionalImage${index}`, file); // БЕЗ подчёркивания!
      });
      
      clientLogger.log(`🔍 Определение категории с ${(mainImage ? 1 : 0) + additionalImages.length} фото`);
      
      // Отправляем FormData (файлы будут загружены на сервер)
      const response = await fetch('/api/ai/detect-category', {
        method: 'POST',
        body: formData // Без Content-Type - браузер установит автоматически
      });
      
      const result = await response.json();
      
      if (result.success && result.detectedCategory) {
        setDetectedCategory(result.detectedCategory);
        clientLogger.log('✅ Категория определена:', result.detectedCategory.name);
        
        // Проверяем, есть ли в категории характеристика "Размер"
        await checkCategoryForSizeCharacteristic(result.detectedCategory.id);
      } else {
        setCategoryError(result.error || 'Не удалось определить категорию');
      }
    } catch (error) {
      clientLogger.error('❌ Ошибка определения категории:', error);
      setCategoryError('Ошибка определения категории');
    } finally {
      setIsCategoryDetecting(false);
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Проверяем наличие названия товара
    if (!productName || productName.trim() === '') {
      setError('Сначала введите название товара');
      e.target.value = ''; // Сбрасываем выбор файла
      return;
    }
    
    const file = e.target.files?.[0];
    if (file) {
      setMainImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string);
        
        // Автоматически определяем категорию если есть название и еще не определена
        if (productName && !detectedCategory && !isCategoryDetecting) {
          clientLogger.log('🎯 Автоматическое определение категории...');
          // Небольшая задержка чтобы state обновился
          setTimeout(() => detectCategory(), 100);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Проверяем наличие названия товара
    if (!productName || productName.trim() === '') {
      setError('Сначала введите название товара');
      e.target.value = ''; // Сбрасываем выбор файлов
      return;
    }
    
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setAdditionalImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdditionalImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔒 ЗАЩИТА: Предотвращаем множественные отправки
    if (isCreating) {
      clientLogger.warn('⚠️ Форма уже отправляется, игнорируем повторный submit');
      return;
    }
    
    if (!cabinetId) {
      setError('Выберите кабинет для публикации товара.');
      return;
    }
    
    if (!detectedCategory) {
      setError('Категория не определена. Добавьте фото и название товара.');
      return;
    }
    
    if (!packageContents.trim()) {
      setError('Комплектация товара - обязательное поле. Опишите, что входит в комплектацию.');
      return;
    }
    
    // ✅ ОБЯЗАТЕЛЬНОСТЬ РАЗМЕРОВ: Если категория требует размеры, они обязательны
    if (categoryHasSizeCharacteristic && !hasSizes) {
      setError('Для данной категории обязательно указание размеров. Включите "Товар имеет размеры".');
      return;
    }
    
    // Проверка размеров если они требуются
    if (hasSizes && sizes.length === 0) {
      setError('Добавьте хотя бы один размер товара.');
      return;
    }
    
    // Проверка заполненности размеров
    if (hasSizes) {
      const invalidSizes = sizes.filter(s => !s.size || !s.russianSize || !s.barcode);
      if (invalidSizes.length > 0) {
        setError('Все размеры должны иметь значение размера продавца, российского размера и баркода.');
        return;
      }
    }
    
    // ✅ ВАЛИДАЦИЯ ЦЕН: Только положительные числа
    const priceNum = parseFloat(price);
    const discountPriceNum = parseFloat(discountPrice);
    const costPriceNum = costPrice ? parseFloat(costPrice) : 0;
    
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Цена до скидки должна быть положительным числом.');
      return;
    }
    
    if (isNaN(discountPriceNum) || discountPriceNum <= 0) {
      setError('Цена продажи должна быть положительным числом.');
      return;
    }
    
    if (costPrice && (isNaN(costPriceNum) || costPriceNum < 0)) {
      setError('Себестоимость не может быть отрицательной.');
      return;
    }
    
    if (discountPriceNum > priceNum) {
      setError('Цена продажи не может быть больше цены до скидки.');
      return;
    }
    
    // ✅ ВАЛИДАЦИЯ ГАБАРИТОВ: Только положительные числа
    const lengthNum = parseFloat(length);
    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    if (length && (isNaN(lengthNum) || lengthNum <= 0)) {
      setError('Длина должна быть положительным числом.');
      return;
    }
    
    if (width && (isNaN(widthNum) || widthNum <= 0)) {
      setError('Ширина должна быть положительным числом.');
      return;
    }
    
    if (height && (isNaN(heightNum) || heightNum <= 0)) {
      setError('Высота должна быть положительным числом.');
      return;
    }
    
    if (weight && (isNaN(weightNum) || weightNum <= 0)) {
      setError('Вес должен быть положительным числом.');
      return;
    }
    
    clientLogger.log('🚀 [FORM] Начало отправки формы:', new Date().toISOString());
    setIsCreating(true);
    setError('');
    setSuccess('');
    
    // Создаем задачу в БД для отслеживания
    const taskId = await createTask(productName);
    if (!taskId) {
      setError('Не удалось создать задачу');
      setIsCreating(false);
      return;
    }
    
    setCurrentTaskId(taskId);
    
    // 🔥 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Создаем FormData для фоновой обработки
    const formDataToSend = new FormData();
    
    // Основные поля
    formDataToSend.append('name', productName);
    formDataToSend.append('packageContents', packageContents);
    formDataToSend.append('originalPrice', price);
    formDataToSend.append('discountPrice', discountPrice || price);
    formDataToSend.append('costPrice', costPrice || '0');
    formDataToSend.append('vendorCode', vendorCode);
    formDataToSend.append('barcode', barcode);
    formDataToSend.append('taskId', taskId); // Добавляем taskId для связи
    
    // Размеры (если есть)
    if (hasSizes && sizes.length > 0) {
      formDataToSend.append('hasVariantSizes', 'true');
      formDataToSend.append('variantSizes', JSON.stringify(sizes));
    } else {
      formDataToSend.append('hasVariantSizes', 'false');
      formDataToSend.append('variantSizes', JSON.stringify([]));
    }
    formDataToSend.append('cabinetId', cabinetId);
    formDataToSend.append('categoryId', detectedCategory.id.toString());
    formDataToSend.append('categoryName', detectedCategory.name);
    formDataToSend.append('parentCategoryName', detectedCategory.parentName || '');
    formDataToSend.append('imageComments', imageComments);
    
    // Размеры
    formDataToSend.append('dimensions', JSON.stringify({
      length: parseFloat(length) || 0,
      width: parseFloat(width) || 0,
      height: parseFloat(height) || 0,
      weight: parseFloat(weight) || 0
    }));
    
    // Главное изображение
    if (mainImage) {
      formDataToSend.append('image', mainImage);
    }
    
    // Дополнительные изображения
    formDataToSend.append('additionalImagesCount', additionalImages.length.toString());
    additionalImages.forEach((file, index) => {
      formDataToSend.append(`additionalImage${index}`, file); // БЕЗ подчёркивания!
    });
    
    clientLogger.log('📤 Отправка FormData с файлами:', {
      name: productName,
      mainImage: mainImage?.name,
      additionalImages: additionalImages.length,
      category: detectedCategory.name,
      taskId
    });
    
    // 🔥 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Запускаем фоновую обработку
    const productsUrl = new URL('/api/products', window.location.origin);
    if (selectedCabinetId) productsUrl.searchParams.set('cabinetId', selectedCabinetId);
    
    // Запускаем обработку в фоне (не ждем завершения)
    fetch(productsUrl.toString(), {
      method: 'POST',
      body: formDataToSend
    }).then(async (response) => {
      const result = await response.json();
      
      clientLogger.log('📦 Фоновая обработка завершена:', result);
      
      if (result.success || result.productId) {
        clientLogger.log('✅ Товар создан в фоне:', result.productId);
        
        // ✅ Завершаем задачу - AI анализ завершен, товар создан
        if (taskId) {
          await completeTask(taskId, result.productId);
          clientLogger.log('✅ Задача завершена: AI анализ завершен, товар создан');
        }
      } else {
        clientLogger.error('❌ Ошибка фоновой обработки:', result.error);
        
        // Отмечаем задачу как ошибку
        if (taskId) {
          await errorTask(taskId, result.error || 'Ошибка создания товара');
        }
      }
    }).catch(async (error) => {
      clientLogger.error('❌ Ошибка фоновой обработки:', error);
      
      // Отмечаем задачу как ошибку
      if (taskId) {
        await errorTask(taskId, 'Ошибка создания товара');
      }
    });
    
    // ✅ Очищаем форму и перенаправляем на страницу "В работе"
    clientLogger.log('🔄 Очистка формы и редирект на страницу "В работе"...');
    resetForm();
    router.push('/?tab=in-progress');
  };

  // Обработчики для Step4Results
  const handleUpdateProductField = async (field: string, value: string) => {
    // TODO: Реализовать обновление поля товара
    clientLogger.log('Обновление поля:', field, value);
  };

  const handleUpdateCharacteristic = async (characteristicId: number, newValue: any) => {
    // TODO: Реализовать обновление характеристики
    clientLogger.log('Обновление характеристики:', characteristicId, newValue);
  };

  const handleDeleteCharacteristic = async (characteristicId: number) => {
    // TODO: Реализовать удаление характеристики
    clientLogger.log('Удаление характеристики:', characteristicId);
  };

  const handleAddNewCharacteristic = async (characteristicId: number, value: any) => {
    // TODO: Реализовать добавление характеристики
    clientLogger.log('Добавление характеристики:', characteristicId, value);
  };

  const handleToggleEditCharacteristic = (characteristicId: number) => {
    setEditingCharacteristics(prev => ({
      ...prev,
      [characteristicId]: !prev[characteristicId]
    }));
  };

  const handlePublish = async () => {
    if (!createdProductId || !cabinetId) {
      setError('Не указан товар или кабинет для публикации');
      return;
    }

    setIsCreating(true);
    setError('');
    
    // ✅ ИСПРАВЛЕНИЕ: Используем существующую задачу вместо создания новой
    const taskId = currentTaskId;
    if (taskId) {
      await updateTask(taskId, {
        status: 'PUBLISHING',
        progress: 95,
        currentStage: 'Публикация на Wildberries',
        productId: createdProductId
      });
      clientLogger.log('📤 Обновлена задача для публикации:', taskId);
    }
    
    try {
      clientLogger.log('🚀 Публикация товара на WB...');
      clientLogger.log('🔍 DEBUG aiResults:', aiResults);
      clientLogger.log('🔍 DEBUG aiResults.aiCharacteristics:', aiResults?.aiCharacteristics);
      clientLogger.log('🔍 DEBUG aiResults.characteristics:', aiResults?.characteristics);
      clientLogger.log('🔍 DEBUG allCategoryCharacteristics:', allCategoryCharacteristics);
      
      // Получаем характеристики из allCategoryCharacteristics (это то что показывается в Step4Results)
      // Берем только заполненные характеристики
      const characteristicsToSend = allCategoryCharacteristics
        .filter((char: any) => {
          const hasValue = char.value !== null && 
                          char.value !== undefined && 
                          char.value !== '' &&
                          char.isFilled;
          return hasValue;
        })
        .map((char: any) => ({
          id: char.id,
          name: char.name,
          value: char.value
        }));
      
      clientLogger.log('📤 Отправка данных для публикации:', {
        characteristics: characteristicsToSend.length,
        seoTitle: aiResults?.seoTitle || aiResults?.generatedName,
        hasDescription: !!(aiResults?.seoDescription),
        fullData: characteristicsToSend
      });
      
      const response = await fetch(`/api/products/${createdProductId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characteristics: characteristicsToSend,
          seoTitle: aiResults?.seoTitle || aiResults?.generatedName || productName,
          seoDescription: aiResults?.seoDescription || '',
          finalStatus: 'PUBLISHED'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setSuccess('✅ Товар успешно опубликован на Wildberries!');
        setShowSuccessModal(true);
        
        // ✅ Завершаем задачу - товар опубликован
        if (taskId) {
          await completeTask(taskId, createdProductId);
          setCurrentTaskId(null); // Очищаем ID задачи
          clientLogger.log('✅ Задача завершена: товар опубликован на WB');
        }
      } else {
        setError(result.error || 'Ошибка публикации товара');
        
        // Отмечаем задачу как ошибку
        if (taskId) {
          await errorTask(taskId, result.error || 'Ошибка публикации товара');
        }
      }
    } catch (error) {
      clientLogger.error('❌ Ошибка публикации:', error);
      const errorMessage = 'Ошибка публикации товара';
      setError(errorMessage);
      
      // Отмечаем задачу как ошибку
      if (taskId) {
        await errorTask(taskId, errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveOnly = async () => {
    // TODO: Сохранить изменения без публикации
    clientLogger.log('Сохранение без публикации');
  };

  const handleCreateInfographic = async () => {
    // TODO: Создать инфографику
    clientLogger.log('Создание инфографики');
  };

  const handleClearForm = () => {
    setShowResults(false);
    setCreatedProductId('');
    setAiResults(null);
    setSuccess('');
    setProductName('');
    setPackageContents('Товар - 1 шт., упаковка - 1 шт.');
    setPrice('');
    setDiscountPrice('');
    setCostPrice('');
    setMainImage(null);
    setMainImagePreview('');
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);
    setImageComments('');
    setDetectedCategory(null);
    setHasSizes(false);
    setSizes([]);
    setCategoryHasSizeCharacteristic(false);
    setTrackingTask(null);
    setCurrentTaskId(null);
    generateVendorCode();
    generateBarcode();
    
    // Убираем taskId из URL
    const url = new URL(window.location.href);
    url.searchParams.delete('taskId');
    router.push(url.pathname + url.search);
  };

  const handleLoadProductCharacteristics = (productId: string) => {
    clientLogger.log('Загрузка характеристик товара:', productId);
  };

  // Скролл вверх при показе результатов
  useEffect(() => {
    if (showResults) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showResults]);

  // Если отслеживаем задачу и она активна - показываем загрузку
  if (trackingTask && trackingTask.status !== 'COMPLETED' && trackingTask.status !== 'ERROR') {
    return (
      <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Анимированные фоновые элементы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Круги */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-200/30 rounded-full blur-xl animate-float" style={{animationDelay: '0s'}} />
          <div className="absolute top-40 right-20 w-40 h-40 bg-blue-200/30 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}} />
          <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-pink-200/30 rounded-full blur-xl animate-float" style={{animationDelay: '2s'}} />
          <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-indigo-200/30 rounded-full blur-xl animate-float" style={{animationDelay: '1.5s'}} />
          
          {/* Квадраты */}
          <div className="absolute top-1/4 left-1/3 w-20 h-20 bg-purple-300/20 rounded-lg blur-lg animate-spin-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-300/20 rounded-lg blur-lg animate-spin-slow" style={{animationDelay: '3s'}} />
        </div>

        {/* Основной контент */}
        <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-100 animate-in fade-in zoom-in duration-500">
            {/* Анимированный лоадер */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-2xl opacity-50 animate-pulse" />
              </div>
              <Loader2 className="relative w-16 h-16 sm:w-20 sm:h-20 animate-spin text-purple-600 mx-auto" />
            </div>

            {/* Текст */}
            <div className="text-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                {trackingTask.productName}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 animate-pulse">
                {trackingTask.currentStage || 'Создание товара...'}
              </p>
            </div>

            {/* Прогресс бар */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">Прогресс</span>
                <span className="text-xs sm:text-sm font-bold text-purple-600">{trackingTask.progress}%</span>
              </div>
              <div className="relative w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-full transition-all duration-700 animate-gradient-x"
                  style={{ width: `${trackingTask.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Подсказка */}
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-6">
              Товар создается ~2 мин. Можете закрыть страницу
            </p>

            {/* Кнопка */}
            <button
              onClick={handleClearForm}
              className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 touch-manipulation"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Создать новый товар</span>
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Если товар создан - редиректим на страницу "В работе"
  useEffect(() => {
    if (showResults && createdProductId) {
      clientLogger.log('✅ Товар создан, редирект на страницу "В работе"');
      router.push('/?tab=in-progress');
    }
  }, [showResults, createdProductId, router]);

  return (
    <div className="relative w-full flex flex-col items-center justify-start px-3 sm:px-6">
      <div className="z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
        <main className="w-full liquid-glass rounded-2xl p-3 sm:p-6 md:p-8 shadow-inner-soft">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Создание нового товара</h1>
              <p className="text-text-subtle mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">Заполните информацию о товаре для Wildberries</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Название товара */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="product-name">
              Название товара *
            </label>
            <input
              id="product-name"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2.5 sm:p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 caret-black"
              placeholder="Смарт-часы с AI-ассистентом"
              required
              style={{caretColor: 'black'}}
            />
          </div>

          {/* Фото рядом */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Главное фото */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Главное фото *
              </label>
              {mainImagePreview ? (
                <div className="relative group w-full h-40 sm:h-48">
                  <img 
                    src={mainImagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.png';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMainImage(null);
                      setMainImagePreview('');
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-40 sm:h-48 rounded-lg liquid-glass-input shadow-inner-soft">
                  <label 
                    className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg transition-colors ${
                      !productName || productName.trim() === ''
                        ? 'border-gray-300 cursor-not-allowed opacity-50'
                        : 'border-purple-300 cursor-pointer hover:border-purple-500 active:border-purple-600'
                    }`}
                    htmlFor="main-photo"
                    title={!productName || productName.trim() === '' ? 'Сначала введите название товара' : ''}
                  >
                    <div className="flex flex-col items-center justify-center text-center px-2">
                      <CloudUpload className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 ${
                        !productName || productName.trim() === '' ? 'text-gray-400' : 'text-purple-500'
                      }`} />
                      <p className="mb-1 text-xs sm:text-sm text-gray-700">
                        <span className={`font-semibold ${
                          !productName || productName.trim() === '' ? 'text-gray-500' : 'text-purple-600'
                        }`}>
                          {!productName || productName.trim() === '' ? 'Введите название товара' : 'Нажмите для загрузки'}
                        </span>
                      </p>
                      {productName && productName.trim() !== '' && (
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                      )}
                    </div>
                    <input
                      id="main-photo"
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageChange}
                      className="hidden"
                      required
                      disabled={!productName || productName.trim() === ''}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Дополнительные фото */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Дополнительные фото
              </label>
              <div className="w-full h-40 sm:h-48 rounded-lg liquid-glass-input shadow-inner-soft p-3 overflow-auto">
                <div className="flex gap-2 min-w-max">
                  {additionalImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group w-32 h-32 flex-shrink-0">
                      <img 
                        src={preview} 
                        alt={`Preview ${index}`} 
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.png';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalImages(prev => prev.filter((_, i) => i !== index));
                          setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <label 
                    className={`flex flex-col items-center justify-center w-32 h-32 flex-shrink-0 border-2 border-dashed rounded-lg transition-colors ${
                      !productName || productName.trim() === ''
                        ? 'border-gray-300 cursor-not-allowed opacity-50'
                        : 'border-purple-300 cursor-pointer hover:border-purple-500 active:border-purple-600'
                    }`}
                    htmlFor="additional-photos"
                    title={!productName || productName.trim() === '' ? 'Сначала введите название товара' : ''}
                  >
                    <ImageIcon className={`w-8 h-8 mb-1 ${
                      !productName || productName.trim() === '' ? 'text-gray-400' : 'text-purple-500'
                    }`} />
                    <p className={`text-xs font-semibold text-center px-2 ${
                      !productName || productName.trim() === '' ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {!productName || productName.trim() === '' ? 'Введите название' : 'Загрузить'}
                    </p>
                    <input
                      id="additional-photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAdditionalImagesChange}
                      className="hidden"
                      disabled={!productName || productName.trim() === ''}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Кабинет */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700" htmlFor="publication-cabinet">
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-purple-600" />
              Кабинет для публикации *
            </label>
            <select
              id="publication-cabinet"
              value={selectedCabinetId || ''}
              onChange={(e) => setSelectedCabinetId(e.target.value)}
              className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2.5 sm:p-3 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 caret-black"
              required
              disabled={isLoadingCabinets}
              style={{caretColor: 'black'}}
            >
              <option value="">
                {isLoadingCabinets ? 'Загрузка...' : cabinets.length > 0 ? 'Выберите кабинет' : 'Нет доступных кабинетов'}
              </option>
              {cabinets.map((cabinet) => (
                <option key={cabinet.id} value={cabinet.id}>
                  {cabinet.name} {!cabinet.isActive && '(неактивен)'}
                </option>
              ))}
            </select>
          </div>

          {/* Комплектация товара - ОБЯЗАТЕЛЬНОЕ ПОЛЕ */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700" htmlFor="packaging">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-purple-600" />
              Комплектация товара *
            </label>
            <textarea
              id="packaging"
              value={packageContents}
              onChange={(e) => setPackageContents(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none text-gray-900 placeholder-gray-400 text-sm caret-black"
              rows={2}
              placeholder="Товар - 1 шт., упаковка - 1 шт."
              required
              style={{caretColor: 'black'}}
            />
          </div>

          {/* Комментарий */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700" htmlFor="comment">
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-purple-600" />
              Комментарий (опционально)
            </label>
            <textarea
              id="comment"
              value={imageComments}
              onChange={(e) => setImageComments(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none text-gray-900 placeholder-gray-400 text-sm caret-black"
              rows={3}
              placeholder="Основная фича товара или ссылка на аналог для анализа. Пример: 'IP68' или 'https://wb.ru/catalog/12345'"
              style={{caretColor: 'black'}}
            />
          </div>

          {/* Индикатор определения категории */}
          {(isCategoryDetecting || detectedCategory || categoryError) && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="liquid-glass rounded-lg p-3 sm:p-4">
                {isCategoryDetecting && (
                  <div className="flex items-center gap-2 sm:gap-3 text-blue-600">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <div>
                      <p className="text-sm sm:text-base font-semibold">Определение категории...</p>
                      <p className="text-xs text-gray-500">AI анализирует изображения</p>
                    </div>
                  </div>
                )}
                {!isCategoryDetecting && detectedCategory && (
                  <div className="space-y-2 sm:space-y-3 animate-in fade-in duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-green-600">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-semibold">✅ Категория определена</p>
                          <p className="text-xs sm:text-sm text-gray-700 truncate">{detectedCategory.parentName} → {detectedCategory.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newState = !showCategorySelector;
                          setShowCategorySelector(newState);
                          // Загружаем категории при открытии селектора
                          if (newState && allCategories.length === 0) {
                            loadAllCategories();
                          }
                        }}
                        className="self-start sm:self-auto px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 border-2 border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation flex-shrink-0"
                      >
                        {showCategorySelector ? 'Скрыть' : 'Изменить'}
                      </button>
                    </div>
                    
                    {showCategorySelector && (
                      <div className="bg-white/50 rounded-lg p-3 sm:p-4 border border-purple-200 space-y-2 sm:space-y-3">
                        <p className="text-xs sm:text-sm font-semibold text-gray-700">Выберите категорию вручную:</p>
                        {isLoadingCategories ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            <span className="text-xs sm:text-sm">Загрузка категорий...</span>
                          </div>
                        ) : (
                          <>
                            {/* Поле поиска */}
                            <div className="relative">
                              <input
                                type="text"
                                value={categorySearchTerm}
                                onChange={(e) => setCategorySearchTerm(e.target.value)}
                                placeholder="Поиск категории..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              {categorySearchTerm && (
                                <button
                                  onClick={() => setCategorySearchTerm('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            
                            {/* Счетчик найденных категорий */}
                            {(() => {
                              const filtered = allCategories.filter((cat: any) => {
                                if (!categorySearchTerm) return true;
                                const search = categorySearchTerm.toLowerCase();
                                return cat.name.toLowerCase().includes(search) || 
                                       cat.parentName?.toLowerCase().includes(search);
                              });
                              const shown = Math.min(filtered.length, 100);
                              return (
                                <p className="text-xs text-gray-500">
                                  {categorySearchTerm ? (
                                    <>Найдено: {filtered.length} {shown < filtered.length && `(показано ${shown})`}</>
                                  ) : (
                                    <>Всего категорий: {allCategories.length} (показано {shown})</>
                                  )}
                                </p>
                              );
                            })()}
                            
                            {/* Список категорий */}
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                              {allCategories
                                .filter((cat: any) => {
                                  if (!categorySearchTerm) return true;
                                  const search = categorySearchTerm.toLowerCase();
                                  return cat.name.toLowerCase().includes(search) || 
                                         cat.parentName?.toLowerCase().includes(search);
                                })
                                .slice(0, 100) // Показываем максимум 100 для производительности
                                .map((cat: any) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  // Устанавливаем категорию
                                  setDetectedCategory(cat);
                                  setShowCategorySelector(false);
                                  setCategorySearchTerm(''); // Очищаем поиск
                                  
                                  // Проверяем характеристику "Размер"
                                  checkCategoryForSizeCharacteristic(cat.id);
                                  
                                  clientLogger.log(`✅ Категория выбрана вручную: ${cat.name} (ID: ${cat.id})`);
                                  clientLogger.log(`🎯 Категория будет передана агентам при создании товара`);
                                }}
                                className={`text-left p-2.5 sm:p-3 rounded-lg border-2 transition-all touch-manipulation ${
                                  detectedCategory?.id === cat.id
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-300 hover:border-purple-400 active:border-purple-500 bg-white'
                                }`}
                              >
                                <p className="font-medium text-xs sm:text-sm text-gray-900">{cat.name}</p>
                                {cat.parentName && (
                                  <p className="text-xs text-gray-500 mt-0.5">{cat.parentName}</p>
                                )}
                              </button>
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!isCategoryDetecting && categoryError && (
                  <div className="flex items-center gap-3 text-red-600">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-semibold">Ошибка определения категории</p>
                      <p className="text-xs text-text-subtle">{categoryError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Размеры */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="length">Длина (см)</label>
              <input
                id="length"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={length}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setLength(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="20"
                style={{caretColor: 'black'}}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="width">Ширина (см)</label>
              <input
                id="width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={width}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setWidth(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="15"
                style={{caretColor: 'black'}}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="height">Высота (см)</label>
              <input
                id="height"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={height}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setHeight(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="5"
                style={{caretColor: 'black'}}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="weight">Вес (кг)</label>
              <input
                id="weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={weight}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setWeight(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="0.5"
                style={{caretColor: 'black'}}
              />
            </div>
          </div>


          {/* Цены */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="original-price">Цена до скидки (₽)</label>
              <input
                id="original-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setPrice(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="15000"
                required
                style={{caretColor: 'black'}}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="discount-price">Цена продажи (₽)</label>
              <input
                id="discount-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={discountPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setDiscountPrice(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="9990"
                style={{caretColor: 'black'}}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="cost-price">Себестоимость (₽)</label>
              <input
                id="cost-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setCostPrice(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                className="w-full liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                placeholder="4500"
                style={{caretColor: 'black'}}
              />
            </div>
          </div>

          {/* Артикул и баркод */}
          <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="article">Артикул</label>
              <div className="flex gap-2">
                <input
                  id="article"
                  type="text"
                  value={vendorCode}
                  onChange={(e) => setVendorCode(e.target.value)}
                  className="flex-1 liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black"
                  placeholder="PRDMHANFLNN"
                  style={{caretColor: 'black'}}
                />
                <button
                  type="button"
                  onClick={generateVendorCode}
                  className="flex-shrink-0 flex items-center justify-center px-2 sm:px-3 py-2 bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm font-medium touch-manipulation"
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline ml-1">Генерировать</span>
                </button>
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700" htmlFor="barcode">Баркод (EAN-13)</label>
              <div className="flex gap-2">
                <input
                  id="barcode"
                  type="text"
                  inputMode="numeric"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1 liquid-glass-input shadow-inner-soft border-2 border-purple-200 rounded-lg p-2 sm:p-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm caret-black disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="2230250704733"
                  disabled={hasSizes}
                  style={{caretColor: 'black'}}
                />
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="flex-shrink-0 flex items-center justify-center px-2 sm:px-3 py-2 bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-700 rounded-lg transition-colors duration-200 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  disabled={hasSizes}
                >
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline ml-1">Генерировать</span>
                </button>
              </div>
              {hasSizes && (
                <p className="text-xs text-gray-500">Баркоды указываются для каждого размера отдельно</p>
              )}
            </div>
          </div>

          {/* Размеры товара */}
          {categoryHasSizeCharacteristic && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm font-medium text-text-subtle">
                  <input
                    type="checkbox"
                    checked={hasSizes}
                    onChange={(e) => {
                      setHasSizes(e.target.checked);
                      if (e.target.checked && sizes.length === 0) {
                        setSizes([{ size: '42-54', russianSize: '42', barcode: generateEAN13Barcode() }]);
                      }
                    }}
                    className="mr-2 w-4 h-4 text-primary focus:ring-primary-hover rounded"
                  />
                  Товар имеет размеры
                  <span className="ml-2 text-red-500 font-bold">*</span>
                  <span className="ml-2 text-xs text-red-400">(обязательно для данной категории)</span>
                </label>
              </div>

              {hasSizes && (
                <div className="liquid-glass rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-text-main">Размеры продавца (42-54)</h4>
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить размер
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sizes.map((sizeItem, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={sizeItem.size}
                            onChange={(e) => handleUpdateSize(index, 'size', e.target.value)}
                            placeholder="42-54"
                            className="w-full liquid-glass-input shadow-inner-soft border-none rounded-lg p-2 text-text-main placeholder-text-subtle focus:ring-2 focus:ring-primary-hover transition-all duration-300 text-sm"
                          />
                          <p className="text-xs text-text-subtle mt-1">Размер продавца</p>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={sizeItem.russianSize}
                            onChange={(e) => handleUpdateSize(index, 'russianSize', e.target.value)}
                            placeholder="42"
                            className="w-full liquid-glass-input shadow-inner-soft border-none rounded-lg p-2 text-text-main placeholder-text-subtle focus:ring-2 focus:ring-primary-hover transition-all duration-300 text-sm"
                          />
                          <p className="text-xs text-text-subtle mt-1">Рос. размер</p>
                        </div>
                        <div className="col-span-5">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={sizeItem.barcode}
                              onChange={(e) => handleUpdateSize(index, 'barcode', e.target.value)}
                              placeholder="2045290059169"
                              className="w-full liquid-glass-input shadow-inner-soft border-none rounded-lg p-2 text-text-main placeholder-text-subtle focus:ring-2 focus:ring-primary-hover transition-all duration-300 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleGenerateSizeBarcode(index)}
                              className="flex-shrink-0 px-2 py-1 bg-violet-100 hover:bg-violet-200 text-primary rounded-lg transition-colors"
                              title="Генерировать баркод"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-text-subtle mt-1">Баркод</p>
                        </div>
                        <div className="col-span-2 flex justify-end items-start pt-2">
                          {sizes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSize(index)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                              title="Удалить размер"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-300">
                      💡 <strong>Каждый размер должен иметь уникальный баркод.</strong><br/>
                      📏 Размер продавца: текст или диапазон (например, "42-54", "S-XL")<br/>
                      🇷🇺 Рос. размер: конкретное значение (например, "42", "44", "S", "M")<br/>
                      🔢 Поддерживаются как числовые, так и текстовые значения
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ошибка / Успех */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-900/50 border border-green-500 rounded text-green-200">
              {success}
            </div>
          )}

          <div className="pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={isCreating || !cabinetId}
              className={`w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg shadow-purple-500/40 hover:shadow-purple-600/50 transform active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base ${
                isCreating ? 'animate-pulse' : ''
              }`}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span className="animate-in fade-in duration-300">Создание товара...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Создать товар
                </>
              )}
            </button>
          </div>

          {/* Анимация процесса создания */}
          {isCreating && (
            <div className="mt-4 space-y-3 animate-in slide-up duration-500">
              <div className="liquid-glass rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-text-subtle">Загрузка изображений...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-sm text-text-subtle">AI анализ характеристик...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    <span className="text-sm text-text-subtle">Генерация SEO описания...</span>
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 animate-pulse" style={{width: '100%'}}></div>
                </div>
              </div>
            </div>
          )}
        </form>
          </div>
        </main>
      </div>
      
      {/* Модальное окно успеха */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              {/* Иконка успеха */}
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              
              {/* Заголовок */}
              <h3 className="text-2xl font-bold text-white mb-2">
                Товар успешно опубликован!
              </h3>
              
              {/* Описание */}
              <p className="text-gray-300 mb-6">
                Товар "{productName}" был успешно создан и опубликован на Wildberries
              </p>
              
              {/* Кнопки действий */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    handleClearForm();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Создать новый товар
                </button>
                
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    if (onSuccess) onSuccess();
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Перейти к товарам
                </button>
                
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-transparent hover:bg-gray-700/50 text-gray-300 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

