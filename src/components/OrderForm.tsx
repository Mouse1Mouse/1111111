// src/components/OrderForm.tsx
import React, { useContext, useEffect, useState } from "react";
import { useCart } from "../context/CartContext";

interface OrderFormProps {
  onBack: () => void;
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

export default function OrderForm({ onBack }: OrderFormProps) {
  const { items, clearCart } = useCart();
  const [orderSummary, setOrderSummary] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [comments, setComments] = useState("");

  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState("");

  // Nova Poshta integration
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<{ Ref: string; Description: string }[]>([]);
  const [filteredCities, setFilteredCities] = useState<typeof cities>([]);
  const [selectedCityRef, setSelectedCityRef] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");

  const [branches, setBranches] = useState<{ Ref: string; Description: string }[]>([]);
  const [selectedBranchRef, setSelectedBranchRef] = useState("");
  const [selectedBranchName, setSelectedBranchName] = useState("");

  const NOVA_POSHTA_KEY = import.meta.env.VITE_NOVA_POSHTA_API_KEY;
  const MONOBANK_TOKEN = 'mpbXCUIRaGB_E54bLbeSRCw';

  // Build order summary text
  useEffect(() => {
    const summary = items
      .map(
        (item) =>
          `${item.title} (${item.chosenSet}${
            item.chosenPillow ? `, наволочки: ${item.chosenPillow}` : ""
          }) ×${item.quantity} — ${item.price ? item.price * item.quantity : 'ціна уточнюється'} грн`
      )
      .join("\n");
    setOrderSummary(summary);
  }, [items]);

  // Calculate total sum
  const totalSum = items.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );

  // Fetch list of cities on mount
  useEffect(() => {
    async function fetchCities() {
      if (!NOVA_POSHTA_KEY) {
        console.warn("Nova Poshta API key not found. Please add VITE_NOVA_POSHTA_API_KEY to your .env file");
        return;
      }
      
      try {
        const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: NOVA_POSHTA_KEY,
            modelName: "Address",
            calledMethod: "getCities",
            methodProperties: { FindByString: "" },
          }),
        });
        const data = await response.json();
        if (data.success) {
          setCities(data.data);
          setFilteredCities(data.data);
        } else {
          console.error("Nova Poshta API error:", data.errors);
        }
      } catch (error) {
        console.error("Помилка при завантаженні міст:", error);
      }
    }
    fetchCities();
  }, [NOVA_POSHTA_KEY]);

  // Filter cities based on query
  useEffect(() => {
    setFilteredCities(
      cities.filter((c) =>
        c.Description.toLowerCase().includes(cityQuery.trim().toLowerCase())
      )
    );
  }, [cityQuery, cities]);

  // Fetch branches when selectedCityRef changes
  useEffect(() => {
    async function fetchBranches() {
      if (!selectedCityRef || !NOVA_POSHTA_KEY) {
        setBranches([]);
        return;
      }
      try {
        const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: NOVA_POSHTA_KEY,
            modelName: "Address",
            calledMethod: "getWarehouses",
            methodProperties: { CityRef: selectedCityRef },
          }),
        });
        const data = await response.json();
        if (data.success) {
          setBranches(data.data);
        } else {
          console.error("Nova Poshta API error:", data.errors);
        }
      } catch (error) {
        console.error("Помилка при завантаженні відділень:", error);
      }
    }
    fetchBranches();
  }, [selectedCityRef, NOVA_POSHTA_KEY]);

  // Handle city selection
  function onCitySelect(name: string) {
    setCityQuery(name);
    const match = cities.find(
      (c) => c.Description.toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      setSelectedCityRef(match.Ref);
      setSelectedCityName(match.Description);
      setSelectedBranchRef("");
      setSelectedBranchName("");
    }
  }

  // Handle branch selection
  function onBranchSelect(name: string) {
    setSelectedBranchName(name);
    const match = branches.find(
      (b) => b.Description.toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      setSelectedBranchRef(match.Ref);
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    return fullName.trim() && 
           phone.trim() && 
           contact.trim() && 
           selectedCityName.trim() && 
           selectedBranchName.trim() && 
           items.length > 0;
  };

  // Netlify Forms submission - стандартна відправка без JavaScript
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isFormValid()) {
      e.preventDefault();
      alert('Будь ласка, заповніть всі обов\'язкові поля');
      return;
    }

    // Дозволяємо стандартну відправку форми
    // Netlify автоматично обробить форму і перенаправить на success.html
    setIsSubmitting(true);
    
    // Очищаємо кошик після відправки
    setTimeout(() => {
      clearCart();
    }, 1000);
  };

  const handleMonoPayment = async () => {
    if (isPaymentProcessing) return;
    
    setIsPaymentProcessing(true);
    
    try {
      // Check if MonoPay SDK is loaded
      if (!window.MonoPay) {
        throw new Error('MonoPay SDK не завантажено');
      }

      // Generate unique order ID
      const orderId = `MIVA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create MonoPay instance
      const monoPay = window.MonoPay.create({
        token: MONOBANK_TOKEN,
        amount: totalSum * 100, // MonoPay expects amount in kopecks
        orderId: orderId,
        onSuccess: (response) => {
          console.log('Payment successful:', response);
          
          // Clear cart and redirect to success page
          clearCart();
          
          // Redirect to success page with payment info
          window.location.href = '/success.html?payment=monopay&orderId=' + orderId;
        },
        onError: (error) => {
          console.error('Payment error:', error);
          alert('Помилка при оплаті. Спробуйте ще раз або оберіть оплату на рахунок.');
          setIsPaymentProcessing(false);
        },
        onCancel: () => {
          console.log('Payment cancelled');
          setIsPaymentProcessing(false);
        }
      });

      // Open payment modal
      monoPay.open();
      
    } catch (error) {
      console.error('MonoPay initialization error:', error);
      alert('Помилка ініціалізації платіжної системи. Спробуйте пізніше або оберіть оплату на рахунок.');
      setIsPaymentProcessing(false);
    }
  };

  const handleBankTransfer = () => {
    // Clear cart and redirect to success page for bank transfer
    clearCart();
    window.location.href = '/success.html?payment=bank';
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="text-graphite hover:text-brandBrown transition-colors mr-4"
          disabled={isSubmitting || isPaymentProcessing}
        >
          ← Назад до кошика
        </button>
        <h2 className="text-2xl font-semibold text-brandBrown">Оформлення замовлення</h2>
      </div>

      {/* Order Form */}
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 h-[80vh] overflow-y-auto">
        {/* Hidden form for Netlify detection */}
        <form name="offline-order" netlify="true" hidden>
          <input type="text" name="fullName" />
          <input type="tel" name="phone" />
          <input type="text" name="contact" />
          <input type="text" name="city" />
          <input type="text" name="branch" />
          <textarea name="orderSummary"></textarea>
          <input type="text" name="totalSum" />
          <textarea name="comments"></textarea>
        </form>

        <form
          name="offline-order"
          method="POST"
          action="/success.html?payment=bank"
          data-netlify="true"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="form-name" value="offline-order" />
          
          {/* ПІБ */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">ПІБ *</span>
            <input
              type="text"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
            />
          </label>

          {/* Телефон */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">Телефон *</span>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="+380..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
            />
          </label>

          {/* Email або Viber */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">Email або Viber *</span>
            <input
              type="text"
              name="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="email@example.com або номер Viber"
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
            />
          </label>

          {/* Місто (з пошуком) */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">Місто *</span>
            <input
              type="text"
              list="city-list"
              name="city"
              value={selectedCityName || cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                onCitySelect(e.target.value);
              }}
              required
              disabled={!NOVA_POSHTA_KEY || isSubmitting}
              placeholder={NOVA_POSHTA_KEY ? "Почніть вводити місто..." : "API ключ не налаштований"}
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
            />
            <datalist id="city-list">
              {filteredCities.map((c) => (
                <option key={c.Ref} value={c.Description} />
              ))}
            </datalist>
          </label>

          {/* Відділення Нової Пошти */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">
              Відділення Нової Пошти *
            </span>
            <input
              type="text"
              list="branch-list"
              name="branch"
              value={selectedBranchName}
              onChange={(e) => {
                setSelectedBranchName(e.target.value);
                onBranchSelect(e.target.value);
              }}
              required
              disabled={!selectedCityRef || isSubmitting}
              placeholder={
                selectedCityRef
                  ? "Оберіть відділення..."
                  : "Спочатку оберіть місто"
              }
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
            />
            <datalist id="branch-list">
              {branches.map((b) => (
                <option key={b.Ref} value={b.Description} />
              ))}
            </datalist>
          </label>

          {/* Замовлення (приховане поле) */}
          <input type="hidden" name="orderSummary" value={orderSummary} />

          {/* Замовлення (текстове поле, тільки для читання) */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">Замовлення</span>
            <textarea
              readOnly
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-graphite resize-none"
              value={orderSummary}
            />
          </label>

          {/* Загальна сума */}
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
            <span className="text-lg font-medium text-graphite">Загальна сума:</span>
            <span className="text-lg font-semibold text-brandBrown">{totalSum} грн</span>
          </div>
          <input type="hidden" name="totalSum" value={totalSum} />

          {/* Коментар */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">
              Ваш коментар/побажання
            </span>
            <textarea
              name="comments"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitting}
              placeholder="Додаткові побажання щодо замовлення..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors resize-none disabled:bg-gray-100"
            />
          </label>

          {/* Кнопка відправити замовлення */}
          <button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isSubmitting ? 'Відправляємо замовлення...' : 'Відправити замовлення'}
          </button>

          {/* Альтернативні способи оплати */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-center text-sm text-gray-600 mb-4">
              Або оберіть спосіб онлайн-оплати:
            </p>
            
            <div className="space-y-3">
              {/* MonoPay SDK Option */}
              <button
                type="button"
                onClick={handleMonoPayment}
                disabled={isPaymentProcessing || !isFormValid()}
                className="w-full flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-brandBrown hover:bg-cream/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-graphite text-sm">
                      {isPaymentProcessing ? 'Обробка...' : 'Оплатити картою онлайн'}
                    </h3>
                    <p className="text-xs text-gray-600">MonoPay (безпечно)</p>
                  </div>
                </div>
                <div className="text-blue-600 font-medium text-sm">Швидко</div>
              </button>
            </div>
          </div>
        </form>

        {!NOVA_POSHTA_KEY && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Увага:</strong> Для роботи з Nova Poshta API потрібно додати ключ у файл .env:
              <br />
              <code className="bg-yellow-100 px-2 py-1 rounded">VITE_NOVA_POSHTA_API_KEY=ваш_ключ</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}