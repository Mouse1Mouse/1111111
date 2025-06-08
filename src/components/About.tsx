import React from "react";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-gradient-to-br from-[#f5e9db] to-[#ecd6c5]">
      <div className="container mx-auto px-4">
        <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-12 md:p-16 lg:p-24 max-w-4xl mx-auto">
          <div className="opacity-0 animate-fadeInUp">
            <h2 className="text-4xl font-semibold text-brandBrown text-center mb-8 text-shadow-sm">
              Про нас
            </h2>
            <p className="text-lg md:text-xl text-graphite leading-relaxed text-center tracking-wide">
              Ми шиємо кожен комплект індивідуально — під замовлення. Власне виробництво, 
              без посередників. Термін виготовлення та відправки — всього один-два робочі дні. 
              А палітра кольорів… більше ніж двадцять відтінків — для будь-якого настрою.
            </p>
            <div className="mt-12 flex justify-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-cream to-beige w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-brandBrown font-bold text-2xl">20+</span>
                  </div>
                  <p className="text-graphite font-medium">Кольорів</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-br from-cream to-beige w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-brandBrown font-bold text-2xl">1-2</span>
                  </div>
                  <p className="text-graphite font-medium">Дні на пошиття</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-br from-cream to-beige w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-brandBrown font-bold text-2xl">100%</span>
                  </div>
                  <p className="text-graphite font-medium">Натуральність</p>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-br from-cream to-beige w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-brandBrown font-bold text-2xl">❤️</span>
                  </div>
                  <p className="text-graphite font-medium">З любов'ю</p>
                </div>
              </div>
            </div>
            <div className="mt-12 flex justify-center">
              <div className="w-20 h-0.5 bg-gold/50"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}