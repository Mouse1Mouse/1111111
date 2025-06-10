import React, { useState, useEffect } from "react";
import { ShoppingBag, Palette, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    // Прокручуємо до конструктора кольорів
    const constructorSection = document.getElementById('constructor');
    if (constructorSection) {
      constructorSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCart();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
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
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200"
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
                  href="#constructor" 
                  className="text-graphite hover:text-brandBrown hover:underline hover:decoration-gold decoration-2 transition-all duration-200 font-medium"
                >
                  Конструктор
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
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Color Combination Button - Desktop */}
            <button 
              onClick={handleColorCombination}
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-3 py-2 rounded-lg font-medium text-cream transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
              title="Конструктор кольорових комбінацій"
            >
              <Palette size={16} />
              <span>Конструктор кольорів</span>
            </button>

            {/* Color Combination Button - Mobile */}
            <button 
              onClick={handleColorCombination}
              className="lg:hidden relative text-graphite hover:text-brandBrown transition-colors p-2"
              title="Конструктор кольорових комбінацій"
            >
              <Palette size={20} />
            </button>
            
            {/* Cart Button */}
            <button 
              onClick={handleCartClick}
              className="relative text-graphite hover:text-brandBrown transition-colors p-2 touch-manipulation"
              aria-label="Відкрити кошик"
            >
              <ShoppingBag size={24} />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {items.length}
                </span>
              )}
            </button>
            
            {/* Mobile Menu Button */}
            <button 
              onClick={toggleMobileMenu}
              className="md:hidden text-graphite hover:text-brandBrown transition-colors p-2"
              aria-label="Відкрити меню"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <nav className="container mx-auto px-4 py-4">
              <ul className="space-y-4">
                <li>
                  <a 
                    href="#about" 
                    onClick={closeMobileMenu}
                    className="block text-graphite hover:text-brandBrown transition-colors font-medium py-2"
                  >
                    Про нас
                  </a>
                </li>
                <li>
                  <a 
                    href="#gallery" 
                    onClick={closeMobileMenu}
                    className="block text-graphite hover:text-brandBrown transition-colors font-medium py-2"
                  >
                    Галерея
                  </a>
                </li>
                <li>
                  <a 
                    href="#constructor" 
                    onClick={closeMobileMenu}
                    className="block text-graphite hover:text-brandBrown transition-colors font-medium py-2"
                  >
                    Конструктор
                  </a>
                </li>
                <li>
                  <a 
                    href="#features" 
                    onClick={closeMobileMenu}
                    className="block text-graphite hover:text-brandBrown transition-colors font-medium py-2"
                  >
                    Додатки та функції
                  </a>
                </li>
                <li>
                  <a 
                    href="#additional" 
                    onClick={closeMobileMenu}
                    className="block text-graphite hover:text-brandBrown transition-colors font-medium py-2"
                  >
                    Додаткові товари
                  </a>
                </li>
                <li>
                  <a 
                    href="#contacts" 
                    onClick={closeMobileMenu}
                    className="block text-graphite hover:text-brandBrown transition-colors font-medium py-2"
                  >
                    Контакти
                  </a>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      handleColorCombination();
                      closeMobileMenu();
                    }}
                    className="w-full text-left bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-4 py-3 rounded-lg font-medium text-cream transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <Palette size={16} />
                    <span>Конструктор кольорів</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </header>
      
      <CartDrawer isOpen={isCartOpen} onClose={toggleCart} />
    </>
  );
}