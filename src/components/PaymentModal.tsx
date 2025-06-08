import React, { useState } from 'react';
import { X, CreditCard, Building2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartItem {
  id: string;
  title: string;
  imageUrl: string;
  chosenSet: string;
  chosenPillow: string;
  quantity: number;
  price?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentMethodSelect: (method: 'monopay' | 'bank') => void;
  totalAmount: number;
  cartItems: CartItem[];
}

declare global {
  interface Window {
    MonoPay: {
      create: (config: {
        token: string;
        amount: number;
        orderId: string;
        onSuccess: (response: any) => void;
        onError: (error: any) => void;
        onCancel: () => void;
      }) => {
        open: () => void;
      };
    };
  }
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onPaymentMethodSelect, 
  totalAmount, 
  cartItems 
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { clearCart } = useCart();

  const handleMonoPayment = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Check if MonoPay SDK is loaded
      if (!window.MonoPay) {
        throw new Error('MonoPay SDK не завантажено');
      }

      // Generate unique order ID
      const orderId = `MIVA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create MonoPay instance
      const monoPay = window.MonoPay.create({
        token: 'mpbXCUIRaGB_E54bLbeSRCw',
        amount: totalAmount * 100, // MonoPay expects amount in kopecks
        orderId: orderId,
        onSuccess: (response) => {
          console.log('Payment successful:', response);
          
          // Clear cart and redirect to success page
          clearCart();
          onClose();
          
          // Redirect to success page with payment info
          window.location.href = '/success.html?payment=monopay&orderId=' + orderId;
        },
        onError: (error) => {
          console.error('Payment error:', error);
          alert('Помилка при оплаті. Спробуйте ще раз або оберіть інший спосіб оплати.');
          setIsProcessing(false);
        },
        onCancel: () => {
          console.log('Payment cancelled');
          setIsProcessing(false);
        }
      });

      // Open payment modal
      monoPay.open();
      
    } catch (error) {
      console.error('MonoPay initialization error:', error);
      alert('Помилка ініціалізації платіжної системи. Спробуйте пізніше або оберіть оплату на рахунок.');
      setIsProcessing(false);
    }
  };

  const handleBankTransfer = () => {
    onPaymentMethodSelect('bank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-brandBrown">Оберіть спосіб оплати</h2>
          <button 
            onClick={onClose} 
            className="text-graphite hover:text-brandBrown transition-colors"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-graphite">Сума до оплати:</span>
            <span className="text-xl font-bold text-brandBrown">{totalAmount} грн</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* MonoPay Option */}
          <button
            onClick={handleMonoPayment}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-brandBrown hover:bg-cream/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                <CreditCard className="text-white" size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-graphite">
                  {isProcessing ? 'Обробка...' : 'MonoPay'}
                </h3>
                <p className="text-sm text-gray-600">Картою онлайн</p>
              </div>
            </div>
            <div className="text-green-600 font-medium">Швидко</div>
          </button>

          {/* Bank Transfer Option */}
          <button
            onClick={handleBankTransfer}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-brandBrown hover:bg-cream/30 transition-all duration-200 disabled:opacity-50"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-brandBrown to-gold rounded-lg flex items-center justify-center mr-4">
                <Building2 className="text-white" size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-graphite">Банківський переказ</h3>
                <p className="text-sm text-gray-600">На рахунок</p>
              </div>
            </div>
            <div className="text-blue-600 font-medium">Надійно</div>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Оберіть зручний для вас спосіб оплати
          </p>
        </div>
      </div>
    </div>
  );
}