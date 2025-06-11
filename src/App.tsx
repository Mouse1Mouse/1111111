import React from 'react';
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Gallery from "./components/Gallery";
import FeaturesSection from "./components/FeaturesSection";
import ColorConstructor from "./components/ColorConstructor";
import AdditionalProducts from "./components/AdditionalProducts";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import CartProvider from "./context/CartContext";

export default function App() {
  return (
    <CartProvider>
      <Header />
      <Hero />
      <About />
      <Gallery />
      <FeaturesSection />
      <ColorConstructor />
      <AdditionalProducts />
      <Contact />
      <Footer />
    </CartProvider>
  );
}