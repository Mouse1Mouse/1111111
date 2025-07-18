import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ImageModal from './ImageModal';

interface Option {
  label: string;
  price?: number;
}

interface ProductItem {
  id: string;
  title: string;
  imageUrl: string;
  images?: string[];
  setOptions: Option[];
  pillowOptions: Option[];
  isPalette?: boolean;
}

interface ProductCardProps {
  item: ProductItem;
}

export default function ProductCard({ item }: ProductCardProps) {
  const [selectedSetOption, setSelectedSetOption] = useState(item.setOptions[0]?.label || '');
  const [selectedPillowOption, setSelectedPillowOption] = useState(item.pillowOptions[0]?.label || '');
  const [quantity, setQuantity] = useState(1);
  const [includeRezinka, setIncludeRezinka] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Rezinka states
  const standardRezinkaSizes = ["160×200×20", "170×200×20", "180×200×20"];
  const [selectedRezinkaSize, setSelectedRezinkaSize] = useState(standardRezinkaSizes[0]);
  const [customRezWidth, setCustomRezWidth] = useState("");
  const [customRezLength, setCustomRezLength] = useState("");
  const [customRezHeight, setCustomRezHeight] = useState("");
  const priceRezinka = 250;
  
  const { addItem } = useCart();

  // Get images array (use images if available, otherwise use single imageUrl)
  const images = item.images || [item.imageUrl];
  const hasMultipleImages = images.length > 1;

  // Listen for custom events from modal
  useEffect(() => {
    const handleImageModalGoTo = (e: CustomEvent) => {
      setCurrentImageIndex(e.detail);
    };

    window.addEventListener('imageModalGoTo', handleImageModalGoTo as EventListener);
    return () => {
      window.removeEventListener('imageModalGoTo', handleImageModalGoTo as EventListener);
    };
  }, []);

  const nextImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentImageIndex(index);
  };

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const isCustomRezValid = () => {
    const w = Number(customRezWidth);
    const l = Number(customRezLength);
    const h = Number(customRezHeight);
    return (
      w > 0 && l > 0 && h > 0 &&
      w <= 180 && l <= 200 && h <= 20
    );
  };

  const handleAddToCart = () => {
    // 1) Add bedding set
    const selectedSet = item.setOptions.find(opt => opt.label === selectedSetOption)!;
    addItem({
      id: item.id,
      title: item.title,
      imageUrl: images[currentImageIndex],
      chosenSet: selectedSet.label,
      chosenPillow: selectedPillowOption,
      quantity,
      price: selectedSet.price || 0,
    });

    // 2) If rezinka checkbox is checked, add the fitted-sheet
    if (includeRezinka) {
      let rezSize = selectedRezinkaSize;
      if (customRezWidth && customRezLength && customRezHeight && isCustomRezValid()) {
        rezSize = `${customRezWidth}×${customRezLength}×${customRezHeight}`;
      }
      addItem({
        id: "rezinka",
        title: `Простирадло на резинці (${rezSize})`,
        imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/additional/rezinka.jpg",
        chosenSet: rezSize,
        chosenPillow: "",
        quantity: 1,
        price: priceRezinka,
      });
    }
  };

  const handleColorCombination = () => {
    // Відкриваємо Instagram профіль @miva_ua
    const instagramUrl = 'https://www.instagram.com/miva_ua/';
    window.open(instagramUrl, '_blank');
  };

  // If this is a palette item, show only image gallery without purchase options
  if (item.isPalette) {
    return (
      <>
        <div 
          data-product-id={item.id}
          className="bg-white rounded-xl overflow-hidden shadow-2xl border-2 border-gold/20 hover:border-brandBrown/20 transition-all duration-300"
        >
          <figure className="relative group">
            <div className="relative overflow-hidden">
              <img
                src={images[currentImageIndex]}
                alt={`${item.title} - зображення ${currentImageIndex + 1}`}
                className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                onClick={openModal}
              />
              
              {/* Expand icon for full view */}
              <button
                onClick={openModal}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                aria-label="Відкрити у повному розмірі"
                type="button"
              >
                <Expand size={20} />
              </button>
              
              {/* Image navigation arrows */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    aria-label="Попереднє зображення"
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 mr-16"
                    aria-label="Наступне зображення"
                    type="button"
                  >
                    <ChevronRight size={20} />
                  </button>
                  
                  {/* Image indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => goToImage(index, e)}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        aria-label={`Зображення ${index + 1}`}
                        type="button"
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.4)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <figcaption className="absolute bottom-6 left-6 text-white text-xl font-semibold drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              {item.title}
              {hasMultipleImages && (
                <span className="block text-sm font-normal mt-1">
                  {currentImageIndex + 1} з {images.length}
                </span>
              )}
            </figcaption>
          </figure>

          <div className="p-6 text-center">
            <p className="text-graphite text-lg mb-4">
              Переглядайте всі доступні кольори постільної білизни. 
              Натисніть на зображення для детального перегляду.
            </p>
            <div className="bg-gradient-to-r from-cream to-beige p-4 rounded-lg mb-4">
              <p className="text-brandBrown font-medium text-sm mb-3">
                💡 Потрібна допомога з комбінуванням кольорів?
              </p>
              <button
                onClick={handleColorCombination}
                className="bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-4 py-2 rounded-lg font-medium text-cream transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
              >
                Написати в Instagram
              </button>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        <ImageModal
          isOpen={isModalOpen}
          onClose={closeModal}
          images={images}
          currentIndex={currentImageIndex}
          onPrevious={() => prevImage()}
          onNext={() => nextImage()}
          title={item.title}
        />
      </>
    );
  }

  return (
    <>
      <div 
        data-product-id={item.id}
        className="bg-white rounded-xl overflow-hidden shadow-2xl border-2 border-gold/20 hover:border-brandBrown/20 transition-colors duration-300"
      >
        <figure className="relative group">
          <div className="relative overflow-hidden">
            <img
              src={images[currentImageIndex]}
              alt={`${item.title} - зображення ${currentImageIndex + 1}`}
              className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
              onClick={openModal}
            />
            
            {/* Expand icon for full view */}
            <button
              onClick={openModal}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Відкрити у повному розмірі"
              type="button"
            >
              <Expand size={20} />
            </button>
            
            {/* Image navigation arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                  aria-label="Попереднє зображення"
                  type="button"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 mr-16"
                  aria-label="Наступне зображення"
                  type="button"
                >
                  <ChevronRight size={20} />
                </button>
                
                {/* Image indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => goToImage(index, e)}
                      className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`Зображення ${index + 1}`}
                      type="button"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.4)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <figcaption className="absolute bottom-6 left-6 text-white text-xl font-semibold drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {item.title}
            {hasMultipleImages && (
              <span className="block text-sm font-normal mt-1">
                {currentImageIndex + 1} з {images.length}
              </span>
            )}
          </figcaption>
        </figure>

        <div className="p-6">
          <select
            value={selectedSetOption}
            onChange={(e) => setSelectedSetOption(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 mb-4 text-graphite focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
          >
            {item.setOptions.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label} – {option.price} грн
              </option>
            ))}
          </select>

          <select
            value={selectedPillowOption}
            onChange={(e) => setSelectedPillowOption(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 mb-4 text-graphite focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
          >
            {item.pillowOptions.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="mb-4">
            <label htmlFor={`quantity-${item.id}`} className="block text-sm text-graphite mb-2">
              Кількість:
            </label>
            <input
              type="number"
              id={`quantity-${item.id}`}
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
              className="w-full border border-gray-300 rounded p-2 text-graphite focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
            />
          </div>

          <label className="flex items-center mt-4 mb-4">
            <input
              type="checkbox"
              checked={includeRezinka}
              onChange={e => setIncludeRezinka(e.target.checked)}
              className="mr-2 w-4 h-4 text-brandBrown bg-gray-100 border-gray-300 rounded focus:ring-brandBrown focus:ring-2"
            />
            <span className="text-graphite">Додати простирадло на резинці (+{priceRezinka} грн)</span>
          </label>

          {includeRezinka && (
            <div id="rezinka-inputs" className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-graphite font-medium mb-2">
                Стандартний розмір простирадла на резинці:
              </label>
              <select
                value={selectedRezinkaSize}
                onChange={e => setSelectedRezinkaSize(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 mb-4 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              >
                {standardRezinkaSizes.map(sz => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>

              <p className="text-graphite font-medium mb-2">Або введіть власні розміри (максимальні: 180×200×20):</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <input
                  type="number"
                  placeholder="Ширина"
                  value={customRezWidth}
                  onChange={e => setCustomRezWidth(e.target.value)}
                  className="border border-gray-300 rounded p-2 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Довжина"
                  value={customRezLength}
                  onChange={e => setCustomRezLength(e.target.value)}
                  className="border border-gray-300 rounded p-2 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Висота"
                  value={customRezHeight}
                  onChange={e => setCustomRezHeight(e.target.value)}
                  className="border border-gray-300 rounded p-2 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
                />
              </div>
              {!isCustomRezValid() && (customRezWidth || customRezLength || customRezHeight) && (
                <p className="text-red-600 text-sm">
                  Введіть коректні розміри (максимальні: 180×200×20).
                </p>
              )}
            </div>
          )}

          {/* Кнопка комбінації кольорів */}
          <div className="bg-gradient-to-r from-cream to-beige p-3 rounded-lg mb-4">
            <p className="text-brandBrown font-medium text-sm mb-2 text-center">
              🎨 Хочете інший колір або комбінацію?
            </p>
            <button
              onClick={handleColorCombination}
              className="w-full bg-gradient-to-r from-gold to-brandBrown hover:to-gold px-4 py-2 rounded-lg font-medium text-cream transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
            >
              Написати в Instagram
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 mt-4"
          >
            Додати до кошика
          </button>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={closeModal}
        images={images}
        currentIndex={currentImageIndex}
        onPrevious={() => prevImage()}
        onNext={() => nextImage()}
        title={item.title}
      />
    </>
  );
}