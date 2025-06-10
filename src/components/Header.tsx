import React, { useState, useEffect } from "react";
import { ShoppingBag, Palette } from "lucide-react";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { items, toggleCart, isCartOpen } = useCart();
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleColorCombination = () => {
    const message = encodeURIComponent(
      "Привіт! Мені потрібна допомога з комбінуванням кольорів постільної білизни. Чи можете допомогти підібрати гарне поєднання кольорів для мого інтер'єру?"
    );
    const instagramUrl = `https://www.instagram.com/direct/new/?text=${message}`;
    window.open(instagramUrl, '_blank');
  };
  
  return (
    <>
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          scrolled 
            ? "bg-gradient-to-b from-[rgba(255,247,237,0.9)] to-[rgba(255,247,237,0.7)] border-gold/20 shadow-sm backdrop-blur-sm" 
            : "bg-gradient-to-b from-[rgba(255,247,237,0.8)] to-[rgba(255,247,237,0.6)] border-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a 
            href="#" 
            className="text-3xl md:text-4xl font-extrabold text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200"
          >
            MIVA
          </a>
          
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <a 
                  href="#about" 
                  className="text-graphite hover:text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200 font-medium"
                >
                  Про нас
                </a>
              </li>
              <li>
                <a 
                  href="#gallery" 
                  className="text-graphite hover:text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200 font-medium"
                >
                  Галерея
                </a>
              </li>
              <li>
                <a 
                  href="#features" 
                  className="text-graphite hover:text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200 font-medium"
                >
                  Додатки та функції
                </a>
              </li>
              <li>
                <a 
                  href="#additional" 
                  className="text-graphite hover:text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200 font-medium"
                >
                  Додаткові товари
                </a>
              </li>
              <li>
                <a 
                  href="#contacts" 
                  className="text-graphite hover:text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200 font-medium"
                >
                  Контакти
                </a>
              </li>
            </ul>
          </nav>
          
          <div className="flex items-center gap-4">
            {/* Color Combination Button */}
            <button 
              onClick={handleColorCombination}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-4 py-2 rounded-lg font-medium text-cream transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              title="Допомога з комбінуванням кольорів"
            >
              <Palette size={18} />
              <span className="text-sm">Комбінація кольорів</span>
            </button>

            {/* Mobile Color Combination Button */}
            <button 
              onClick={handleColorCombination}
              className="md:hidden relative text-graphite hover:text-brandBrown transition-colors p-2"
              title="Допомога з комбінуванням кольорів"
            >
              <Palette size={24} />
            </button>
            
            <button 
              onClick={toggleCart}
              className="relative text-graphite hover:text-brandBrown transition-colors p-2"
            >
              <ShoppingBag size={24} />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </button>
            
            <div className="md:hidden">
              <button className="text-graphite hover:text-brandBrown transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <CartDrawer isOpen={isCartOpen} onClose={toggleCart} />
    </>
  );
}