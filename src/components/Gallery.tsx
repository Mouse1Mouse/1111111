import React from "react";
import ProductCard from "./ProductCard";

export default function Gallery() {
  const products = [
    { 
      id: "palette",
      title: "Палітра кольорів",
      imageUrl: "/palette1.jpg",
      images: [
        "/palette1.jpg",
        "/palette2.jpg",
        "/palette3.jpg",
        "/palette4.jpg"
      ],
      setOptions: [],
      pillowOptions: [],
      isPalette: true
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
      imageUrl: "/grey1.jpg",
      images: [
        "/grey1.jpg",
        "/grey2.jpg",
        "/grey3.jpg"
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
      imageUrl: "/graphite1.jpg",
      images: [
        "/graphite1.jpg",
        "/graphite2.jpg",
        "/graphite3.jpg"
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
      imageUrl: "/pink1.jpg",
      images: [
        "/pink1.jpg",
        "/pink2.jpg",
        "/pink3.jpg"
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
      id: "7",
      title: "Чорний комплект",
      imageUrl: "/black1.jpg",
      images: [
        "/black1.jpg",
        "/black2.jpg",
        "/black3.jpg"
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
      imageUrl: "/green1.jpg",
      images: [
        "/green1.jpg",
        "/green2.jpg",
        "/green3.jpg"
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
      imageUrl: "/white1.jpg",
      images: [
        "/white1.jpg",
        "/white2.jpg",
        "/white3.jpg"
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
      id: "10",
      title: "Блакитний комплект",
      imageUrl: "/blue1.jpg",
      images: [
        "/blue1.jpg",
        "/blue2.jpg",
        "/blue3.jpg"
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
      id: "11",
      title: "Квітень комплект",
      imageUrl: "/kviten1.jpg",
      images: [
        "/kviten1.jpg",
        "/kviten2.jpg",
        "/kviten3.jpg"
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
      id: "12",
      title: "Сіра полоска комплект",
      imageUrl: "/stripe1.jpg",
      images: [
        "/stripe1.jpg",
        "/stripe2.jpg",
        "/stripe3.jpg"
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
      id: "13",
      title: "Мармур комплект",
      imageUrl: "/marble1.jpg",
      images: [
        "/marble1.jpg",
        "/marble2.jpg",
        "/marble3.jpg"
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