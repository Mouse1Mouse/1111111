import React, { useState } from 'react';
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

  const handleBackToCart = () => {
    setShowOrderForm(false);
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} z-50`}>
      <div className="h-full flex flex-col">
        {!showOrderForm ? (
          <>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-brandBrown">Кошик</h2>
              <button onClick={onClose} className="text-graphite hover:text-brandBrown transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <p className="text-center text-graphite">Кошик порожній</p>
              ) : (
                <div className="space-y-6">
                  {items.map((item, index) => (
                    <div key={`${item.id}-${item.chosenSet}-${item.chosenPillow}-${index}`} className="flex gap-4 border-b border-gray-100 pb-4">
                      <img src={item.imageUrl} alt={item.title} className="w-24 h-24 object-cover rounded-lg" />
                      <div className="flex-1">
                        <h3 className="font-medium text-brandBrown">{item.title}</h3>
                        <p className="text-sm text-graphite">Розмір комплекту: {item.chosenSet}</p>
                        {item.chosenPillow && (
                          <p className="text-sm text-graphite">Розмір наволочок: {item.chosenPillow}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, item.chosenSet, item.chosenPillow, Math.max(1, parseInt(e.target.value)))}
                            className="w-20 border border-gray-300 rounded p-1 text-sm"
                          />
                          <button
                            onClick={() => removeItem(item.id, item.chosenSet, item.chosenPillow)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Видалити
                          </button>
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
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                  <span className="text-lg font-medium text-graphite">Разом:</span>
                  <span className="text-lg font-semibold text-brandBrown">{totalSum} грн</span>
                </div>

                {/* Order button */}
                <div className="px-6 pb-6">
                  <button
                    onClick={() => setShowOrderForm(true)}
                    className="w-full bg-brandBrown text-white py-3 rounded hover:bg-[#8b5533] transition-colors"
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
  );
}