import React, { useState } from 'react';
import { Palette, RotateCcw, Share2 } from 'lucide-react';

interface ColorOption {
  name: string;
  hex: string;
  description: string;
}

export default function ColorConstructor() {
  // Палітра кольорів MIVA
  const colors: ColorOption[] = [
    { name: 'Молочний', hex: '#F5F3EA', description: 'Ніжний молочний відтінок' },
    { name: 'Капучино', hex: '#C9B39C', description: 'Теплий кавовий тон' },
    { name: 'Бежевий', hex: '#E8D5C4', description: 'Класичний бежевий' },
    { name: 'Карамель', hex: '#D4A574', description: 'Солодкий карамельний' },
    { name: 'Графіт', hex: '#4A4A4A', description: 'Елегантний сірий' },
    { name: 'Світло-сірий', hex: '#B8B8B8', description: 'М\'який сірий тон' },
    { name: 'Білий', hex: '#FFFFFF', description: 'Чистий білий' },
    { name: 'Чорний', hex: '#2C2C2C', description: 'Глибокий чорний' },
    { name: 'Ніжно-рожевий', hex: '#F4C2C2', description: 'Романтичний рожевий' },
    { name: 'Салатовий', hex: '#A8D5A8', description: 'Свіжий зелений' },
    { name: 'Блакитний', hex: '#A8C8E1', description: 'Спокійний блакитний' },
    { name: 'Лавандовий', hex: '#C8A8E1', description: 'Ніжний фіолетовий' },
    { name: 'Персиковий', hex: '#F5C99B', description: 'Теплий персиковий' },
    { name: 'Мятний', hex: '#B8E6D3', description: 'Освіжаючий м\'ятний' },
    { name: 'Пудровий', hex: '#E8C5D1', description: 'Витончений пудровий' },
    { name: 'Золотистий', hex: '#D4AF37', description: 'Розкішний золотий' },
    { name: 'Терракота', hex: '#C65D07', description: 'Земляний терракотовий' },
    { name: 'Індиго', hex: '#4B0082', description: 'Глибокий індиго' },
    { name: 'Олива', hex: '#8B8000', description: 'Природний оливковий' },
    { name: 'Бордо', hex: '#800020', description: 'Благородний бордовий' }
  ];

  // Стани для вибраних кольорів (початкові кольори як на фото)
  const [selectedColors, setSelectedColors] = useState({
    sheet: '#E8D5C4',        // Простирадло - бежевий як на фото
    blanket: '#7FB069',      // Ковдра - зелений як на фото
    pillowLeft: '#7FB069',   // Ліва подушка - зелений як на фото
    pillowRight: '#7FB069'   // Права подушка - зелений як на фото
  });

  // Функція для зміни кольору елемента
  const handleColorChange = (element: keyof typeof selectedColors, color: string) => {
    setSelectedColors(prev => ({
      ...prev,
      [element]: color
    }));
  };

  // Скидання до початкових кольорів (як на оригінальному фото)
  const resetColors = () => {
    setSelectedColors({
      sheet: '#E8D5C4',
      blanket: '#7FB069',
      pillowLeft: '#7FB069',
      pillowRight: '#7FB069'
    });
  };

  // Поділитися комбінацією в Instagram
  const shareToInstagram = () => {
    const selectedColorNames = {
      sheet: colors.find(c => c.hex === selectedColors.sheet)?.name || 'Індивідуальний',
      blanket: colors.find(c => c.hex === selectedColors.blanket)?.name || 'Індивідуальний',
      pillowLeft: colors.find(c => c.hex === selectedColors.pillowLeft)?.name || 'Індивідуальний',
      pillowRight: colors.find(c => c.hex === selectedColors.pillowRight)?.name || 'Індивідуальний'
    };

    const message = `Моя комбінація кольорів MIVA:
🛏️ Простирадло: ${selectedColorNames.sheet}
🛌 Ковдра: ${selectedColorNames.blanket}
🛏️ Подушки: ${selectedColorNames.pillowLeft}${selectedColorNames.pillowLeft !== selectedColorNames.pillowRight ? ` та ${selectedColorNames.pillowRight}` : ''}

Допоможіть оформити замовлення! 💙`;

    const instagramUrl = `https://www.instagram.com/miva_ua/`;
    window.open(instagramUrl, '_blank');
    
    // Копіюємо текст в буфер обміну для зручності
    navigator.clipboard.writeText(message).catch(() => {
      // Fallback для старих браузерів
      console.log('Не вдалося скопіювати текст');
    });
  };

  return (
    <section id="constructor" className="py-24 bg-gradient-to-br from-[#fff7ed] to-[#fdf2e9]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-brandBrown mb-4 text-shadow-sm">
            Конструктор кольорових комбінацій
          </h2>
          <p className="text-lg text-graphite max-w-2xl mx-auto">
            Експериментуйте з кольорами та створюйте унікальні комбінації для вашої постільної білизни
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Візуалізація ліжка */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: '4/3' }}>
                {/* Базове зображення ліжка */}
                <img 
                  src="/assets/constructor/base.jpg" 
                  alt="Базове зображення ліжка"
                  className="w-full h-full object-cover rounded-lg"
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
                />
                
                {/* Простирадло - маска для нижньої частини ліжка */}
                <div
                  className="absolute inset-0 rounded-lg opacity-70"
                  style={{
                    backgroundColor: selectedColors.sheet,
                    mixBlendMode: 'multiply',
                    zIndex: 1,
                    clipPath: 'polygon(0% 60%, 100% 60%, 100% 100%, 0% 100%)'
                  }}
                />
                
                {/* Ковдра - маска для основної частини ковдри */}
                <div
                  className="absolute inset-0 rounded-lg opacity-80"
                  style={{
                    backgroundColor: selectedColors.blanket,
                    mixBlendMode: 'multiply',
                    zIndex: 2,
                    clipPath: 'polygon(5% 35%, 95% 35%, 90% 85%, 10% 85%)'
                  }}
                />
                
                {/* Ліва подушка */}
                <div
                  className="absolute inset-0 rounded-lg opacity-80"
                  style={{
                    backgroundColor: selectedColors.pillowLeft,
                    mixBlendMode: 'multiply',
                    zIndex: 3,
                    clipPath: 'polygon(8% 15%, 45% 15%, 42% 45%, 12% 45%)'
                  }}
                />
                
                {/* Права подушка */}
                <div
                  className="absolute inset-0 rounded-lg opacity-80"
                  style={{
                    backgroundColor: selectedColors.pillowRight,
                    mixBlendMode: 'multiply',
                    zIndex: 4,
                    clipPath: 'polygon(55% 15%, 92% 15%, 88% 45%, 58% 45%)'
                  }}
                />

                {/* Індикатори зон для кращого розуміння */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Підписи зон (показуються при hover) */}
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                    Ліва подушка
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                    Права подушка
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                    Ковдра
                  </div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                    Простирадло
                  </div>
                </div>
              </div>

              {/* Поточна комбінація */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-graphite mb-3">Поточна комбінація:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border" style={{ backgroundColor: selectedColors.sheet }} />
                    <span>Простирадло</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border" style={{ backgroundColor: selectedColors.blanket }} />
                    <span>Ковдра</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border" style={{ backgroundColor: selectedColors.pillowLeft }} />
                    <span>Ліва подушка</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border" style={{ backgroundColor: selectedColors.pillowRight }} />
                    <span>Права подушка</span>
                  </div>
                </div>
              </div>

              {/* Кнопки дій */}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={resetColors}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-graphite rounded-lg transition-colors duration-200"
                >
                  <RotateCcw size={16} />
                  <span>Скинути</span>
                </button>
                <button
                  onClick={shareToInstagram}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold text-cream rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <Share2 size={16} />
                  <span>Поділитися</span>
                </button>
              </div>
            </div>

            {/* Селектори кольорів */}
            <div className="space-y-6">
              {/* Простирадло */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: selectedColors.sheet }}
                  />
                  Простирадло
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {colors.map((color) => (
                    <button
                      key={`sheet-${color.hex}`}
                      onClick={() => handleColorChange('sheet', color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColors.sheet === color.hex 
                          ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50' 
                          : 'border-gray-300 hover:border-brandBrown'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Ковдра */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: selectedColors.blanket }}
                  />
                  Ковдра
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {colors.map((color) => (
                    <button
                      key={`blanket-${color.hex}`}
                      onClick={() => handleColorChange('blanket', color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColors.blanket === color.hex 
                          ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50' 
                          : 'border-gray-300 hover:border-brandBrown'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Ліва подушка */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: selectedColors.pillowLeft }}
                  />
                  Ліва подушка
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {colors.map((color) => (
                    <button
                      key={`pillow-left-${color.hex}`}
                      onClick={() => handleColorChange('pillowLeft', color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColors.pillowLeft === color.hex 
                          ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50' 
                          : 'border-gray-300 hover:border-brandBrown'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Права подушка */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: selectedColors.pillowRight }}
                  />
                  Права подушка
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {colors.map((color) => (
                    <button
                      key={`pillow-right-${color.hex}`}
                      onClick={() => handleColorChange('pillowRight', color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColors.pillowRight === color.hex 
                          ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50' 
                          : 'border-gray-300 hover:border-brandBrown'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Швидкі комбінації */}
              <div className="bg-gradient-to-r from-cream to-beige rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <Palette size={20} />
                  Готові комбінації
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedColors({
                      sheet: '#F5F3EA', blanket: '#C9B39C', 
                      pillowLeft: '#E8D5C4', pillowRight: '#E8D5C4'
                    })}
                    className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow duration-200 text-left"
                  >
                    <div className="flex gap-2 mb-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F5F3EA' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#C9B39C' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E8D5C4' }} />
                    </div>
                    <span className="text-sm font-medium text-graphite">Класична</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedColors({
                      sheet: '#FFFFFF', blanket: '#B8B8B8', 
                      pillowLeft: '#4A4A4A', pillowRight: '#4A4A4A'
                    })}
                    className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow duration-200 text-left"
                  >
                    <div className="flex gap-2 mb-2">
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#FFFFFF' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#B8B8B8' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4A4A4A' }} />
                    </div>
                    <span className="text-sm font-medium text-graphite">Мінімалізм</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedColors({
                      sheet: '#F4C2C2', blanket: '#E8C5D1', 
                      pillowLeft: '#F4C2C2', pillowRight: '#E8C5D1'
                    })}
                    className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow duration-200 text-left"
                  >
                    <div className="flex gap-2 mb-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F4C2C2' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E8C5D1' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F4C2C2' }} />
                    </div>
                    <span className="text-sm font-medium text-graphite">Романтична</span>
                  </button>
                  
                  <button
                    onClick={() => setSelectedColors({
                      sheet: '#E8D5C4', blanket: '#7FB069', 
                      pillowLeft: '#7FB069', pillowRight: '#7FB069'
                    })}
                    className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow duration-200 text-left"
                  >
                    <div className="flex gap-2 mb-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E8D5C4' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7FB069' }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7FB069' }} />
                    </div>
                    <span className="text-sm font-medium text-graphite">Оригінальна</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Інструкції */}
        <div className="max-w-4xl mx-auto mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-brandBrown mb-4 text-center">
            Як користуватися конструктором
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-12 h-12 bg-brandBrown text-cream rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                1
              </div>
              <h4 className="font-medium text-graphite mb-2">Оберіть кольори</h4>
              <p className="text-sm text-gray-600">
                Натискайте на кольорові кружечки, щоб змінити колір кожної частини постелі
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brandBrown text-cream rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                2
              </div>
              <h4 className="font-medium text-graphite mb-2">Переглядайте результат</h4>
              <p className="text-sm text-gray-600">
                Бачите зміни в реальному часі на зображенні ліжка
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brandBrown text-cream rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                3
              </div>
              <h4 className="font-medium text-graphite mb-2">Поділіться комбінацією</h4>
              <p className="text-sm text-gray-600">
                Натисніть "Поділитися" та напишіть нам в Instagram для замовлення
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}