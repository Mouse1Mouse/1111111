import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#fdf2e9] to-[#fffafb] py-8 border-t border-gold/20">
      <div className="container mx-auto px-4 text-center">
        <p className="text-md md:text-lg text-graphite opacity-90">
          © 2025 MIVA. Усі права захищено.
        </p>
        <div className="mt-6 flex justify-center space-x-6">
          <a href="#about" className="text-graphite hover:text-brandBrown transition-colors duration-200 text-sm">
            Про нас
          </a>
          <a href="#gallery" className="text-graphite hover:text-brandBrown transition-colors duration-200 text-sm">
            Галерея
          </a>
          <a href="#contacts" className="text-graphite hover:text-brandBrown transition-colors duration-200 text-sm">
            Контакти
          </a>
        </div>
      </div>
    </footer>
  );
}