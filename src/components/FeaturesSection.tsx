import React from "react";
import { Check } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 bg-gradient-to-br from-[#fff7ed] to-[#fdf2e9]">
      <div className="container mx-auto px-4">
        <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-12 md:p-16 lg:p-24 max-w-4xl mx-auto">
          <div className="opacity-0 animate-fadeInUp">
            <h2 className="text-4xl font-semibold text-brandBrown text-center mb-12 text-shadow-sm">
              Наші додатки та функції
            </h2>
            <div className="space-y-8">
              <div className="flex items-start">
                <Check className="w-6 h-6 text-gold mt-1 flex-shrink-0" />
                <p className="text-lg text-graphite leading-relaxed ml-4">
                  Простирадло на резинці
                </p>
              </div>
              <div className="flex items-start">
                <Check className="w-6 h-6 text-gold mt-1 flex-shrink-0" />
                <p className="text-lg text-graphite leading-relaxed ml-4">
                  Наволочки на вибір: 50×70, 70×70 або індивідуальні розміри
                </p>
              </div>
              <div className="flex items-start">
                <Check className="w-6 h-6 text-gold mt-1 flex-shrink-0" />
                <p className="text-lg text-graphite leading-relaxed ml-4">
                  Індивідуальні розміри — під будь-які ваші потреби
                </p>
              </div>
              <div className="flex items-start">
                <Check className="w-6 h-6 text-gold mt-1 flex-shrink-0" />
                <p className="text-lg text-graphite leading-relaxed ml-4">
                  Можливість комбінувати кольори за власним бажанням
                </p>
              </div>
              <div className="flex items-start">
                <Check className="w-6 h-6 text-gold mt-1 flex-shrink-0" />
                <p className="text-lg text-graphite leading-relaxed ml-4">
                  Замовлення частин комплекту окремо (наволочки, простирадло, підковдра)
                </p>
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