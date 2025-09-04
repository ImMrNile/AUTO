export class ImageProcessingService {
  /**
   * Изменяет размер изображения до нужного формата 900x1200
   */
  static async resizeImage(imageUrl: string, targetWidth: number = 900, targetHeight: number = 1200): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Вычисляем пропорции для правильного кропа
        const sourceAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;
        
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        
        if (sourceAspect > targetAspect) {
          // Изображение шире целевого - обрезаем по ширине
          sw = img.height * targetAspect;
          sx = (img.width - sw) / 2;
        } else {
          // Изображение выше целевого - обрезаем по высоте
          sh = img.width / targetAspect;
          sy = (img.height - sh) / 2;
        }
        
        ctx?.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedUrl = URL.createObjectURL(blob);
            resolve(resizedUrl);
          } else {
            reject(new Error('Ошибка создания blob'));
          }
        }, 'image/png', 0.9);
      };
      
      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = imageUrl;
    });
  }

  /**
   * Оптимизирует изображение для WB
   */
  static async optimizeForWB(imageUrl: string): Promise<string> {
    try {
      // Сначала изменяем размер
      const resizedUrl = await this.resizeImage(imageUrl, 900, 1200);
      
      // Дополнительная оптимизация может быть добавлена здесь:
      // - Улучшение контрастности
      // - Добавление резкости
      // - Сжатие с оптимальным качеством
      
      return resizedUrl;
    } catch (error) {
      console.error('Ошибка оптимизации изображения:', error);
      return imageUrl; // Возвращаем оригинал при ошибке
    }
  }

  /**
   * Валидирует качество инфографики
   */
  static async validateInfographic(imageUrl: string): Promise<{
    isValid: boolean;
    quality: number;
    issues: string[];
  }> {
    // Базовая валидация - в реальности здесь будет ИИ-анализ
    const issues: string[] = [];
    let quality = 0.8;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Проверяем разрешение
      if (img.width < 800 || img.height < 1000) {
        issues.push('Низкое разрешение изображения');
        quality -= 0.2;
      }

      // Проверяем соотношение сторон
      const aspect = img.width / img.height;
      const targetAspect = 900 / 1200;
      if (Math.abs(aspect - targetAspect) > 0.1) {
        issues.push('Неправильное соотношение сторон');
        quality -= 0.1;
      }

      return {
        isValid: quality >= 0.6,
        quality: Math.max(0, Math.min(1, quality)),
        issues
      };

    } catch (error) {
      return {
        isValid: false,
        quality: 0,
        issues: ['Ошибка анализа изображения']
      };
    }
  }
}

export const imageProcessingService = new ImageProcessingService();