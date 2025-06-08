import React from "react";
import { Instagram } from "lucide-react";

export default function Contact() {
  return (
    <section id="contacts" className="py-24 bg-gradient-to-br from-[#fffafb] to-[#f5e9db]">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold text-brandBrown mb-12 text-shadow-sm opacity-0 animate-fadeInUp">
          Контакти
        </h2>
        
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12">
          <div className="flex items-center justify-center mb-8">
            <Instagram className="text-brandBrown mr-3" size={32} />
            <a 
              href="https://instagram.com/miva_ua" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xl font-medium text-brandBrown hover:text-gold transition-colors duration-200"
            >
              @miva_ua
            </a>
          </div>
          
          <div className="mb-8">
            <p className="text-graphite mb-2 font-medium">Напишіть нам:</p>
            <a 
              href="mailto:contact@miva.ua" 
              className="text-brandBrown hover:text-gold transition-colors duration-200 text-lg"
            >
              contact@miva.ua
            </a>
          </div>
          
          <div>
            <p className="text-graphite mb-2 font-medium">Зателефонуйте нам:</p>
            <a 
              href="tel:+380123456789" 
              className="text-brandBrown hover:text-gold transition-colors duration-200 text-lg"
            >
              +38 (012) 345-67-89
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}