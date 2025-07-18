import React from "react";
import ProductCard from "./ProductCard";

export default function Gallery() {
  const products = [
    { 
      id: "palette",
      title: "Палітра кольорів",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-17-11_lcrzkl.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-17-11_lcrzkl.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-17-13_ikyg6j.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-17-14_a88kkb.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-17-16_luofn9.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-06-25_byyg4o.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-06-25_byyg4o.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-06-49_gxyhm8.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-06-23_gv4cy0.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836011/photo_2025-06-10_01-39-27_y7efsh.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836011/photo_2025-06-10_01-39-27_y7efsh.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-39-39_xx2pza.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-39-45_yxc5eq.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/IMG_7340_jyw9nf.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/IMG_7340_jyw9nf.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/IMG_7341_yausbs.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/IMG_7342_yyipsl.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-53-36_czc5tl.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-53-36_czc5tl.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-53-38_tejank.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-53-46_gbeeyz.jpg"
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
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836011/photo_2025-06-10_01-57-12_nvxzef.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-57-08_tibrme.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_01-57-13_de7wm9.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_02-01-42_vydtid.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836010/photo_2025-06-10_02-01-42_vydtid.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-01-46_jgmfur.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836009/photo_2025-06-10_02-01-56_rxvbng.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-28-42_zew2sr.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-28-42_zew2sr.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-28-37_jxxfxy.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-28-39_mkbhth.jpg"
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