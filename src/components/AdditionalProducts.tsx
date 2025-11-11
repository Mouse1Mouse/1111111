import React, { useState } from "react";
import { useCart } from "../context/CartContext";

export default function AdditionalProducts() {
  const { addItem } = useCart();
  const [activeTab, setActiveTab] = useState<"rezinka" | "pidkovdra" | "navolochky" | "prostyradlo">("rezinka");

  // Резинка: вибір стандартного або кастомного розміру
  const standardSizes = [
    { size: "80×200×20", price: 250 },
    { size: "120×200×20", price: 250 },
    { size: "140×200×20", price: 250 },
    { size: "160×200×20", price: 250 },
    { size: "160×200×30", price: 450 },
    { size: "180×200×20", price: 450 },
    { size: "180×200×30", price: 450 },
    { size: "200×220×20", price: 450 }
  ];
  const [selectedStdSize, setSelectedStdSize] = useState(standardSizes[0].size);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customLength, setCustomLength] = useState("");

  // Підковдра: опції з цінами
  const pidkovdraOptions = [
    { label: "145×220", price: 800 },
    { label: "175×220", price: 900 },
    { label: "200×220", price: 1000 }
  ];
  const [selectedPidkovdra, setSelectedPidkovdra] = useState(pidkovdraOptions[0].label);
  const [qtyPidkovdra, setQtyPidkovdra] = useState(1);

  // Наволочки: опції з цінами
  const navolochOptions = [
    { label: "50×70", price: 350, shape: "прямокутні" },
    { label: "70×70", price: 400, shape: "квадратні" }
  ];
  const [selectedNavoloch, setSelectedNavoloch] = useState(navolochOptions[0].label);
  const [qtyNavoloch, setQtyNavoloch] = useState(1);

  // Простирадло: опції з цінами
  const prostyradloOptions = [
    { label: "145×220", price: 600 },
    { label: "200×220", price: 700 },
    { label: "220×240", price: 750 }
  ];
  const [selectedProstyradlo, setSelectedProstyradlo] = useState(prostyradloOptions[0].label);
  const [qtyProstyradlo, setQtyProstyradlo] = useState(1);

  // Хелпери для валідації кастомної резинки
  const maxWidth = 220;
  const maxHeight = 240;
  const maxLength = 30;
  const isCustomValid = () => {
    const w = Number(customWidth);
    const h = Number(customHeight);
    const l = Number(customLength);
    return (
      w > 0 && h > 0 && l > 0 &&
      w <= maxWidth && h <= maxHeight && l <= maxLength
    );
  };

  const handleAddRezinka = () => {
    let chosenSize = selectedStdSize;
    let rezPrice = 450; // Default price for custom sizes
    
    const chosenSize = customWidth && customHeight && customLength && isCustomValid()
      ? `${customWidth}×${customHeight}×${customLength}`
      : selectedStdSize;
    
    if (customWidth && customHeight && customLength && isCustomValid()) {
      rezPrice = 450; // Custom sizes are 450 грн
    } else {
      // Find price for standard size
      const standardSize = standardSizes.find(s => s.size === selectedStdSize);
      rezPrice = standardSize ? standardSize.price : 450;
    }
    
    addItem({
      id: `rezinka-${chosenSize}`,
      title: `Резинка (${chosenSize})`,
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/additional/rezinka.jpg",
      chosenSet: chosenSize,
      chosenPillow: "",
      quantity: 1,
      price: rezPrice,
    });
  };

  const handleAddPidkovdra = () => {
    const selectedOpt = pidkovdraOptions.find(opt => opt.label === selectedPidkovdra)!;
    addItem({
      id: `pidkovdra-${selectedOpt.label}`,
      title: `Підковдра (${selectedOpt.label})`,
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/additional/pidkovdra.jpg",
      chosenSet: selectedOpt.label,
      chosenPillow: "",
      quantity: qtyPidkovdra,
      price: selectedOpt.price,
    });
  };

  const handleAddNavolochky = () => {
    const selectedOpt = navolochOptions.find(opt => opt.label === selectedNavoloch)!;
    addItem({
      id: `navolochky-${selectedOpt.label}`,
      title: `Наволочки (${selectedOpt.label})`,
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/additional/navolochky.jpg",
      chosenSet: selectedOpt.label,
      chosenPillow: "",
      quantity: qtyNavoloch,
      price: selectedOpt.price,
    });
  };

  const handleAddProstyradlo = () => {
    const selectedOpt = prostyradloOptions.find(opt => opt.label === selectedProstyradlo)!;
    addItem({
      id: `prostyradlo-${selectedOpt.label}`,
      title: `Простирадло (${selectedOpt.label})`,
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/additional/prostyradlo.jpg",
      chosenSet: selectedOpt.label,
      chosenPillow: "",
      quantity: qtyProstyradlo,
      price: selectedOpt.price,
    });
  };

  return (
    <section id="additional" className="py-24 bg-gradient-to-br from-[#fff7ed] to-[#fdf2e9]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-semibold text-brandBrown text-center mb-12 text-shadow-sm">
          Додаткові товари
        </h2>
        
        {/* Вкладки */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex justify-center space-x-2 md:space-x-8 bg-white rounded-xl p-2 shadow-lg">
            <button
              data-tab="rezinka"
              onClick={() => setActiveTab("rezinka")}
              className={`px-4 py-3 font-medium rounded-lg transition-all duration-300 ${
                activeTab === "rezinka" 
                  ? "bg-gradient-to-r from-brandBrown to-brandBrown text-cream shadow-md" 
                  : "text-graphite hover:text-brandBrown hover:bg-cream/50"
              }`}
            >
              Резинка
            </button>
            <button
              data-tab="pidkovdra"
              onClick={() => setActiveTab("pidkovdra")}
              className={`px-4 py-3 font-medium rounded-lg transition-all duration-300 ${
                activeTab === "pidkovdra" 
                  ? "bg-gradient-to-r from-brandBrown to-brandBrown text-cream shadow-md" 
                  : "text-graphite hover:text-brandBrown hover:bg-cream/50"
              }`}
            >
              Підковдра
            </button>
            <button
              data-tab="navolochky"
              onClick={() => setActiveTab("navolochky")}
              className={`px-4 py-3 font-medium rounded-lg transition-all duration-300 ${
                activeTab === "navolochky" 
                  ? "bg-gradient-to-r from-brandBrown to-brandBrown text-cream shadow-md" 
                  : "text-graphite hover:text-brandBrown hover:bg-cream/50"
              }`}
            >
              Наволочки
            </button>
            <button
              data-tab="prostyradlo"
              onClick={() => setActiveTab("prostyradlo")}
              className={`px-4 py-3 font-medium rounded-lg transition-all duration-300 ${
                activeTab === "prostyradlo" 
                  ? "bg-gradient-to-r from-brandBrown to-brandBrown text-cream shadow-md" 
                  : "text-graphite hover:text-brandBrown hover:bg-cream/50"
              }`}
            >
              Простирадло
            </button>
          </div>
        </div>

        {/* Резинка */}
        {activeTab === "rezinka" && (
          <div id="rezinka" className="max-w-2xl mx-auto bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl">
            <h3 className="text-2xl font-semibold text-brandBrown mb-6 text-center">
              Простирадло на резинці
            </h3>
            
            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">
                Оберіть розмір:
              </label>
              <select
                value={selectedStdSize}
                onChange={e => setSelectedStdSize(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              >
                {standardSizes.map(item => (
                  <option key={item.size} value={item.size}>
                    {item.size} — {item.price} грн
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <p className="text-graphite font-medium mb-3">
                Або введіть власні розміри (450 грн, максимальні: {maxWidth}×{maxHeight}×{maxLength}):
              </p>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Ширина"
                  value={customWidth}
                  onChange={e => setCustomWidth(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Висота"
                  value={customHeight}
                  onChange={e => setCustomHeight(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Довжина"
                  value={customLength}
                  onChange={e => setCustomLength(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
                />
              </div>
              {!isCustomValid() && (customWidth || customHeight || customLength) && (
                <p className="text-red-600 text-sm mt-2">
                  Значення некоректні або перевищують максимально дозволені.
                </p>
              )}
            </div>

            <button
              onClick={handleAddRezinka}
              className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              disabled={!!(customWidth || customHeight || customLength) && !isCustomValid()}
            >
              Додати в кошик
            </button>
          </div>
        )}

        {/* Підковдра */}
        {activeTab === "pidkovdra" && (
          <div className="max-w-2xl mx-auto bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl">
            <h3 className="text-2xl font-semibold text-brandBrown mb-6 text-center">
              Підковдра
            </h3>
            
            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">
                Виберіть розмір:
              </label>
              <select
                value={selectedPidkovdra}
                onChange={e => setSelectedPidkovdra(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              >
                {pidkovdraOptions.map(opt => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label} – {opt.price} грн
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">Кількість:</label>
              <input
                type="number"
                min="1"
                value={qtyPidkovdra}
                onChange={e => setQtyPidkovdra(Math.max(1, Number(e.target.value)))}
                className="w-32 border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              />
            </div>

            <button
              onClick={handleAddPidkovdra}
              className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Додати в кошик
            </button>
          </div>
        )}

        {/* Наволочки */}
        {activeTab === "navolochky" && (
          <div className="max-w-2xl mx-auto bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl">
            <h3 className="text-2xl font-semibold text-brandBrown mb-6 text-center">
              Наволочки
            </h3>
            
            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">
                Виберіть розмір:
              </label>
              <select
                value={selectedNavoloch}
                onChange={e => setSelectedNavoloch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              >
                {navolochOptions.map(opt => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label} ({opt.shape}) – {opt.price} грн
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">Кількість:</label>
              <input
                type="number"
                min="1"
                value={qtyNavoloch}
                onChange={e => setQtyNavoloch(Math.max(1, Number(e.target.value)))}
                className="w-32 border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              />
            </div>

            <button
              onClick={handleAddNavolochky}
              className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Додати в кошик
            </button>
          </div>
        )}

        {/* Простирадло */}
        {activeTab === "prostyradlo" && (
          <div className="max-w-2xl mx-auto bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl">
            <h3 className="text-2xl font-semibold text-brandBrown mb-6 text-center">
              Простирадло
            </h3>
            
            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">
                Виберіть розмір:
              </label>
              <select
                value={selectedProstyradlo}
                onChange={e => setSelectedProstyradlo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              >
                {prostyradloOptions.map(opt => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label} – {opt.price} грн
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block mb-3 text-graphite font-medium">Кількість:</label>
              <input
                type="number"
                min="1"
                value={qtyProstyradlo}
                onChange={e => setQtyProstyradlo(Math.max(1, Number(e.target.value)))}
                className="w-32 border border-gray-300 rounded-lg p-3 focus:border-brandBrown focus:ring focus:ring-brandBrown/20 transition-colors"
              />
            </div>

            <button
              onClick={handleAddProstyradlo}
              className="w-full bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-6 py-3 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Додати в кошик
            </button>
          </div>
        )}
      </div>
    </section>
  );
}