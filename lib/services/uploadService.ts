// lib/services/uploadService.ts - ИСПРАВЛЕННЫЙ СЕРВИС ЗАГРУЗКИ БЕЗ ДУБЛИРОВАНИЯ

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface FileInfo {
  exists: boolean;
  size?: number;
  type?: string;
  lastModified?: Date;
}

export interface BatchUploadResult {
  successful: string[];
  failed: Array<{ file: string; error: string }>;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
}

export interface UploadSettings {
  maxFileSize: number;
  maxFileSizeFormatted: string;
  allowedTypes: string[];
  allowedExtensions: string[];
}

export class UploadService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];

  /**
   * Загрузка файла с валидацией и безопасной обработкой
   */
  async uploadFile(file: File): Promise<string> {
    try {
      console.log('📤 Загружаем файл:', file.name, `(${this.formatFileSize(file.size)})`);
      
      // Валидация файла
      this.validateFile(file);
      
      // В браузерном окружении конвертируем в data URL
      if (typeof window !== 'undefined') {
        const dataUrl = await this.convertToDataUrlBrowser(file);
        console.log('✅ Файл успешно обработан (браузер)');
        return dataUrl;
      }
      
      // В серверном окружении (Node.js)
      const dataUrl = await this.convertToDataUrlServer(file);
      console.log('✅ Файл успешно обработан (сервер)');
      return dataUrl;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки файла:', error);
      throw new Error(`Не удалось загрузить файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Валидация загружаемого файла
   */
  private validateFile(file: File): void {
    // Проверка размера
    if (file.size > this.maxFileSize) {
      throw new Error(`Файл слишком большой. Максимальный размер: ${this.formatFileSize(this.maxFileSize)}`);
    }

    // Проверка типа
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`Неподдерживаемый тип файла. Разрешены: ${this.allowedTypes.join(', ')}`);
    }

    // Проверка расширения файла (дополнительная безопасность)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(`Неподдерживаемое расширение файла: ${fileExtension}`);
    }

    console.log('✅ Файл прошел валидацию');
  }

  /**
   * Конвертация файла в data URL в браузере
   */
  private async convertToDataUrlBrowser(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Конвертация файла в data URL на сервере
   */
  private async convertToDataUrlServer(file: File): Promise<string> {
    try {
      // Проверяем, что Buffer доступен (серверное окружение)
      if (typeof Buffer === 'undefined') {
        throw new Error('Buffer недоступен - используйте браузерный метод');
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      return `data:${file.type};base64,${base64}`;
    } catch (error) {
      console.error('Ошибка серверной конвертации:', error);
      // Fallback на браузерный метод
      return this.convertToDataUrlBrowser(file);
    }
  }

  /**
   * Форматирование размера файла для отображения
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Удаление файла (заглушка для data URLs)
   */
  async deleteFile(url: string): Promise<boolean> {
    try {
      console.log('🗑️ Удаляем файл:', url.substring(0, 50) + '...');
      
      // Для data URLs ничего не нужно делать
      if (url.startsWith('data:')) {
        console.log('✅ Data URL помечен для удаления');
        return true;
      }
      
      // Для реальных URLs можно добавить логику удаления
      console.log('⚠️ Удаление внешних URL не реализовано');
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка удаления файла:', error);
      return false;
    }
  }

  /**
   * Получение информации о файле по URL
   */
  async getFileInfo(url: string): Promise<FileInfo> {
    try {
      // Для data URLs
      if (url.startsWith('data:')) {
        const mimeMatch = url.match(/^data:([^;]+)/);
        const base64Data = url.split(',')[1];
        
        return {
          exists: true,
          type: mimeMatch ? mimeMatch[1] : 'unknown',
          size: base64Data ? Math.floor(base64Data.length * 0.75) : 0 // Примерный размер
        };
      }

      // Для обычных URLs
      try {
        const response = await fetch(url, { method: 'HEAD' });
        
        if (!response.ok) {
          return { exists: false };
        }

        return {
          exists: true,
          size: parseInt(response.headers.get('content-length') || '0'),
          type: response.headers.get('content-type') || 'unknown',
          lastModified: response.headers.get('last-modified') 
            ? new Date(response.headers.get('last-modified')!) 
            : undefined
        };
      } catch (fetchError) {
        return { exists: false };
      }

    } catch (error) {
      console.warn('⚠️ Не удалось получить информацию о файле:', error);
      return { exists: false };
    }
  }

  /**
   * Массовая загрузка файлов
   */
  async uploadMultipleFiles(files: FileList | File[]): Promise<BatchUploadResult> {
    const successful: string[] = [];
    const failed: Array<{ file: string; error: string }> = [];

    const fileArray = Array.from(files);
    
    console.log(`📤 Загружаем ${fileArray.length} файлов...`);

    for (const file of fileArray) {
      try {
        const url = await this.uploadFile(file);
        successful.push(url);
        console.log(`✅ ${file.name} загружен успешно`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        failed.push({ file: file.name, error: errorMessage });
        console.error(`❌ ${file.name} не загружен:`, errorMessage);
      }
    }

    console.log(`📊 Результат загрузки: ${successful.length} успешно, ${failed.length} с ошибками`);

    return { successful, failed };
  }

  /**
   * Проверка доступности сервиса загрузки
   */
  async checkServiceHealth(): Promise<ServiceHealth> {
    try {
      // Проверяем базовую функциональность
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      // Пытаемся создать data URL
      const dataUrl = await this.convertToDataUrlBrowser(testFile);
      
      if (dataUrl.startsWith('data:')) {
        return {
          status: 'healthy',
          message: 'Сервис загрузки работает нормально'
        };
      } else {
        return {
          status: 'degraded',
          message: 'Сервис работает с ограничениями'
        };
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Сервис недоступен: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  }

  /**
   * Получение настроек загрузки
   */
  getUploadSettings(): UploadSettings {
    return {
      maxFileSize: this.maxFileSize,
      maxFileSizeFormatted: this.formatFileSize(this.maxFileSize),
      allowedTypes: this.allowedTypes,
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    };
  }

  /**
   * Компрессия изображения (только в браузере)
   */
  async compressImage(file: File, quality: number = 0.8): Promise<File> {
    // Проверяем, что мы в браузере
    if (typeof document === 'undefined') {
      console.warn('⚠️ Компрессия изображений доступна только в браузере');
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Вычисляем новые размеры (максимум 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Рисуем сжатое изображение
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Не удалось сжать изображение'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Не удалось загрузить изображение для сжатия'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Создание превью изображения
   */
  async createPreview(file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<string> {
    if (typeof document === 'undefined') {
      // В серверном окружении возвращаем оригинальный data URL
      return this.uploadFile(file);
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Вычисляем размеры превью с сохранением пропорций
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        
        width *= ratio;
        height *= ratio;

        canvas.width = width;
        canvas.height = height;

        // Рисуем превью
        ctx?.drawImage(img, 0, 0, width, height);

        // Конвертируем в data URL
        const previewDataUrl = canvas.toDataURL(file.type, 0.8);
        resolve(previewDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Не удалось создать превью изображения'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Валидация изображения по размерам
   */
  async validateImageDimensions(file: File, minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<boolean> {
    if (typeof document === 'undefined') {
      console.warn('⚠️ Валидация размеров изображения доступна только в браузере');
      return true;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        
        if (minWidth && width < minWidth) {
          reject(new Error(`Ширина изображения должна быть не менее ${minWidth}px (текущая: ${width}px)`));
          return;
        }
        
        if (minHeight && height < minHeight) {
          reject(new Error(`Высота изображения должна быть не менее ${minHeight}px (текущая: ${height}px)`));
          return;
        }
        
        if (maxWidth && width > maxWidth) {
          reject(new Error(`Ширина изображения должна быть не более ${maxWidth}px (текущая: ${width}px)`));
          return;
        }
        
        if (maxHeight && height > maxHeight) {
          reject(new Error(`Высота изображения должна быть не более ${maxHeight}px (текущая: ${height}px)`));
          return;
        }
        
        resolve(true);
      };

      img.onerror = () => {
        reject(new Error('Не удалось загрузить изображение для валидации'));
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

// Экспортируем единственный экземпляр сервиса
export const uploadService = new UploadService();