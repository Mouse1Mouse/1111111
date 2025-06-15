// src/components/OrderForm.tsx
import React, { useContext, useEffect, useState } from "react";
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

  // Handle city selection from datalist
  function onCitySelect(name: string) {
    const match = cities.find(
      (c) => c.Description.toLowerCase() === name.trim().toLowerCase()
    );
    if (match) {
      setSelectedCityRef(match.Ref);
      setSelectedCityName(match.Description);
      setSelectedBranchRef("");
      setSelectedBranchName("");
    } else {
      // If no exact match, clear the selection but keep the query
      setSelectedCityRef("");
      setSelectedCityName("");
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
           cityQuery.trim() && 
           selectedBranchName.trim() && 
           items.length > 0;
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      alert('Будь ласка, заповніть всі обов\'язкові поля');
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
        city: cityQuery,
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
        city: cityQuery, // Use cityQuery instead of selectedCityName
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

      // Clear cart and redirect to success page with total sum
      clearCart();
      window.location.href = `/success.html?total=${totalSum}`;
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Помилка при відправці замовлення. Спробуйте ще раз.');
    } finally {
      // ВАЖЛИВО: завжди розблокувати форму
      setIsSubmitting(false);
    }
  };

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

          {/* Місто (з пошуком) - ВИПРАВЛЕНО */}
          <label className="block">
            <span className="text-graphite font-medium mb-2 block">Місто *</span>
            <input
              type="text"
              list="city-list"
              name="city"
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                onCitySelect(e.target.value);
              }}
              autoComplete="off"
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
              autoComplete="off"
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