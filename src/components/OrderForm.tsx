// src/components/OrderForm.tsx
import React, { useContext, useEffect, useState, useRef } from "react";
import { useCart } from "../context/CartContext";

interface OrderFormProps {
  onBack: () => void;
}

// Helper function to encode form data for Netlify
function encode(data: Record<string, string>) {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
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

  // Nova Poshta integration with debounce
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<{ Ref: string; Description: string }[]>([]);
  const [filteredCities, setFilteredCities] = useState<typeof cities>([]);
  const [selectedCityRef, setSelectedCityRef] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const [branches, setBranches] = useState<{ Ref: string; Description: string }[]>([]);
  const [selectedBranchRef, setSelectedBranchRef] = useState("");
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Debounce refs
  const cityDebounceRef = useRef<NodeJS.Timeout>();
  const branchDebounceRef = useRef<NodeJS.Timeout>();

  const NOVA_POSHTA_KEY = import.meta.env.VITE_NOVA_POSHTA_API_KEY;

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

  // Debounced city search function
  const searchCities = async (query: string) => {
    if (!NOVA_POSHTA_KEY || !query.trim() || query.length < 2) {
      setFilteredCities([]);
      return;
    }

    setIsLoadingCities(true);
    
    try {
      const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: NOVA_POSHTA_KEY,
          modelName: "Address",
          calledMethod: "getCities",
          methodProperties: { 
            FindByString: query.trim(),
            Limit: 20 // Обмежуємо кількість результатів
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setFilteredCities(data.data || []);
      } else {
        console.error("Nova Poshta API error:", data.errors);
        setFilteredCities([]);
      }
    } catch (error) {
      console.error("Помилка при пошуку міст:", error);
      setFilteredCities([]);
    } finally {
      setIsLoadingCities(false);
    }
  };

  // Handle city input with debounce
  const handleCityInput = (value: string) => {
    setCityQuery(value);
    
    // Clear previous timeout
    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
    }

    // Reset city selection if input doesn't match
    if (selectedCityName && value !== selectedCityName) {
      setSelectedCityRef("");
      setSelectedCityName("");
      setSelectedBranchRef("");
      setSelectedBranchName("");
      setBranches([]);
    }

    // Set new timeout for search
    cityDebounceRef.current = setTimeout(() => {
      searchCities(value);
    }, 400); // 400ms debounce
  };

  // Fetch branches when selectedCityRef changes
  useEffect(() => {
    async function fetchBranches() {
      if (!selectedCityRef || !NOVA_POSHTA_KEY) {
        setBranches([]);
        return;
      }
      
      setIsLoadingBranches(true);
      
      try {
        const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: NOVA_POSHTA_KEY,
            modelName: "Address",
            calledMethod: "getWarehouses",
            methodProperties: { 
              CityRef: selectedCityRef,
              Limit: 50 // Обмежуємо кількість відділень
            },
          }),
        });
        const data = await response.json();
        if (data.success) {
          setBranches(data.data || []);
        } else {
          console.error("Nova Poshta API error:", data.errors);
          setBranches([]);
        }
      } catch (error) {
        console.error("Помилка при завантаженні відділень:", error);
        setBranches([]);
      } finally {
        setIsLoadingBranches(false);
      }
    }
    fetchBranches();
  }, [selectedCityRef, NOVA_POSHTA_KEY]);

  // Handle city selection from datalist
  const onCitySelect = (name: string) => {
    const match = filteredCities.find(
      (c) => c.Description.toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      setSelectedCityRef(match.Ref);
      setSelectedCityName(match.Description);
      setCityQuery(match.Description); // Sync the input value
      setSelectedBranchRef("");
      setSelectedBranchName("");
      setFilteredCities([]); // Clear suggestions after selection
    }
  };

  // Handle branch selection
  const onBranchSelect = (name: string) => {
    setSelectedBranchName(name);
    const match = branches.find(
      (b) => b.Description.toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      setSelectedBranchRef(match.Ref);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return fullName.trim() && 
           phone.trim() && 
           contact.trim() && 
           selectedCityName.trim() && // Use selectedCityName instead of cityQuery
           selectedBranchName.trim() && 
           items.length > 0;
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      alert('Будь ласка, заповніть всі обов\'язкові поля та оберіть місто зі списку');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save data to localStorage for success page
      localStorage.setItem('totalSum', totalSum.toString());
      localStorage.setItem('orderData', JSON.stringify({
        fullName,
        phone,
        contact,
        city: selectedCityName, // Use selected city name
        branch: selectedBranchName,
        orderSummary,
        totalSum
      }));

      // Prepare form data for Netlify
      const formData = {
        "form-name": "offline-order",
        fullName,
        phone,
        contact,
        city: selectedCityName, // Use selected city name
        branch: selectedBranchName,
        orderSummary,
        totalSum: totalSum.toString(),
        comments
      };

      console.log('Submitting form data:', formData);

      // Submit to Netlify using fetch
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(formData)
      });

      console.log('Form submitted successfully');

      // Відправляємо Telegram сповіщення
      try {
        // Збираємо детальну інформацію про замовлення
        const detailedOrderSummary = items
          .map((item) => {
            let itemDetails = `• ${item.title}`;
            itemDetails += `\n  Розмір: ${item.chosenSet}`;
            if (item.chosenPillow) {
              itemDetails += `\n  Наволочки: ${item.chosenPillow}`;
            }
            itemDetails += `\n  Кількість: ${item.quantity}`;
            itemDetails += `\n  Ціна: ${item.price ? item.price * item.quantity : 'уточнюється'} грн`;
            return itemDetails;
          })
          .join('\n\n');

        await fetch("/.netlify/functions/telegram-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            phone,
            contact,
            city: selectedCityName,
            branch: selectedBranchName,
            orderSummary: detailedOrderSummary,
            totalSum: totalSum.toString(),
            comments,
            paymentMethod: 'Офлайн замовлення (буде уточнено)'
          })
        });
        console.log('Telegram notification sent');
      } catch (telegramError) {
        console.error('Telegram notification failed:', telegramError);
        // Не блокуємо процес замовлення через помилку Telegram
      }

      // Clear cart and redirect to success page with total sum
      clearCart();
      window.location.href = `/success.html?total=${totalSum}`;
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Помилка при відправці замовлення. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (cityDebounceRef.current) {
        clearTimeout(cityDebounceRef.current);
      }
      if (branchDebounceRef.current) {
        clearTimeout(branchDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="text-graphite hover:text-brandBrown transition-colors mr-4"
          disabled={isSubmitting}
        >
          ← Назад до кошика
        </button>
        <h2 className="text-2xl font-semibold text-brandBrown">Оформлення замовлення</h2>
      </div>

      {/* Order Form */}
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 h-[80vh] overflow-y-auto">
        <form
          onSubmit={handleFormSubmit}
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

          {/* Місто (з debounced пошуком) */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">
              Місто * 
              {isLoadingCities && <span className="text-sm text-blue-600 ml-2">Пошук...</span>}
            </span>
            <div className="relative">
              <input
                type="text"
                list="city-list"
                name="city"
                value={cityQuery}
                onChange={(e) => handleCityInput(e.target.value)}
                onBlur={(e) => {
                  // Check if the entered value matches any city
                  const match = filteredCities.find(
                    (c) => c.Description.toLowerCase() === e.target.value.trim().toLowerCase()
                  );
                  if (match) {
                    onCitySelect(match.Description);
                  }
                }}
                autoComplete="off"
                required
                disabled={!NOVA_POSHTA_KEY || isSubmitting}
                placeholder={NOVA_POSHTA_KEY ? "Почніть вводити місто (мін. 2 символи)..." : "API ключ не налаштований"}
                className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
              />
              {selectedCityName && (
                <div className="absolute right-3 top-3 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
            </div>
            <datalist id="city-list">
              {filteredCities.slice(0, 10).map((c) => ( // Показуємо максимум 10 результатів
                <option key={c.Ref} value={c.Description} />
              ))}
            </datalist>
            {selectedCityName && (
              <p className="text-sm text-green-600 mt-1">✓ Обрано: {selectedCityName}</p>
            )}
          </label>

          {/* Відділення Нової Пошти */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">
              Відділення Нової Пошти *
              {isLoadingBranches && <span className="text-sm text-blue-600 ml-2">Завантаження...</span>}
            </span>
            <div className="relative">
              <input
                type="text"
                list="branch-list"
                name="branch"
                value={selectedBranchName}
                onChange={(e) => {
                  setSelectedBranchName(e.target.value);
                  onBranchSelect(e.target.value);
                }}
                autoComplete="off"
                required
                disabled={!selectedCityRef || isSubmitting || isLoadingBranches}
                placeholder={
                  selectedCityRef
                    ? isLoadingBranches 
                      ? "Завантаження відділень..."
                      : "Оберіть відділення..."
                    : "Спочатку оберіть місто"
                }
                className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors disabled:bg-gray-100"
              />
              {selectedBranchRef && (
                <div className="absolute right-3 top-3 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
            </div>
            <datalist id="branch-list">
              {branches.map((b) => (
                <option key={b.Ref} value={b.Description} />
              ))}
            </datalist>
            {selectedBranchRef && (
              <p className="text-sm text-green-600 mt-1">✓ Обрано відділення</p>
            )}
          </label>

          {/* Замовлення (display only) */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">Замовлення</span>
            <textarea
              readOnly
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-graphite resize-none"
              value={orderSummary}
            />
          </label>

          {/* Загальна сума (display) */}
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
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitting}
              placeholder="Додаткові побажання щодо замовлення..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors resize-none disabled:bg-gray-100"
            />
          </label>

          {/* Кнопка відправки */}
          <button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isSubmitting ? 'Відправка замовлення...' : 'Оформити замовлення'}
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
    </div>
  );
}