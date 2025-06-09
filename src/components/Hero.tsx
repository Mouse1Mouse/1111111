import React from "react";

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[rgba(255,244,230,0.8)] to-[rgba(245,233,219,0.8)]">
      <div className="absolute inset-0 bg-[url('/photo_2024-12-30_22-52-21.jpg')] bg-cover bg-center opacity-20"></div>
      <div className="relative container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-32 text-center">
        <div className="opacity-0 animate-fadeInUp">
          <h1 className="text-6xl md:text-7xl font-extrabold text-brandBrown mb-6 text-shadow-md">
            Постільна білизна з душею
          </h1>
          <p className="text-xl md:text-2xl font-medium text-graphite mt-6 max-w-2xl mx-auto leading-relaxed opacity-90">
            Теплі кольори, натуральна тканина та швидке пошиття – відчуй турботу з першого дотику
          </p>
          <button className="mt-12 bg-gradient-to-r from-brandBrown to-brandBrown hover:to-gold px-10 py-4 rounded-lg font-semibold text-cream transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            Переглянути колекцію
          </button>
        </div>
      </div>
    </section>
  );
}