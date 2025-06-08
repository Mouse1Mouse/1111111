// src/components/OrderForm.tsx
import React, { useContext, useEffect, useState } from "react";
import { useCart } from "../context/CartContext";

interface OrderFormProps {
  onBack: () => void;
}

export default function OrderForm({ onBack }: OrderFormProps) {
  const { items, clearCart } = useCart();
  const [orderSummary, setOrderSummary] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");

  // Nova Poshta integration
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<{ Ref: string; Description: string }[]>([]);
  const [filteredCities, setFilteredCities] = useState<typeof cities>([]);
  const [selectedCityRef, setSelectedCityRef] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");

  const [branches, setBranches] = useState<{ Ref: string; Description: string }[]>([]);
  const [selectedBranchRef, setSelectedBranchRef] = useState("");
  const [selectedBranchName, setSelectedBranchName] = useState("");

  const apiKey = import.meta.env.VITE_NOVA_POSHTA_API_KEY;

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
      if (!apiKey) {
        console.warn("Nova Poshta API key not found. Please add VITE_NOVA_POSHTA_API_KEY to your .env file");
        return;
      }
      
      try {
        const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKey,
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
  }, [apiKey]);

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
      if (!selectedCityRef || !apiKey) {
        setBranches([]);
        return;
      }
      try {
        const response = await fetch("https://api.novaposhta.ua/v2.0/json/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKey,
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
  }, [selectedCityRef, apiKey]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as any).toString()
      });

      if (response.ok) {
        clearCart();
        // Redirect to success page
        window.location.href = '/success.html';
      } else {
        alert('Помилка при відправці замовлення. Спробуйте ще раз.');
      }
    } catch (error) {
      alert('Помилка при відправці замовлення. Спробуйте ще раз.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="text-graphite hover:text-brandBrown transition-colors mr-4"
        >
          ← Назад до кошика
        </button>
        <h2 className="text-2xl font-semibold text-brandBrown">Оформлення замовлення</h2>
      </div>

      <section className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg mt-8 h-[80vh] overflow-y-auto">
        <form
          name="offline-order"
          method="POST"
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
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
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
              placeholder="+380..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
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
              placeholder="email@example.com або номер Viber"
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
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
              placeholder={apiKey ? "Почніть вводити місто..." : "API ключ не налаштований"}
              disabled={!apiKey}
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
              placeholder={
                selectedCityRef
                  ? "Оберіть відділення..."
                  : "Спочатку оберіть місто"
              }
              disabled={!selectedCityRef}
              className={`w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors ${
                !selectedCityRef ? "bg-gray-100" : ""
              }`}
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
              placeholder="Додаткові побажання щодо замовлення..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors resize-none"
            />
          </label>

          {/* Галочка про оплату на рахунок */}
          <label className="flex items-start">
            <input
              type="checkbox"
              name="payToBank"
              required
              className="mr-3 mt-1 w-4 h-4 text-brandBrown bg-gray-100 border-gray-300 rounded focus:ring-brandBrown focus:ring-2"
            />
            <span className="text-graphite">
              Я підтверджую, що оплачу замовлення на банківський рахунок після отримання реквізитів *
            </span>
          </label>

          {/* Кнопка відправити замовлення */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 mb-4"
          >
            Відправити замовлення
          </button>
        </form>

        {!apiKey && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Увага:</strong> Для роботи з Nova Poshta API потрібно додати ключ у файл .env:
              <br />
              <code className="bg-yellow-100 px-2 py-1 rounded">VITE_NOVA_POSHTA_API_KEY=ваш_ключ</code>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}