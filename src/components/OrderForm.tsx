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

  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isSubmitting || !isFormValid()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create invoice directly with Monobank API
      const orderId = `MIVA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const invoiceData = {
        amount: totalSum * 100, // Convert to kopecks
        ccy: 980, // UAH currency code
        merchantPaymInfo: {
          reference: orderId,
          destination: "Оплата замовлення MIVA",
          comment: `Замовлення від ${fullName}, тел: ${phone}`,
          customerEmails: [contact.includes('@') ? contact : '']
        },
        redirectUrl: `${window.location.origin}/success.html?payment=monopay&orderId=${orderId}`,
        webHookUrl: `${window.location.origin}/webhook/monobank`
      };

      const response = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Token': MONOBANK_TOKEN
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (response.ok && result.invoiceId) {
        // Invoice created successfully, show payment options
        setIsFormSubmitted(true);
      } else {
        console.error('Monobank API error:', result);
        alert('Помилка при створенні рахунку. Спробуйте ще раз.');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Помилка при відправці замовлення. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
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

      {!isFormSubmitted ? (
        // Order Form
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 h-[80vh] overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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
                type="text"
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
                value={cityQuery}
                onChange={(e) => onCitySelect(e.target.value)}
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
                onChange={(e) => onBranchSelect(e.target.value)}
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

            {/* Замовлення (текстове поле, тільки для читання) */}
            <label className="block">
              <span className="text-graphite font-medium mb-2 block">Замовлення</span>
              <textarea
                name="orderSummary"
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

            {/* Коментар */}
            <label className="block">
              <span className="text-graphite font-medium mb-2 block">
                Ваш коментар/побажання
              </span>
              <textarea
                name="comments"
                rows={3}
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
              {isSubmitting ? 'Створюємо рахунок...' : 'Оформити замовлення'}
            </button>
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
      ) : (
        // Payment Options (shown after form submission)
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-brandBrown mb-2">Рахунок створено!</h3>
            <p className="text-graphite mb-4">Тепер оберіть спосіб оплати:</p>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-graphite">Сума до оплати:</span>
              <span className="text-xl font-bold text-brandBrown">{totalSum} грн</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* MonoPay Option */}
            <button
              onClick={handleMonoPayment}
              disabled={isPaymentProcessing}
              className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-brandBrown hover:bg-cream/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-graphite">
                    {isPaymentProcessing ? 'Обробка...' : 'Оплатити онлайн через Monobank'}
                  </h3>
                  <p className="text-sm text-gray-600">Картою онлайн (MonoPay)</p>
                </div>
              </div>
              <div className="text-green-600 font-medium">Швидко</div>
            </button>

            {/* Bank Transfer Option */}
            <button
              onClick={handleBankTransfer}
              disabled={isPaymentProcessing}
              className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-brandBrown hover:bg-cream/30 transition-all duration-200 disabled:opacity-50"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-brandBrown to-gold rounded-lg flex items-center justify-center mr-4">
                  <svg className="text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
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
      )}
    </div>
  );
}