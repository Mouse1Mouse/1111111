import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import OrderForm from './OrderForm';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity } = useCart();
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Calculate total sum
  const totalSum = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBackToCart = () => {
    setShowOrderForm(false);
  };

  const handleOrderClick = () => {
    setShowOrderForm(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={handleBackdropClick}
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} z-50`}>
        <div className="h-full flex flex-col">
          {!showOrderForm ? (
            <>
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 bg-white">
                <h2 className="text-xl sm:text-2xl font-semibold text-brandBrown">Кошик</h2>
                <button 
                  onClick={onClose} 
                  className="text-graphite hover:text-brandBrown transition-colors p-2 -mr-2"
                  aria-label="Закрити кошик"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"></path>
                      </svg>
                    </div>
                    <p className="text-graphite text-lg">Кошик порожній</p>
                    <p className="text-gray-500 text-sm mt-2">Додайте товари з галереї</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {items.map((item, index) => (
                      <div key={`${item.id}-${item.chosenSet}-${item.chosenPillow}-${index}`} className="flex gap-3 sm:gap-4 border-b border-gray-100 pb-4">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-brandBrown text-sm sm:text-base truncate">{item.title}</h3>
                          <p className="text-xs sm:text-sm text-graphite mt-1">Розмір комплекту: {item.chosenSet}</p>
                          {item.chosenPillow && (
                            <p className="text-xs sm:text-sm text-graphite">Розмір наволочок: {item.chosenPillow}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {item.id.startsWith('rezinka') ? (
                              <span className="text-sm text-graphite bg-gray-100 px-3 py-1 rounded">
                                Кількість: {item.quantity}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, item.chosenSet, item.chosenPillow, Math.max(1, parseInt(e.target.value)))}
                                className="w-16 sm:w-20 border border-gray-300 rounded p-1 text-sm focus:border-brandBrown focus:ring focus:ring-brandBrown/20"
                              />
                            )}
                            <button
                              onClick={() => removeItem(item.id, item.chosenSet, item.chosenPillow)}
                              className="text-red-500 hover:text-red-700 text-xs sm:text-sm font-medium"
                            >
                              Видалити
                            </button>
                          </div>
                          <div className="mt-2">
                            <span className="text-sm font-semibold text-brandBrown">
                              {item.price ? `${item.price * item.quantity} грн` : 'Ціна уточнюється'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <>
                  {/* Total sum display */}
                  <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <span className="text-lg font-medium text-graphite">Разом:</span>
                    <span className="text-lg sm:text-xl font-bold text-brandBrown">{totalSum} грн</span>
                  </div>

                  {/* Order button */}
                  <div className="p-4 sm:p-6 bg-white border-t border-gray-100">
                    <button
                      onClick={handleOrderClick}
                      disabled={items.length === 0}
                      className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 sm:py-4 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-sm sm:text-base"
                    >
                      Оформити замовлення
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <OrderForm onBack={handleBackToCart} />
          )}
        </div>
      </div>
    </>
  );
}