import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Camera, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Loader,
  AlertCircle,
  Settings,
  Eye,
  Upload,
  Zap,
  RefreshCw,
  Image,
  Trash2,
  X,
  Plus,
  FileText
} from 'lucide-react';

// Импорты компонентов шагов
import Step1BasicInfo from './Step1BasicInfo';
import Step4Results from './Step4Results';

// Типы данных
interface Cabinet {
  id: string;
  name: string;
  apiToken: string;
  isActive: boolean;
  description?: string;
}

interface WBSubcategory {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  parentName: string;
  displayName: string;
  wbSubjectId?: number;
  commissions: {
    fbw: number;
    fbs: number;
    dbs: number;
    cc: number;
    edbs: number;
    booking: number;
  };
}

interface ProductFormData {
  name: string;
  originalPrice: string;
  discountPrice: string;
  costPrice?: string;
  packageContents: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  referenceUrl: string;
  cabinetId: string;
  vendorCode: string;
  autoGenerateVendorCode: boolean;
  barcode: string;
  hasVariantSizes: boolean;
  variantSizes: string[];
  description?: string;
  mainImage: File | null;
  additionalImages: File[];
  imageComments: string;
}

interface ProcessingStatus {
  stage: 'uploading' | 'processing' | 'ai-analysis' | 'wb-creation' | 'completed' | 'error';
  message: string;
  progress: number;
  details?: string;
  currentStep?: string;
  totalSteps?: number;
  timeElapsed?: number;
}

interface ProductFormProps {
  onSuccess?: () => void;
}

// Начальное состояние формы
const initialFormData: ProductFormData = {
  name: '',
  originalPrice: '',
  discountPrice: '',
  costPrice: '',
  packageContents: 'Товар - 1 шт., упаковка - 1 шт.',
  length: '',
  width: '',
  height: '',
  weight: '',
  referenceUrl: '',
  cabinetId: '',
  vendorCode: '',
  autoGenerateVendorCode: true,
  barcode: '',
  hasVariantSizes: false,
  variantSizes: [],
  description: '',
  mainImage: null,
  additionalImages: [],
  imageComments: ''
};

// Генерация EAN-13 штрихкода
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

export default function ProductForm({ onSuccess }: ProductFormProps): JSX.Element {
  // Состояния
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<WBSubcategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingCabinets, setIsLoadingCabinets] = useState(false);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);
  const [createdProductId, setCreatedProductId] = useState<string>('');
  
  // useRef для хранения интервала polling
  const aiAnalysisPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка кабинетов при монтировании
  useEffect(() => {
    console.log('🚀 Инициализация ProductForm');
    loadCabinets();
  }, []);

  // Очистка интервалов при размонтировании
  useEffect(() => {
    return () => {
      if (aiAnalysisPollingIntervalRef.current) {
        clearInterval(aiAnalysisPollingIntervalRef.current);
        aiAnalysisPollingIntervalRef.current = null;
      }
    };
  }, []);

  // Автогенерация кодов
  useEffect(() => {
    if (formData.autoGenerateVendorCode && formData.name.trim()) {
      generateVendorCode();
      generateBarcode();
    }
  }, [formData.autoGenerateVendorCode, formData.name]);

  // Проверяем статус AI-анализа при загрузке, если товар уже создан (только один раз)
  useEffect(() => {
    if (createdProductId && aiAnalysisStatus === 'pending') {
      console.log('🔄 Проверяем статус при загрузке для товара:', createdProductId);
      checkAiAnalysisStatus(createdProductId);
    }
  }, [createdProductId]); // Убираем aiAnalysisStatus из зависимостей

  // Принудительно обновляем статус при изменении aiAnalysisStatus
  useEffect(() => {
    if (aiAnalysisStatus === 'completed' && processingStatus && processingStatus.stage !== 'completed') {
      console.log('🔄 Обновляем processingStatus после завершения ИИ-анализа');
      setProcessingStatus({
        stage: 'completed',
        message: 'AI-анализ завершен успешно!',
        progress: 100,
        details: `Товар проанализирован. ID: ${createdProductId}`,
        currentStep: 'Завершено',
        totalSteps: 4
      });
    }
  }, [aiAnalysisStatus, processingStatus, createdProductId]);

  const loadCabinets = async () => {
    console.log('📦 Загрузка кабинетов...');
    setIsLoadingCabinets(true);
    
    try {
      const response = await fetch('/api/cabinets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      console.log('📡 Статус ответа API кабинетов:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Данные от API:', data);
        
        if (data.success && Array.isArray(data.cabinets)) {
          const activeCabinets = data.cabinets.filter((c: Cabinet) => c.isActive);
          setCabinets(activeCabinets);
          console.log('✅ Загружено активных кабинетов:', activeCabinets.length);
          
          // Автовыбор первого кабинета
          if (activeCabinets.length > 0 && !formData.cabinetId) {
            setFormData(prev => ({ ...prev, cabinetId: activeCabinets[0].id }));
            console.log('🎯 Автовыбран кабинет:', activeCabinets[0].name);
          }
          
          setError('');
          return;
        } else {
          console.log('⚠️ API не вернул кабинеты или вернул неверный формат');
          setCabinets([]);
          setError('');
        }
      } else {
        console.log('⚠️ API вернул ошибку:', response.status);
        setCabinets([]);
        setError('');
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки кабинетов:', error);
      setCabinets([]);
      setError('');
    } finally {
      setIsLoadingCabinets(false);
    }
  };

  const generateVendorCode = () => {
    const productPrefix = formData.name ? formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD' : 'PRD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const newVendorCode = `${productPrefix}${timestamp}${random}`.substring(0, 13);
    setFormData(prev => ({ ...prev, vendorCode: newVendorCode }));
    return newVendorCode;
  };

  const generateBarcode = () => {
    const newBarcode = generateEAN13Barcode();
    setFormData(prev => ({ ...prev, barcode: newBarcode }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Очищаем сообщения при изменении данных
    setError('');
    setSuccess('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Поддерживаются только форматы: JPEG, PNG, WebP');
        return;
      }
      
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        setError('Размер файла не должен превышать 5MB');
        return;
      }

      setSelectedImage(file);
      setFormData(prev => ({ ...prev, mainImage: file }));
      setError('');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      
      // Проверяем каждый файл
      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`Файл ${file.name} имеет неподдерживаемый формат. Поддерживаются только: JPEG, PNG, WebP`);
          return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
          setError(`Файл ${file.name} слишком большой. Максимальный размер: 5MB`);
          return;
        }
      }

      // Добавляем новые изображения к существующим
      setFormData(prev => ({ 
        ...prev, 
        additionalImages: [...prev.additionalImages, ...files] 
      }));
      
      // Обновляем превью дополнительных изображений
      const newPreviews = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(newPreviews).then(previews => {
        setAdditionalImagePreviews(prev => [...prev, ...previews]);
      });

      setError('');
    }
  };

  const removeAdditionalImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index)
    }));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const checkAiAnalysisStatus = async (productId: string) => {
    try {
      console.log('🔍 Проверяем статус товара:', productId);
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        const product = data?.product || data; // поддержка обоих форматов на всякий случай
        console.log('📊 Статус товара:', product.status);
        console.log('🤖 Характеристики (массив):', Array.isArray(product.characteristics) ? product.characteristics.length : 0);
        console.log('📝 Полные данные товара:', product);
        
        // Проверяем статус и наличие AI-характеристик
        if (product.status === 'READY' || (Array.isArray(product.characteristics) && product.characteristics.length > 0)) {
          console.log('✅ Товар готов или имеет AI-характеристики');
          setAiAnalysisStatus('completed');
          // Обновляем processingStatus при завершении ИИ-анализа
          setProcessingStatus({
            stage: 'completed',
            message: 'AI-анализ завершен успешно!',
            progress: 100,
            details: `Товар проанализирован. ID: ${productId}`,
            currentStep: 'Завершено',
            totalSteps: 4
          });
          // Сохраняем AI-данные для отображения
          if (Array.isArray(product.characteristics) && product.characteristics.length > 0) {
            console.log('💾 Сохраняем характеристики из API:', product.characteristics.length);
            setAiAnalysisData({
              generatedName: product.generatedName || formData.name,
              seoDescription: product.seoDescription || '',
              characteristics: product.characteristics,
              qualityScore: product.aiAnalysis?.qualityScore || 85
            });
          } else if (product.generatedName || product.seoDescription) {
            // Если нет aiCharacteristics, но есть другие AI-данные
            console.log('💾 Сохраняем альтернативные AI-данные');
            setAiAnalysisData({
              generatedName: product.generatedName,
              seoDescription: product.seoDescription,
              characteristics: product.characteristics || [],
              qualityScore: product.aiAnalysis?.qualityScore || 85
            });
          }
          return true;
        } else if (product.status === 'DRAFT') {
          console.log('📝 Товар в статусе DRAFT');
          // Проверяем, есть ли ошибка AI-анализа
          if (product.errorMessage && product.errorMessage.includes('AI')) {
            console.log('❌ Ошибка AI-анализа:', product.errorMessage);
            setAiAnalysisStatus('failed');
            return false;
          } else {
            console.log('⏳ AI-анализ еще в процессе');
            // Товар создан, но AI-анализ еще в процессе
            setAiAnalysisStatus('processing');
            return false;
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка проверки статуса AI-анализа:', error);
      setAiAnalysisStatus('failed');
    }
    return false;
  };

  // Функция для периодической проверки статуса AI-анализа
  const startAiAnalysisPolling = (productId: string) => {
    console.log('🚀 Запуск polling для товара:', productId);
    
    // Очищаем предыдущий интервал, если он существует
    if (aiAnalysisPollingIntervalRef.current) {
      clearInterval(aiAnalysisPollingIntervalRef.current);
    }
    
    const interval = setInterval(async () => {
      console.log('🔍 Проверяем статус AI-анализа для товара:', productId);
      const isCompleted = await checkAiAnalysisStatus(productId);
      if (isCompleted) {
        console.log('✅ AI-анализ завершен для товара:', productId);
        clearInterval(interval);
        aiAnalysisPollingIntervalRef.current = null;
        // Принудительно обновляем статус AI-анализа
        setAiAnalysisStatus('completed');
        // processingStatus уже обновлен в checkAiAnalysisStatus
      } else {
        console.log('⏳ AI-анализ еще в процессе для товара:', productId);
        // Обновляем статус загрузки характеристик только если еще не завершен
        if (aiAnalysisStatus !== 'completed') {
          setProcessingStatus({
            stage: 'ai-analysis',
            message: 'AI-анализ в процессе...',
            progress: 80,
            details: 'ИИ анализирует товар и создает характеристики...',
            currentStep: 'AI-анализ',
            totalSteps: 4
          });
        }
      }
    }, 10000); // Проверяем каждые 5 секунд

    // Сохраняем ссылку на интервал
    aiAnalysisPollingIntervalRef.current = interval;

    // Останавливаем проверку через 5 минут
    setTimeout(() => {
      console.log('⏰ Таймаут polling для товара:', productId);
      if (aiAnalysisPollingIntervalRef.current === interval) {
        clearInterval(interval);
        aiAnalysisPollingIntervalRef.current = null;
        if (aiAnalysisStatus === 'processing') {
          setAiAnalysisStatus('failed');
        }
      }
    }, 300000);
  };

  // Функция для публикации товара на Wildberries
  const publishToWildberries = async (productId: string) => {
    try {
      setProcessingStatus({
        stage: 'wb-creation',
        message: 'Публикуем товар на Wildberries...',
        progress: 90,
        details: 'Отправляем данные на Wildberries...',
        currentStep: 'Публикация на WB',
        totalSteps: 4
      });

      const response = await fetch(`/api/products/${productId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setProcessingStatus({
          stage: 'completed',
          message: 'Товар успешно опубликован на Wildberries!',
          progress: 100,
          details: `ID товара на WB: ${result.wbProductId || 'N/A'}`,
          currentStep: 'Завершено',
          totalSteps: 4
        });
        
        setSuccess(`Товар "${formData.name}" успешно опубликован на Wildberries!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка публикации на Wildberries');
      }
    } catch (error: any) {
      console.error('❌ Ошибка публикации на Wildberries:', error);
      
      setProcessingStatus({
        stage: 'error',
        message: 'Ошибка публикации на Wildberries',
        progress: 0,
        details: error.message || 'Неизвестная ошибка',
        currentStep: 'Ошибка',
        totalSteps: 4
      });

      setError(error.message || 'Произошла ошибка при публикации на Wildberries');
    }
  };

  const validateStep = (step: number): boolean => {
    setError('');
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Введите название товара');
          return false;
        }
        if (!selectedCategory) {
          setError('Выберите категорию товара');
          return false;
        }
        if (!formData.originalPrice || parseFloat(formData.originalPrice) <= 0) {
          setError('Введите корректную цену товара');
          return false;
        }
        break;
        
      case 2:
        if (!selectedImage) {
          setError('Выберите основное изображение товара');
          return false;
        }
        break;
        
      case 3:
        if (!formData.length || !formData.width || !formData.height || !formData.weight) {
          setError('Заполните все габариты товара');
          return false;
        }
        if (!formData.cabinetId) {
          setError('Выберите кабинет для публикации');
          return false;
        }
        break;
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      // Очищаем сообщения при переходе на следующий шаг
      setError('');
      setSuccess('');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    // Очищаем сообщения при переходе на предыдущий шаг
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Статус загрузки
      setProcessingStatus({
        stage: 'uploading',
        message: 'Загружаем изображения и создаем товар...',
        progress: 10,
        details: 'Подготавливаем данные для отправки на сервер...',
        currentStep: 'Подготовка данных',
        totalSteps: 4
      });

      // Подготавливаем FormData для отправки
      const formDataToSend = new FormData();
      
      // Основные данные
      formDataToSend.append('name', formData.name);
      formDataToSend.append('originalPrice', formData.originalPrice);
      formDataToSend.append('discountPrice', formData.discountPrice);
      formDataToSend.append('costPrice', formData.costPrice || '');
      formDataToSend.append('packageContents', formData.packageContents);
      
      // Размеры передаем в одном поле dimensions (как ожидает API)
      const dimensions = {
        length: parseFloat(formData.length),
        width: parseFloat(formData.width),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight)
      };
      formDataToSend.append('dimensions', JSON.stringify(dimensions));
      
      formDataToSend.append('referenceUrl', formData.referenceUrl);
      formDataToSend.append('cabinetId', formData.cabinetId);
      formDataToSend.append('vendorCode', formData.vendorCode);
      formDataToSend.append('autoGenerateVendorCode', formData.autoGenerateVendorCode.toString());
      formDataToSend.append('barcode', formData.barcode);
      formDataToSend.append('hasVariantSizes', formData.hasVariantSizes.toString());
      formDataToSend.append('variantSizes', JSON.stringify(formData.variantSizes));
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('imageComments', formData.imageComments || '');

      // Категория
      if (selectedCategory) {
        formDataToSend.append('categoryId', selectedCategory.id.toString());
        formDataToSend.append('categoryName', selectedCategory.name);
        formDataToSend.append('parentCategoryName', selectedCategory.parentName);
      }

      // Изображения
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      // Дополнительные изображения
      if (formData.additionalImages.length > 0) {
        formDataToSend.append('additionalImagesCount', formData.additionalImages.length.toString());
        formData.additionalImages.forEach((image, index) => {
          formDataToSend.append(`additionalImage${index}`, image);
        });
      }

      // Отправляем запрос на создание продукта
      setProcessingStatus({
        stage: 'processing',
        message: 'Создаем товар в базе данных...',
        progress: 30,
        details: 'Сохраняем основную информацию...',
        currentStep: 'Создание товара',
        totalSteps: 4
      });

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

              if (result.success) {
          // Сохраняем ID созданного товара
          setCreatedProductId(result.productId);
          
          // Проверяем, был ли AI-анализ успешным
          if (result.data?.aiAnalysisStatus === 'completed' || result.data?.status === 'READY') {
            // AI-анализ завершен успешно
            setProcessingStatus({
              stage: 'completed',
              message: 'Товар успешно создан и проанализирован!',
              progress: 100,
              details: `ID товара: ${result.productId}. AI-анализ завершен.`,
              currentStep: 'Завершено',
              totalSteps: 4
            });
            
            setAiAnalysisStatus('completed');
            setSuccess(`Товар "${formData.name}" успешно создан и проанализирован ИИ! ID: ${result.productId}`);
            setCurrentStep(4);
            setIsSubmitting(false);
            
            if (onSuccess) {
              onSuccess();
            }
          } else {
            // AI-анализ не завершен или упал
            setProcessingStatus({
              stage: 'ai-analysis',
              message: 'AI-анализ в процессе...',
              progress: 80,
              details: 'ИИ анализирует товар и создает характеристики...',
              currentStep: 'AI-анализ',
              totalSteps: 4
            });

            // Запускаем периодическую проверку статуса AI-анализа
            startAiAnalysisPolling(result.productId);
            
            setSuccess(`Товар "${formData.name}" создан! ID: ${result.productId}. AI-анализ в процессе...`);
            setCurrentStep(4);
            setIsSubmitting(false);
            
            if (onSuccess) {
              onSuccess();
            }
          }
        } else {
          throw new Error(result.error || 'Неизвестная ошибка');
        }

    } catch (error: any) {
      console.error('❌ Ошибка создания товара:', error);
      
      setProcessingStatus({
        stage: 'error',
        message: 'Ошибка создания товара',
        progress: 0,
        details: error.message || 'Неизвестная ошибка',
        currentStep: 'Ошибка',
        totalSteps: 4
      });

      setError(error.message || 'Произошла ошибка при создании товара');
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setFormData(initialFormData);
    setSelectedImage(null);
    setImagePreview('');
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);
    setSelectedCategory(null);
    setError('');
    setSuccess('');
    setProcessingStatus(null);
    setAiAnalysisStatus('pending');
    setAiAnalysisData(null);
    setCreatedProductId('');
    setCurrentStep(1);
    
    // Очищаем все интервалы polling
    if (aiAnalysisPollingIntervalRef.current) {
      clearInterval(aiAnalysisPollingIntervalRef.current);
      aiAnalysisPollingIntervalRef.current = null;
    }
    
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => {
      input.value = '';
    });
  };

  const handleCategorySelect = (category: WBSubcategory | null) => {
    console.log('🔍 [Form] Выбрана категория:', {
      id: category?.id,
      name: category?.name,
      parentName: category?.parentName,
      wbSubjectId: category?.wbSubjectId,
      displayName: category?.displayName
    });
    
    setSelectedCategory(category);
  };

  const handleVariantSizeChange = (size: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      variantSizes: checked 
        ? [...prev.variantSizes, size]
        : prev.variantSizes.filter(s => s !== size)
    }));
  };

  const getSizeOptionsForCategory = (): string[] => {
    if (!selectedCategory) return [];
    
    const categoryName = selectedCategory.name.toLowerCase();
    const parentName = selectedCategory.parentName.toLowerCase();
    const fullText = `${categoryName} ${parentName}`;
    
    if (fullText.includes('обувь') || fullText.includes('кроссовки') || 
        fullText.includes('ботинки') || fullText.includes('туфли')) {
      return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
    }
    
    if (fullText.includes('детская') || fullText.includes('детский')) {
      return ['80-86', '86-92', '98-104', '110-116', '122-128', '134-140', '146-152', '158-164'];
    }
    
    if (fullText.includes('мужская') || fullText.includes('мужской')) {
      return ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', '48', '50', '52', '54', '56', '58', '60'];
    }
    
    if (fullText.includes('женская') || fullText.includes('женский')) {
      return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '40', '42', '44', '46', '48', '50', '52'];
    }
    
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'uploading': return 'bg-blue-600';
      case 'processing': return 'bg-purple-600';
      case 'ai-analysis': return 'bg-indigo-600';
      case 'wb-creation': return 'bg-orange-600';
      case 'completed': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4].map((step, index) => (
        <React.Fragment key={step}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-500 ${
            step <= currentStep
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transform scale-110'
              : 'bg-gray-700 text-gray-400'
          } ${step === currentStep ? 'animate-pulse shadow-xl' : ''}`}>
            {step === 1 && <Package className="w-5 h-5" />}
            {step === 2 && <Camera className="w-5 h-5" />}
            {step === 3 && <Settings className="w-5 h-5" />}
            {step === 4 && <Eye className="w-5 h-5" />}
          </div>
          {index < 3 && (
            <div className={`w-12 h-1 mx-2 transition-all duration-500 ${
              step < currentStep 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                : 'bg-gray-700'
            } ${step === currentStep - 1 ? 'animate-pulse' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Расчет процента скидки
  const discountPercent = formData.originalPrice && formData.discountPrice ? 
    Math.round((1 - parseFloat(formData.discountPrice) / parseFloat(formData.originalPrice)) * 100) : undefined;

  return (
    <div className="min-h-screen py-4 fade-in">
      <div className="max-w-3xl mx-auto px-4">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-3">
            Создание товара на Wildberries
          </h1>
          <p className="text-base text-gray-300 max-w-xl mx-auto">
            ИИ-ассистент поможет создать профессиональную карточку товара с автоматическим заполнением характеристик
          </p>
        </div>

        {renderStepIndicator()}
        
        {/* Статусы обработки */}
        {processingStatus && (
          <div className="mb-4 glass-container p-4 scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-1.5 rounded-full ${getStageColor(processingStatus.stage)}`}>
                {processingStatus.stage === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : processingStatus.stage === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-white" />
                ) : (
                  <Loader className="w-4 h-4 text-white animate-spin" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">{processingStatus.message}</h3>
                {processingStatus.details && (
                  <p className="text-sm text-gray-300 mt-1">{processingStatus.details}</p>
                )}
              </div>
            </div>
            
            {/* Прогресс бар */}
            <div className="progress-bar mb-3">
              <div 
                className="progress-fill"
                style={{ width: `${processingStatus.progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>{processingStatus.progress}% завершено</span>
              {processingStatus.currentStep && (
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  {processingStatus.currentStep}
                </span>
              )}
            </div>
            
            {/* Дополнительная информация о статусе ИИ-анализа */}
            {aiAnalysisStatus === 'completed' && processingStatus.stage !== 'completed' && (
              <div className="mt-3 p-2 bg-green-900/30 border border-green-600/50 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ ИИ-анализ завершен! Обновляем интерфейс...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Основная форма */}
        <div className="glass-container p-6 transition-all duration-500">
          <div className="space-y-4">
            {currentStep === 1 && (
              <Step1BasicInfo
                formData={formData}
                selectedCategory={selectedCategory}
                cabinets={cabinets}
                onInputChange={handleInputChange}
                onCategorySelect={handleCategorySelect}
                onVariantSizeChange={handleVariantSizeChange}
                getSizeOptionsForCategory={getSizeOptionsForCategory}
                discountPercent={discountPercent}
                generateVendorCode={generateVendorCode}
                isLoadingCabinets={isLoadingCabinets}
              />
            )}
            
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Изображения товара</h2>
                  <p className="text-gray-300">Загрузите качественные фотографии товара для лучшего анализа ИИ</p>
                </div>
                
                {/* Основное изображение */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    Основное изображение *
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      onChange={handleImageChange}
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      id="main-image"
                    />
                    <label htmlFor="main-image" className="cursor-pointer">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img 
                            src={imagePreview} 
                            alt="Превью" 
                            className="max-w-xs mx-auto rounded-lg shadow-lg"
                          />
                          <p className="text-green-400">Изображение загружено</p>
                          <p className="text-gray-400 text-sm">Нажмите для замены</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Upload className="w-12 h-12 mx-auto text-gray-400" />
                          <div>
                            <p className="text-gray-300">Нажмите для загрузки изображения</p>
                            <p className="text-gray-500 text-sm">JPEG, PNG, WebP до 5MB</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Дополнительные изображения */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-lg font-semibold text-white flex items-center gap-2">
                      <Image className="w-5 h-5 text-blue-400" />
                      Дополнительные изображения
                    </label>
                    
                    {formData.additionalImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, additionalImages: [] }));
                          setAdditionalImagePreviews([]);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 font-medium flex items-center gap-2 backdrop-blur-sm border border-red-500/50 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Очистить все
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {additionalImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Дополнительное изображение ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-blue-500/30 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl transform hover:scale-110 backdrop-blur-sm border border-red-500/50 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    {formData.additionalImages.length < 9 && (
                      <div className="w-full h-32 border-2 border-dashed border-blue-500/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-300 bg-black/40 backdrop-blur-md">
                        <Plus className="w-6 h-6 text-gray-400 mb-2" />
                        <p className="text-xs text-gray-300 text-center">Добавить фото</p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAdditionalImagesChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  
                  {formData.additionalImages.length === 9 && (
                    <div className="px-3 py-2 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                      <p className="text-blue-400 text-xs text-center">
                        Достигнут лимит дополнительных изображений (9)
                      </p>
                    </div>
                  )}

                  <p className="text-gray-400 text-xs px-2">
                    Дополнительные изображения помогут ИИ лучше проанализировать товар и создать качественные характеристики
                  </p>
                </div>

                {/* Комментарии к изображениям */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Комментарии к изображениям
                  </label>
                  <textarea
                    name="imageComments"
                    value={formData.imageComments}
                    onChange={handleInputChange}
                    rows={3}
                    className="glass-input w-full text-base"
                    placeholder="Опишите особенности изображений, которые помогут ИИ лучше проанализировать товар..."
                  />
                  <p className="text-gray-400 text-xs px-2">
                    Например: "Товар показан с разных ракурсов", "Особое внимание к деталям", "Показан в упаковке"
                  </p>
                </div>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Финальные настройки</h2>
                  <p className="text-gray-300">Проверьте все данные перед созданием</p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Сводка товара:</h3>
                  <div className="glass-container p-4 space-y-2">
                    <p className="text-white"><span className="text-gray-400">Название:</span> {formData.name}</p>
                    <p className="text-white"><span className="text-gray-400">Категория:</span> {selectedCategory?.displayName}</p>
                    <p className="text-white"><span className="text-gray-400">Цена:</span> {formData.originalPrice} ₽</p>
                    <p className="text-white"><span className="text-gray-400">Себестоимость:</span> {formData.costPrice ? `${formData.costPrice} ₽` : 'Не указана'}</p>
                    <p className="text-white"><span className="text-gray-400">Кабинет:</span> {cabinets.find(c => c.id === formData.cabinetId)?.name}</p>
                    <p className="text-white"><span className="text-gray-400">Главное изображение:</span> {selectedImage ? 'Загружено' : 'Не выбрано'}</p>
                    <p className="text-white"><span className="text-gray-400">Дополнительных фото:</span> {formData.additionalImages.length}</p>
                    <p className="text-white"><span className="text-gray-400">Габариты:</span> {formData.length}×{formData.width}×{formData.height} см, {formData.weight} кг</p>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 4 && (
              <>
                {console.log('🔍 [ProductForm] Рендерим Step4Results:', {
                  createdProductId,
                  aiAnalysisData,
                  characteristicsCount: aiAnalysisData?.characteristics?.length || 0,
                  aiAnalysisStatus
                })}
                <Step4Results
                  createdProductId={createdProductId}
                aiResponse={{
                  generatedName: aiAnalysisData?.generatedName || formData.name,
                  category: selectedCategory,
                  seoDescription: aiAnalysisData?.seoDescription || '',
                  characteristics: aiAnalysisData?.characteristics || [],
                  qualityScore: aiAnalysisData?.qualityScore || 85
                }}
                aiCharacteristics={aiAnalysisData?.characteristics || []}
                allCategoryCharacteristics={[]}
                isLoadingCharacteristics={aiAnalysisStatus === 'processing'}
                editingCharacteristics={{}}
                // Добавляем логирование для отладки
                key={`step4-${createdProductId}-${aiAnalysisData?.characteristics?.length || 0}`}
                onUpdateProductField={(field, value) => {
                  if (field === 'name') {
                    setFormData(prev => ({ ...prev, name: value }));
                  } else if (field === 'description') {
                    setFormData(prev => ({ ...prev, description: value }));
                  }
                }}
                onUpdateCharacteristic={(characteristicId, newValue) => {
                  if (aiAnalysisData?.characteristics) {
                    const updatedCharacteristics = aiAnalysisData.characteristics.map((char: any) =>
                      char.id === characteristicId ? { ...char, value: newValue } : char
                    );
                    setAiAnalysisData({
                      ...aiAnalysisData,
                      characteristics: updatedCharacteristics
                    });
                  }
                }}
                onDeleteCharacteristic={(characteristicId) => {
                  if (aiAnalysisData?.characteristics) {
                    const updatedCharacteristics = aiAnalysisData.characteristics.filter((char: any) =>
                      char.id !== characteristicId
                    );
                    setAiAnalysisData({
                      ...aiAnalysisData,
                      characteristics: updatedCharacteristics
                    });
                  }
                }}
                onAddNewCharacteristic={(characteristicId, value) => {
                  // Добавление новой характеристики
                }}
                onToggleEditCharacteristic={(characteristicId) => {
                  // Переключение режима редактирования
                }}
                onPublish={() => {
                  if (createdProductId) {
                    publishToWildberries(createdProductId);
                  }
                }}
                onCreateInfographic={() => {
                  // Создание инфографики
                }}
                onClearForm={clearForm}
                onLoadProductCharacteristics={(productId) => {
                  checkAiAnalysisStatus(productId);
                }}
                />
              </>
            )}
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="glass-container p-4 mt-6 border border-red-500/50 bg-red-500/10 scale-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Успех */}
        {success && (
          <div className="glass-container p-4 mt-6 border border-green-500/10 scale-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">{success}</span>
            </div>
            
            {/* Статус AI-анализа */}
            {aiAnalysisStatus === 'pending' && (
              <div className="mt-3 px-3 py-2 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                <p className="text-blue-400 text-sm">
                  ⏳ Ожидание AI-анализа...
                </p>
              </div>
            )}
            
            {aiAnalysisStatus === 'processing' && (
              <div className="mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  🔄 AI-анализ в процессе...
                </p>
              </div>
            )}
            
            {aiAnalysisStatus === 'completed' && (
              <div className="mt-3 px-3 py-2 bg-green-900/30 border border-green-600/50 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ AI-анализ завершен успешно!
                </p>
              </div>
            )}
            
            {aiAnalysisStatus === 'failed' && (
              <div className="mt-3 px-3 py-2 bg-red-900/30 border border-red-600/50 rounded-lg">
                <p className="text-red-400 text-sm">
                  ❌ AI-анализ не удался. Товар создан в базовом режиме.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Навигация */}
        {currentStep < 4 && !isSubmitting && (
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`glass-button ${
                currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
            
            {currentStep === 3 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="glass-button-primary"
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner w-4 h-4"></div>
                    Создание товара...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Создать товар
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="glass-button-primary"
              >
                Далее
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};