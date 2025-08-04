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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1754336211/photo_8_2025-08-04_21-36-01_kaibkd.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1754336211/photo_8_2025-08-04_21-36-01_kaibkd.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1754336211/photo_10_2025-08-04_21-36-01_qg7qjl.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1754336211/photo_9_2025-08-04_21-36-01_rpxtzw.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-30-02_ueefta.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-30-02_ueefta.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-30-05_dbjcml.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-30-08_nnwr6y.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-41-22_baquqe.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-41-22_baquqe.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-41-15_h6knvo.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836006/photo_2025-06-10_18-41-18_iyoejr.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-45-50_dypf47.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836008/photo_2025-06-10_18-45-50_dypf47.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-45-53_y4qjtm.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-45-58_cy3v6s.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-49-02_vd0h1l.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-49-02_vd0h1l.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-48-57_u9aihf.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2025-06-10_18-49-00_qdxyco.jpg"
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
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_3_2025-07-18_13-14-59_z9fvck.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_3_2025-07-18_13-14-59_z9fvck.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836007/photo_2_2025-07-18_13-14-59_azfjbw.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752836006/photo_4_2025-07-18_13-14-59_ubtpl3.jpg"
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
      id: "16",
      title: "Сіра клітинка комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752837752/photo_1_2025-07-18_14-22-25_ls8abk.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752837752/photo_1_2025-07-18_14-22-25_ls8abk.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752837752/photo_2_2025-07-18_14-22-25_frunfd.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752837752/photo_3_2025-07-18_14-22-25_xrsjhy.jpg"
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
      id: "17",
      title: "Лаванда комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_2_2025-07-18_14-26-28_ziahih.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_2_2025-07-18_14-26-28_ziahih.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_1_2025-07-18_14-26-28_wpytjb.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_3_2025-07-18_14-26-28_nbxhlh.jpg"
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
      id: "18",
      title: "Мятний комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_5_2025-07-18_14-27-12_ywgr4x.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_5_2025-07-18_14-27-12_ywgr4x.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_4_2025-07-18_14-27-12_igsyhg.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838095/photo_6_2025-07-18_14-27-12_odvut7.jpg"
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
      id: "19",
      title: "Темно синій комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_7_2025-07-18_14-27-12_m5m7rs.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_7_2025-07-18_14-27-12_m5m7rs.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838095/photo_8_2025-07-18_14-27-12_itd5og.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838095/photo_9_2025-07-18_14-27-12_bcm4ci.jpg"
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
      id: "20",
      title: "Бежевий комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_1_2025-07-18_14-27-12_foidpf.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_1_2025-07-18_14-27-12_foidpf.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_3_2025-07-18_14-27-12_voamsx.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752838096/photo_2_2025-07-18_14-27-12_gfl6z3.jpg"
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
      id: "21",
      title: "Шоколад комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1752839520/photo_3_2025-07-18_14-50-14_sbxzlr.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752839520/photo_3_2025-07-18_14-50-14_sbxzlr.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752839520/photo_2_2025-07-18_14-50-14_yguf6b.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1752839468/photo_1_2025-07-18_14-50-14_v08hcu.jpg"
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
      id: "22",
      title: "Смарагдовий комплект",
      imageUrl: "https://res.cloudinary.com/digiji8uz/image/upload/v1754336212/photo_2_2025-08-04_21-36-01_s6s9i4.jpg",
      images: [
        "https://res.cloudinary.com/digiji8uz/image/upload/v1754336212/photo_2_2025-08-04_21-36-01_s6s9i4.jpg",
        "https://res.cloudinary.com/digiji8uz/image/upload/v1754336212/photo_1_2025-08-04_21-36-01_yogmon.jpg"
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