import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  title: string;
}

export default function ImageModal({ 
  isOpen, 
  onClose, 
  images, 
  currentIndex, 
  onPrevious, 
  onNext, 
  title 
}: ImageModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      onPrevious();
    } else if (e.key === 'ArrowRight') {
      onNext();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        aria-label="Закрити"
      >
        <X size={32} />
      </button>

      {/* Image counter */}
      <div className="absolute top-4 left-4 text-white text-lg font-medium z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Title */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-white text-xl font-semibold z-10">
        {title}
      </div>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Попереднє зображення"
        >
          <ChevronLeft size={48} />
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Наступне зображення"
        >
          <ChevronRight size={48} />
        </button>
      )}

      {/* Main image */}
      <div className="max-w-full max-h-full flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`${title} - зображення ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        />
      </div>

      {/* Image indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                // We'll need to pass this function from parent
                const event = new CustomEvent('imageModalGoTo', { detail: index });
                window.dispatchEvent(event);
              }}
              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              aria-label={`Перейти до зображення ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-75 text-center">
        {images.length > 1 && (
          <>
            Використовуйте стрілки або клавіші ← → для навігації
            <br />
          </>
        )}
        Натисніть ESC або клікніть поза зображенням, щоб закрити
      </div>
    </div>
  );
}