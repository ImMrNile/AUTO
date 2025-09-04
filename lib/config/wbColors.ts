// lib/config/wbColors.ts - РАСШИРЕННАЯ ЦВЕТОВАЯ ПАЛИТРА WB

export const WB_COLORS = {
  // Основные цвета
  BASIC: [
    { id: 1, value: 'белый', rgb: '#FFFFFF', hex: 'FFFFFF' },
    { id: 2, value: 'черный', rgb: '#000000', hex: '000000' },
    { id: 3, value: 'серый', rgb: '#808080', hex: '808080' },
    { id: 4, value: 'красный', rgb: '#FF0000', hex: 'FF0000' },
    { id: 5, value: 'синий', rgb: '#0000FF', hex: '0000FF' },
    { id: 6, value: 'зеленый', rgb: '#008000', hex: '008000' },
    { id: 7, value: 'желтый', rgb: '#FFFF00', hex: 'FFFF00' },
    { id: 8, value: 'оранжевый', rgb: '#FFA500', hex: 'FFA500' },
    { id: 9, value: 'фиолетовый', rgb: '#800080', hex: '800080' },
    { id: 10, value: 'розовый', rgb: '#FFC0CB', hex: 'FFC0CB' }
  ],

  // Расширенная палитра цветов для WB
  EXTENDED: [
    // Оттенки белого
    { id: 11, value: 'молочный', rgb: '#FEFCFF', hex: 'FEFCFF', category: 'white' },
    { id: 12, value: 'кремовый', rgb: '#FFFDD0', hex: 'FFFDD0', category: 'white' },
    { id: 13, value: 'слоновая кость', rgb: '#FFFFF0', hex: 'FFFFF0', category: 'white' },
    { id: 14, value: 'жемчужный', rgb: '#F0EAD6', hex: 'F0EAD6', category: 'white' },
    { id: 15, value: 'перламутровый', rgb: '#F8F6F0', hex: 'F8F6F0', category: 'white' },

    // Оттенки серого
    { id: 16, value: 'светло-серый', rgb: '#D3D3D3', hex: 'D3D3D3', category: 'gray' },
    { id: 17, value: 'темно-серый', rgb: '#A9A9A9', hex: 'A9A9A9', category: 'gray' },
    { id: 18, value: 'дымчатый', rgb: '#696969', hex: '696969', category: 'gray' },
    { id: 19, value: 'графитовый', rgb: '#2F4F4F', hex: '2F4F4F', category: 'gray' },
    { id: 20, value: 'угольный', rgb: '#36454F', hex: '36454F', category: 'gray' },
    { id: 21, value: 'серебристый', rgb: '#C0C0C0', hex: 'C0C0C0', category: 'gray' },
    { id: 22, value: 'пепельный', rgb: '#B2BEB5', hex: 'B2BEB5', category: 'gray' },

    // Оттенки черного
    { id: 23, value: 'антрацит', rgb: '#293133', hex: '293133', category: 'black' },
    { id: 24, value: 'смоляной', rgb: '#0C0C0C', hex: '0C0C0C', category: 'black' },
    { id: 25, value: 'иссиня-черный', rgb: '#000080', hex: '000080', category: 'black' },

    // Оттенки красного
    { id: 26, value: 'алый', rgb: '#FF2400', hex: 'FF2400', category: 'red' },
    { id: 27, value: 'малиновый', rgb: '#DC143C', hex: 'DC143C', category: 'red' },
    { id: 28, value: 'бордовый', rgb: '#800020', hex: '800020', category: 'red' },
    { id: 29, value: 'вишневый', rgb: '#722F37', hex: '722F37', category: 'red' },
    { id: 30, value: 'коралловый', rgb: '#FF7F50', hex: 'FF7F50', category: 'red' },
    { id: 31, value: 'терракотовый', rgb: '#E2725B', hex: 'E2725B', category: 'red' },
    { id: 32, value: 'кирпичный', rgb: '#CB4154', hex: 'CB4154', category: 'red' },
    { id: 33, value: 'винный', rgb: '#722F37', hex: '722F37', category: 'red' },
    { id: 34, value: 'рубиновый', rgb: '#E0115F', hex: 'E0115F', category: 'red' },

    // Оттенки синего
    { id: 35, value: 'голубой', rgb: '#87CEEB', hex: '87CEEB', category: 'blue' },
    { id: 36, value: 'темно-синий', rgb: '#00008B', hex: '00008B', category: 'blue' },
    { id: 37, value: 'морской волны', rgb: '#2E8B57', hex: '2E8B57', category: 'blue' },
    { id: 38, value: 'бирюзовый', rgb: '#40E0D0', hex: '40E0D0', category: 'blue' },
    { id: 39, value: 'аквамарин', rgb: '#7FFFD4', hex: '7FFFD4', category: 'blue' },
    { id: 40, value: 'индиго', rgb: '#4B0082', hex: '4B0082', category: 'blue' },
    { id: 41, value: 'кобальтовый', rgb: '#0047AB', hex: '0047AB', category: 'blue' },
    { id: 42, value: 'ультрамарин', rgb: '#120A8F', hex: '120A8F', category: 'blue' },
    { id: 43, value: 'васильковый', rgb: '#6495ED', hex: '6495ED', category: 'blue' },
    { id: 44, value: 'лазурный', rgb: '#007FFF', hex: '007FFF', category: 'blue' },

    // Оттенки зеленого
    { id: 45, value: 'салатовый', rgb: '#ADFF2F', hex: 'ADFF2F', category: 'green' },
    { id: 46, value: 'темно-зеленый', rgb: '#006400', hex: '006400', category: 'green' },
    { id: 47, value: 'изумрудный', rgb: '#50C878', hex: '50C878', category: 'green' },
    { id: 48, value: 'оливковый', rgb: '#808000', hex: '808000', category: 'green' },
    { id: 49, value: 'хаки', rgb: '#F0E68C', hex: 'F0E68C', category: 'green' },
    { id: 50, value: 'болотный', rgb: '#ACB78E', hex: 'ACB78E', category: 'green' },
    { id: 51, value: 'мятный', rgb: '#98FB98', hex: '98FB98', category: 'green' },
    { id: 52, value: 'лаймовый', rgb: '#32CD32', hex: '32CD32', category: 'green' },
    { id: 53, value: 'травяной', rgb: '#7CFC00', hex: '7CFC00', category: 'green' },

    // Оттенки желтого
    { id: 54, value: 'лимонный', rgb: '#FFFACD', hex: 'FFFACD', category: 'yellow' },
    { id: 55, value: 'золотой', rgb: '#FFD700', hex: 'FFD700', category: 'yellow' },
    { id: 56, value: 'медовый', rgb: '#FFC30B', hex: 'FFC30B', category: 'yellow' },
    { id: 57, value: 'песочный', rgb: '#F4A460', hex: 'F4A460', category: 'yellow' },
    { id: 58, value: 'горчичный', rgb: '#FFDB58', hex: 'FFDB58', category: 'yellow' },
    { id: 59, value: 'шафрановый', rgb: '#F4C430', hex: 'F4C430', category: 'yellow' },
    { id: 60, value: 'канареечный', rgb: '#FFEF00', hex: 'FFEF00', category: 'yellow' },

    // Оттенки оранжевого
    { id: 61, value: 'персиковый', rgb: '#FFCBA4', hex: 'FFCBA4', category: 'orange' },
    { id: 62, value: 'мандариновый', rgb: '#FF8C00', hex: 'FF8C00', category: 'orange' },
    { id: 63, value: 'морковный', rgb: '#ED9121', hex: 'ED9121', category: 'orange' },
    { id: 64, value: 'янтарный', rgb: '#FFBF00', hex: 'FFBF00', category: 'orange' },
    { id: 65, value: 'абрикосовый', rgb: '#FBCEB1', hex: 'FBCEB1', category: 'orange' },
    { id: 66, value: 'тыквенный', rgb: '#FF7518', hex: 'FF7518', category: 'orange' },

    // Оттенки фиолетового
    { id: 67, value: 'сиреневый', rgb: '#C8A2C8', hex: 'C8A2C8', category: 'purple' },
    { id: 68, value: 'лавандовый', rgb: '#E6E6FA', hex: 'E6E6FA', category: 'purple' },
    { id: 69, value: 'баклажанный', rgb: '#614051', hex: '614051', category: 'purple' },
    { id: 70, value: 'аметистовый', rgb: '#9966CC', hex: '9966CC', category: 'purple' },
    { id: 71, value: 'сливовый', rgb: '#8E4585', hex: '8E4585', category: 'purple' },
    { id: 72, value: 'пурпурный', rgb: '#9F2B68', hex: '9F2B68', category: 'purple' },

    // Оттенки розового
    { id: 73, value: 'пудровый', rgb: '#F0DC82', hex: 'F0DC82', category: 'pink' },
    { id: 74, value: 'фуксия', rgb: '#FF00FF', hex: 'FF00FF', category: 'pink' },
    { id: 75, value: 'лососевый', rgb: '#FA8072', hex: 'FA8072', category: 'pink' },
    { id: 76, value: 'пепел розы', rgb: '#C4AEAD', hex: 'C4AEAD', category: 'pink' },
    { id: 77, value: 'малиновый', rgb: '#DC143C', hex: 'DC143C', category: 'pink' },

    // Коричневые оттенки
    { id: 78, value: 'коричневый', rgb: '#A52A2A', hex: 'A52A2A', category: 'brown' },
    { id: 79, value: 'каштановый', rgb: '#954535', hex: '954535', category: 'brown' },
    { id: 80, value: 'шоколадный', rgb: '#7B3F00', hex: '7B3F00', category: 'brown' },
    { id: 81, value: 'кофейный', rgb: '#6F4E37', hex: '6F4E37', category: 'brown' },
    { id: 82, value: 'ореховый', rgb: '#8B4513', hex: '8B4513', category: 'brown' },
    { id: 83, value: 'медный', rgb: '#B87333', hex: 'B87333', category: 'brown' },
    { id: 84, value: 'бронзовый', rgb: '#CD7F32', hex: 'CD7F32', category: 'brown' },
    { id: 85, value: 'табачный', rgb: '#71653A', hex: '71653A', category: 'brown' },

    // Бежевые оттенки  
    { id: 86, value: 'бежевый', rgb: '#F5F5DC', hex: 'F5F5DC', category: 'beige' },
    { id: 87, value: 'кремово-бежевый', rgb: '#F5DEB3', hex: 'F5DEB3', category: 'beige' },
    { id: 88, value: 'слоновой кости', rgb: '#FFFFF0', hex: 'FFFFF0', category: 'beige' },
    { id: 89, value: 'экрю', rgb: '#F4F2E7', hex: 'F4F2E7', category: 'beige' },

    // Многоцветные и специальные
    { id: 90, value: 'разноцветный', rgb: '#000000', hex: '000000', category: 'multicolor' },
    { id: 91, value: 'многоцветный', rgb: '#000000', hex: '000000', category: 'multicolor' },
    { id: 92, value: 'цветной', rgb: '#000000', hex: '000000', category: 'multicolor' },
    { id: 93, value: 'принт', rgb: '#000000', hex: '000000', category: 'multicolor' },
    { id: 94, value: 'градиент', rgb: '#000000', hex: '000000', category: 'multicolor' },
    { id: 95, value: 'хамелеон', rgb: '#000000', hex: '000000', category: 'multicolor' },
    { id: 96, value: 'радужный', rgb: '#000000', hex: '000000', category: 'multicolor' },

    // Металлические оттенки
    { id: 97, value: 'серебряный', rgb: '#C0C0C0', hex: 'C0C0C0', category: 'metallic' },
    { id: 98, value: 'золотистый', rgb: '#FFD700', hex: 'FFD700', category: 'metallic' },
    { id: 99, value: 'платиновый', rgb: '#E5E4E2', hex: 'E5E4E2', category: 'metallic' },
    { id: 100, value: 'медный', rgb: '#B87333', hex: 'B87333', category: 'metallic' },
    { id: 101, value: 'бронзовый', rgb: '#CD7F32', hex: 'CD7F32', category: 'metallic' },
    { id: 102, value: 'хромированный', rgb: '#BDC3C7', hex: 'BDC3C7', category: 'metallic' },

    // Прозрачные и специальные эффекты
    { id: 103, value: 'прозрачный', rgb: '#FFFFFF', hex: 'FFFFFF', category: 'transparent' },
    { id: 104, value: 'полупрозрачный', rgb: '#FFFFFF', hex: 'FFFFFF', category: 'transparent' },
    { id: 105, value: 'матовый', rgb: '#000000', hex: '000000', category: 'matte' },
    { id: 106, value: 'глянцевый', rgb: '#000000', hex: '000000', category: 'glossy' },
    { id: 107, value: 'перламутр', rgb: '#F8F6F0', hex: 'F8F6F0', category: 'pearl' },

    // Неоновые цвета
    { id: 108, value: 'неоново-зеленый', rgb: '#39FF14', hex: '39FF14', category: 'neon' },
    { id: 109, value: 'неоново-розовый', rgb: '#FF073A', hex: 'FF073A', category: 'neon' },
    { id: 110, value: 'неоново-желтый', rgb: '#FFFF33', hex: 'FFFF33', category: 'neon' },
    { id: 111, value: 'неоново-синий', rgb: '#1B03A3', hex: '1B03A3', category: 'neon' },
    { id: 112, value: 'неоново-оранжевый', rgb: '#FF4500', hex: 'FF4500', category: 'neon' }
  ],

  // Утилиты для работы с цветами
  UTILS: {
    // Поиск цвета по названию
    findByName: (colorName: string) => {
      const allColors = [...WB_COLORS.BASIC, ...WB_COLORS.EXTENDED];
      return allColors.find(color => 
        color.value.toLowerCase().includes(colorName.toLowerCase())
      );
    },

    // Поиск цветов по категории
    findByCategory: (category: string) => {
      return WB_COLORS.EXTENDED.filter(color => color.category === category);
    },

    // Получение ближайшего цвета по RGB
    getClosestColor: (targetRgb: string) => {
      const allColors = [...WB_COLORS.BASIC, ...WB_COLORS.EXTENDED];
      
      const parseRgb = (rgb: string) => {
        const match = rgb.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        return match ? {
          r: parseInt(match[1], 16),
          g: parseInt(match[2], 16),
          b: parseInt(match[3], 16)
        } : null;
      };
      
      const targetColor = parseRgb(targetRgb);
      if (!targetColor) return null;
      
      let closestColor = allColors[0];
      let minDistance = Infinity;
      
      allColors.forEach(color => {
        const currentColor = parseRgb(color.rgb);
        if (currentColor) {
          const distance = Math.sqrt(
            Math.pow(currentColor.r - targetColor.r, 2) +
            Math.pow(currentColor.g - targetColor.g, 2) +
            Math.pow(currentColor.b - targetColor.b, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
          }
        }
      });
      
      return closestColor;
    },

    // Получение всех доступных цветов
    getAllColors: () => [...WB_COLORS.BASIC, ...WB_COLORS.EXTENDED],

    // Группировка цветов по категориям
    getColorsByCategories: () => {
      const categories: Record<string, typeof WB_COLORS.EXTENDED> = {};
      
      WB_COLORS.EXTENDED.forEach(color => {
        if (color.category) {
          if (!categories[color.category]) {
            categories[color.category] = [];
          }
          categories[color.category].push(color);
        }
      });
      
      return categories;
    }
  }
};

// Константы для быстрого доступа
export const POPULAR_COLORS = [
  'черный', 'белый', 'серый', 'красный', 'синий', 'зеленый', 
  'желтый', 'коричневый', 'розовый', 'фиолетовый', 'оранжевый',
  'бежевый', 'серебристый', 'золотой', 'разноцветный'
];

export const METALLIC_COLORS = [
  'серебряный', 'золотистый', 'платиновый', 'медный', 'бронзовый', 'хромированный'
];

export const TRANSPARENT_COLORS = [
  'прозрачный', 'полупрозрачный'
];

export const SPECIAL_EFFECTS = [
  'матовый', 'глянцевый', 'перламутр', 'хамелеон', 'градиент'
];

export default WB_COLORS;