import React from "react";
import ProductCard from "./ProductCard";

export default function Gallery() {
  const products = [
    { 
      id: "palette",
      title: "Палітра кольорів",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/palette1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/palette1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/palette2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/palette3",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/palette4"
      ],
      setOptions: [],
      pillowOptions: [],
      isPalette: true
    },
    { 
      id: "1",
      title: "Бежевий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/beige-set-1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/beige-set-1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/beige-set-2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/beige-set-3"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "2",
      title: "Світло-сірий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/grey-set-1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/grey-set-1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/grey-set-2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/grey/grey3.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836011/photo_2025-06-10_01-57-12_nvxzef.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "3",
      title: "Карамельний комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/caramel-set-1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/caramel-set-1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/caramel-set-2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/caramel-set-3"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "4",
      title: "Кремовий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/cream-set-1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/cream-set-1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/cream-set-2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/cream-set-3"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "5",
      title: "Графітовий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/graphite-set-1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/graphite-set-1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/graphite-set-2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/graphite-set-3"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "6",
      title: "Ніжно-рожевий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1/products/pink-set-1",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/pink-set-1",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/pink-set-2",
        "https://res.cloudinary.com/miva-textil/image/upload/v1/products/pink-set-3"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "7",
      title: "Чорний комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/black/black1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/black/black1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/black/black2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/black/black3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "8",
      title: "Салатовий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/green/green1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/green/green1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/green/green2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/green/green3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "9",
      title: "Білий комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/white/white1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/white/white1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/white/white2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/white/white3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "10",
      title: "Блакитний комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/blue/blue1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/blue/blue1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/blue/blue2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/blue/blue3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "11",
      title: "Квітень комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/kviten/kviten1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/kviten/kviten1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/kviten/kviten2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/kviten/kviten3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "12",
      title: "Сіра полоска комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/stripe/stripe1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/stripe/stripe1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/stripe/stripe2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/stripe/stripe3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "13",
      title: "Мармур комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/marble/marble1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/marble/marble1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/marble/marble2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/marble/marble3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "14",
      title: "Червоний комплект",
      imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/red/red1.jpg",
      images: [
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/red/red1.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/red/red2.jpg",
        "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/red/red3.jpg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
      ],
      pillowOptions: [
        { label: "50×70 (прямокутні)" },
        { label: "70×70 (квадратні)" }
      ]
    },
    { 
      id: "15",
      title: "Біла клітинка комплект",
      imageUrl: "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg",
      images: [
        "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg",
        "https://images.pexels.com/photos/1454804/pexels-photo-1454804.jpeg",
        "https://images.pexels.com/photos/1454805/pexels-photo-1454805.jpeg"
      ],
      setOptions: [
        { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
        { label: "Двоспальний (175×220 ковдра, 200×220 простирадло)", price: 1500 },
        { label: "Євро (200×220 ковдра, 200×220 простирадло)", price: 1550 },
        { label: "Євро Двоспальний (200×220 ковдра, 220×240 простирадло)", price: 1600 },
        { label: "Сімейний (2×145×220 ковдри, 220×240 простирадло)", price: 1700 }
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