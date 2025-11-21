# Валидация загрузки фотографий

## Реализовано

Добавлена логика блокировки загрузки фотографий до ввода названия товара на странице создания товара.

## Как работает

### 1. Проверка при загрузке

**Главное фото:**
- При попытке загрузить главное фото проверяется наличие названия товара
- Если название не введено - показывается ошибка "Сначала введите название товара"
- Выбор файла автоматически сбрасывается

**Дополнительные фото:**
- Аналогичная проверка при загрузке дополнительных фотографий
- Та же логика сброса выбора файлов

### 2. Визуальная индикация

**Когда название НЕ введено:**
- Кнопки загрузки становятся серыми (opacity-50)
- Курсор меняется на `cursor-not-allowed`
- Текст меняется на "Введите название товара"
- Иконки становятся серыми (text-gray-400)
- Input элементы получают атрибут `disabled`
- При наведении показывается подсказка "Сначала введите название товара"

**Когда название введено:**
- Кнопки активны с фиолетовыми акцентами
- Курсор `cursor-pointer`
- Текст "Нажмите для загрузки"
- Иконки фиолетовые (text-purple-500)
- Hover эффекты работают

## Код

### Обработчики

```typescript
const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Проверяем наличие названия товара
  if (!productName || productName.trim() === '') {
    setError('Сначала введите название товара');
    e.target.value = ''; // Сбрасываем выбор файла
    return;
  }
  
  const file = e.target.files?.[0];
  if (file) {
    // ... загрузка файла
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
  // ... загрузка файлов
};
```

### UI элементы

```tsx
<label 
  className={`... ${
    !productName || productName.trim() === ''
      ? 'border-gray-300 cursor-not-allowed opacity-50'
      : 'border-purple-300 cursor-pointer hover:border-purple-500'
  }`}
  title={!productName || productName.trim() === '' ? 'Сначала введите название товара' : ''}
>
  <CloudUpload className={`... ${
    !productName || productName.trim() === '' ? 'text-gray-400' : 'text-purple-500'
  }`} />
  <span>
    {!productName || productName.trim() === '' ? 'Введите название товара' : 'Нажмите для загрузки'}
  </span>
  <input
    type="file"
    onChange={handleMainImageChange}
    disabled={!productName || productName.trim() === ''}
  />
</label>
```

## Файлы

- `src/app/components/ProductForm/SinglePageProductForm.tsx` - основной компонент формы

## Результат

✅ Пользователь не может загрузить фотографии без названия товара
✅ Визуальная индикация неактивного состояния
✅ Информативные сообщения об ошибках
✅ Подсказки при наведении
✅ Автоматический сброс выбора файлов при попытке загрузки
