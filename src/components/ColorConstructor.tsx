import React, { useState } from 'react';
import { Palette, RotateCcw, Share2, Info } from 'lucide-react';

interface ColorOption {
  name: string;
  hex: string;
  description: string;
}

export default function ColorConstructor() {
  // Палітра кольорів MIVA (20 кольорів)
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

  const [showInfo, setShowInfo] = useState(false);

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
      console.log('Не вдалося скопіювати текст');
    });
  };

  // Готові комбінації
  const presetCombinations = [
    {
      name: 'Класична',
      colors: { sheet: '#F5F3EA', blanket: '#C9B39C', pillowLeft: '#E8D5C4', pillowRight: '#E8D5C4' }
    },
    {
      name: 'Мінімалізм',
      colors: { sheet: '#FFFFFF', blanket: '#B8B8B8', pillowLeft: '#4A4A4A', pillowRight: '#4A4A4A' }
    },
    {
      name: 'Романтична',
      colors: { sheet: '#F4C2C2', blanket: '#E8C5D1', pillowLeft: '#F4C2C2', pillowRight: '#E8C5D1' }
    },
    {
      name: 'Оригінальна',
      colors: { sheet: '#E8D5C4', blanket: '#7FB069', pillowLeft: '#7FB069', pillowRight: '#7FB069' }
    }
  ];

  return (
    <section id="constructor" className="py-24 bg-gradient-to-br from-[#fff7ed] to-[#fdf2e9]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-brandBrown mb-4 text-shadow-sm">
            Конструктор кольорових комбінацій
          </h2>
          <p className="text-lg text-graphite max-w-2xl mx-auto mb-6">
            Експериментуйте з кольорами та створюйте унікальні комбінації для вашої постільної білизни
          </p>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="inline-flex items-center gap-2 text-brandBrown hover:text-gold transition-colors"
          >
            <Info size={16} />
            <span className="text-sm">Як користуватися конструктором</span>
          </button>
        </div>

        {/* Інструкції (показуються при кліку) */}
        {showInfo && (
          <div className="max-w-4xl mx-auto mb-12 bg-white rounded-xl shadow-lg p-6 border-l-4 border-brandBrown">
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
                  Бачите зміни в реальному часі на зображенні ліжка з збереженням текстури
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
        )}

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Візуалізація ліжка */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="relative w-full max-w-lg mx-auto group" style={{ aspectRatio: '4/3' }}>
                {/* Базове зображення ліжка */}
                <img 
                  src="/photo_2025-06-10_19-09-52.jpg" 
                  alt="Базове зображення ліжка"
                  className="w-full h-full object-cover rounded-lg"
                  style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
                />
                
                {/* PNG-маски для кожної зони з mix-blend-mode */}
                
                {/* Простирадло - нижня частина ліжка */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-300"
                  style={{
                    backgroundColor: selectedColors.sheet,
                    mixBlendMode: 'multiply',
                    zIndex: 1,
                    clipPath: 'polygon(0% 65%, 100% 65%, 100% 100%, 0% 100%)',
                    opacity: 0.8
                  }}
                />
                
                {/* Ковдра - основна частина */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-300"
                  style={{
                    backgroundColor: selectedColors.blanket,
                    mixBlendMode: 'multiply',
                    zIndex: 2,
                    clipPath: 'polygon(5% 40%, 95% 40%, 90% 80%, 10% 80%)',
                    opacity: 0.85
                  }}
                />
                
                {/* Ліва подушка */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-300"
                  style={{
                    backgroundColor: selectedColors.pillowLeft,
                    mixBlendMode: 'multiply',
                    zIndex: 3,
                    clipPath: 'polygon(8% 18%, 45% 18%, 42% 48%, 12% 48%)',
                    opacity: 0.85
                  }}
                />
                
                {/* Права подушка */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-300"
                  style={{
                    backgroundColor: selectedColors.pillowRight,
                    mixBlendMode: 'multiply',
                    zIndex: 4,
                    clipPath: 'polygon(55% 18%, 92% 18%, 88% 48%, 58% 48%)',
                    opacity: 0.85
                  }}
                />

                {/* Інтерактивні підписи зон */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    Ліва подушка
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    Права подушка
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    Ковдра
                  </div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    Простирадло
                  </div>
                </div>
              </div>

              {/* Поточна комбінація */}
              <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                <h4 className="text-sm font-medium text-graphite mb-3 text-center">Поточна комбінація:</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-white p-2 rounded">
                    <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: selectedColors.sheet }} />
                    <span className="font-medium">Простирадло:</span>
                    <span className="text-brandBrown">{colors.find(c => c.hex === selectedColors.sheet)?.name || 'Індивідуальний'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded">
                    <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: selectedColors.blanket }} />
                    <span className="font-medium">Ковдра:</span>
                    <span className="text-brandBrown">{colors.find(c => c.hex === selectedColors.blanket)?.name || 'Індивідуальний'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded">
                    <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: selectedColors.pillowLeft }} />
                    <span className="font-medium">Ліва подушка:</span>
                    <span className="text-brandBrown">{colors.find(c => c.hex === selectedColors.pillowLeft)?.name || 'Індивідуальний'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded">
                    <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: selectedColors.pillowRight }} />
                    <span className="font-medium">Права подушка:</span>
                    <span className="text-brandBrown">{colors.find(c => c.hex === selectedColors.pillowRight)?.name || 'Індивідуальний'}</span>
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
                  <span>Замовити</span>
                </button>
              </div>
            </div>

            {/* Селектори кольорів */}
            <div className="space-y-6">
              {/* Готові комбінації */}
              <div className="bg-gradient-to-r from-cream to-beige rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <Palette size={20} />
                  Готові комбінації
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presetCombinations.map((combo, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColors(combo.colors)}
                      className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow duration-200 text-left group"
                    >
                      <div className="flex gap-2 mb-2">
                        <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: combo.colors.sheet }} />
                        <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: combo.colors.blanket }} />
                        <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: combo.colors.pillowLeft }} />
                        {combo.colors.pillowLeft !== combo.colors.pillowRight && (
                          <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: combo.colors.pillowRight }} />
                        )}
                      </div>
                      <span className="text-sm font-medium text-graphite group-hover:text-brandBrown transition-colors">
                        {combo.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Простирадло */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: selectedColors.sheet }}
                  />
                  Простирадло
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {colors.map((color) => (
                    <button
                      key={`sheet-${color.hex}`}
                      onClick={() => handleColorChange('sheet', color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColors.sheet === color.hex 
                          ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50 scale-110' 
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
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {colors.map((color) => (
                    <button
                      key={`blanket-${color.hex}`}
                      onClick={() => handleColorChange('blanket', color.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColors.blanket === color.hex 
                          ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50 scale-110' 
                          : 'border-gray-300 hover:border-brandBrown'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Подушки */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Ліва подушка */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-brandBrown mb-4 flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: selectedColors.pillowLeft }}
                    />
                    Ліва подушка
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {colors.map((color) => (
                      <button
                        key={`pillow-left-${color.hex}`}
                        onClick={() => handleColorChange('pillowLeft', color.hex)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                          selectedColors.pillowLeft === color.hex 
                            ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50 scale-110' 
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
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {colors.map((color) => (
                      <button
                        key={`pillow-right-${color.hex}`}
                        onClick={() => handleColorChange('pillowRight', color.hex)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                          selectedColors.pillowRight === color.hex 
                            ? 'border-brandBrown ring-2 ring-brandBrown ring-opacity-50 scale-110' 
                            : 'border-gray-300 hover:border-brandBrown'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Швидкі дії для подушок */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setSelectedColors(prev => ({ ...prev, pillowRight: prev.pillowLeft }))}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-graphite rounded-lg transition-colors text-sm border"
                  >
                    Однакові подушки
                  </button>
                  <button
                    onClick={() => {
                      const leftColor = selectedColors.pillowLeft;
                      const rightColor = selectedColors.pillowRight;
                      setSelectedColors(prev => ({ 
                        ...prev, 
                        pillowLeft: rightColor, 
                        pillowRight: leftColor 
                      }));
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-graphite rounded-lg transition-colors text-sm border"
                  >
                    Поміняти місцями
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Додаткова інформація */}
        <div className="max-w-4xl mx-auto mt-12 bg-white rounded-xl shadow-lg p-6 text-center">
          <h3 className="text-xl font-semibold text-brandBrown mb-4">
            💡 Поради від MIVA
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-graphite">
            <div>
              <h4 className="font-medium mb-2">Гармонійні поєднання:</h4>
              <p>Використовуйте кольори з однієї температурної гами (теплі або холодні) для створення спокійної атмосфери.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Контрастні акценти:</h4>
              <p>Додайте яскравості за допомогою контрастних подушок - це легко змінити настрій кімнати.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}