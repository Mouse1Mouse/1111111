import React, { useState, useEffect } from "react";
import { ShoppingBag, Menu, X } from "lucide-react";
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
              </ul>
            </nav>
          </div>
        )}
      </header>
      
      <CartDrawer isOpen={isCartOpen} onClose={toggleCart} />
    </>
  );
}