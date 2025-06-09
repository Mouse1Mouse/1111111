import React from "react";
import ProductCard from "./ProductCard";

export default function Gallery() {
  const products = [
    { 
      id: "palette",
      title: "Палітра кольорів",
      imageUrl: "https://images.pexels.com/photos/1034584/pexels-photo-1034584.jpeg?auto=compress&cs=tinysrgb&w=1200",
      images: [
        "https://images.pexels.com/photos/1034584/pexels-photo-1034584.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1329711/pexels-photo-1329711.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1374125/pexels-photo-1374125.jpeg?auto=compress&cs=tinysrgb&w=1200"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "1",
      title: "Бежевий комплект",
      imageUrl: "https://images.pexels.com/photos/1034584/pexels-photo-1034584.jpeg?auto=compress&cs=tinysrgb&w=1200",
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "2",
      title: "Світло-сірий комплект",
      imageUrl: "/photo_2025-06-10_02-06-23.jpg",
      images: [
        "/photo_2025-06-10_02-06-23.jpg",
        "/photo_2025-06-10_02-06-25.jpg",
        "/photo_2025-06-10_02-06-49.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "3",
      title: "Карамельний комплект",
      imageUrl: "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "4",
      title: "Кремовий комплект",
      imageUrl: "https://images.pexels.com/photos/1329711/pexels-photo-1329711.jpeg?auto=compress&cs=tinysrgb&w=1200",
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "5",
      title: "Графітовий комплект",
      imageUrl: "/photo_2025-06-10_01-39-27.jpg",
      images: [
        "/photo_2025-06-10_01-39-27.jpg",
        "/photo_2025-06-10_01-39-39.jpg",
        "/photo_2025-06-10_01-39-45.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "6",
      title: "Ніжно-рожевий комплект",
      imageUrl: "https://images.pexels.com/photos/1374125/pexels-photo-1374125.jpeg?auto=compress&cs=tinysrgb&w=1200",
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "7",
      title: "Чорний комплект",
      imageUrl: "/photo_2025-06-10_01-53-36.jpg",
      images: [
        "/photo_2025-06-10_01-53-36.jpg",
        "/photo_2025-06-10_01-53-38.jpg",
        "/photo_2025-06-10_01-53-46.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "8",
      title: "Салатовий комплект",
      imageUrl: "/photo_2025-06-10_01-57-08.jpg",
      images: [
        "/photo_2025-06-10_01-57-08.jpg",
        "/photo_2025-06-10_01-57-12.jpg",
        "/photo_2025-06-10_01-57-13.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "9",
      title: "Білий комплект",
      imageUrl: "/photo_2025-06-10_02-01-42.jpg",
      images: [
        "/photo_2025-06-10_02-01-42.jpg",
        "/photo_2025-06-10_02-01-46.jpg",
        "/photo_2025-06-10_02-01-56.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1250 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1350 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1400 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1450 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1550 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    }
  ];

  return (
    <section id="gallery" className="py-24 bg-gradient-to-br from-[#fff7ed] to-[#fdf2e9]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-brandBrown text-center mb-16 text-shadow-sm opacity-0 animate-fadeInUp">
          Галерея
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} item={product} />
          ))}
        </div>
      </div>
    </section>
  );
}