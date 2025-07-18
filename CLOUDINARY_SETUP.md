# Інструкція з налаштування Cloudinary для MIVA

## 1. Створення акаунту Cloudinary

1. Перейдіть на [cloudinary.com](https://cloudinary.com)
2. Зареєструйтеся або увійдіть в акаунт
3. У Dashboard знайдіть ваш **Cloud Name** (наприклад: `miva-textil`)

## 2. Структура папок у Cloudinary

Створіть такі папки для організації зображень:

```
miva-textil/
├── palette/          # Палітра кольорів
├── beige/           # Бежевий комплект
├── grey/            # Сірий комплект
├── caramel/         # Карамельний комплект
├── cream/           # Кремовий комплект
├── graphite/        # Графітовий комплект
├── pink/            # Рожевий комплект
├── black/           # Чорний комплект
├── green/           # Зелений комплект
├── white/           # Білий комплект
├── blue/            # Блакитний комплект
├── kviten/          # Квітень комплект
├── stripe/          # Полоска комплект
├── marble/          # Мармур комплект
├── red/             # Червоний комплект
├── white-checkered/ # Біла клітинка комплект
├── additional/      # Додаткові товари
└── hero/           # Фонові зображення
```

## 3. Завантаження зображень

### Через веб-інтерфейс:
1. Увійдіть у Cloudinary Dashboard
2. Натисніть "Upload" → "Upload Files"
3. Оберіть папку (наприклад, `white-checkered`)
4. Завантажте зображення з назвами:
   - `white-checkered1.jpg`
   - `white-checkered2.jpg`
   - `white-checkered3.jpg`

### Через API (для автоматизації):
```javascript
// Приклад завантаження через Node.js
const cloudinary = require('cloudinary').v2;

cloudinary.uploader.upload("local-image.jpg", {
  folder: "white-checkered",
  public_id: "white-checkered1"
});
```

## 4. Отримання URL зображень

Після завантаження URL буде мати формат:
```
https://res.cloudinary.com/[CLOUD_NAME]/image/upload/v[VERSION]/[FOLDER]/[FILENAME]
```

Приклад:
```
https://res.cloudinary.com/miva-textil/image/upload/v1735689600/white-checkered/white-checkered1.jpg
```

## 5. Додавання нових товарів без деплою

### Крок 1: Завантажте зображення в Cloudinary
1. Створіть нову папку для товару (наприклад, `new-product`)
2. Завантажте 1-3 зображення з назвами `new-product1.jpg`, `new-product2.jpg`, тощо

### Крок 2: Додайте товар у код
У файлі `src/components/Gallery.tsx` додайте новий об'єкт:

```javascript
{
  id: "16",
  title: "Новий комплект",
  imageUrl: "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/new-product/new-product1.jpg",
  images: [
    "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/new-product/new-product1.jpg",
    "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/new-product/new-product2.jpg",
    "https://res.cloudinary.com/miva-textil/image/upload/v1735689600/new-product/new-product3.jpg"
  ],
  setOptions: [
    { label: "Півтораспальний (145×220 ковдра, 145×215 простирадло)", price: 1400 },
    // ... інші розміри
  ],
  pillowOptions: [
    { label: "50×70 (прямокутні)" },
    { label: "70×70 (квадратні)" }
  ]
}
```

### Крок 3: Деплой змін
Після додавання коду зробіть деплой сайту.

## 6. Переваги Cloudinary

✅ **Швидкість**: CDN забезпечує швидке завантаження по всьому світу
✅ **Оптимізація**: Автоматичне стиснення та оптимізація зображень
✅ **Масштабування**: Автоматичне змінення розміру зображень
✅ **Надійність**: 99.9% uptime
✅ **Безкоштовний план**: До 25GB та 25,000 трансформацій на місяць

## 7. Приклад URL з трансформаціями

```
# Оригінальне зображення
https://res.cloudinary.com/miva-textil/image/upload/v1735689600/white-checkered/white-checkered1.jpg

# Зменшене до 800px ширини
https://res.cloudinary.com/miva-textil/image/upload/w_800/v1735689600/white-checkered/white-checkered1.jpg

# З автоматичним форматом та якістю
https://res.cloudinary.com/miva-textil/image/upload/f_auto,q_auto/v1735689600/white-checkered/white-checkered1.jpg
```

## 8. Важливі поради

- **Назви файлів**: Використовуйте зрозумілі назви без пробілів
- **Розміри**: Завантажуйте зображення у високій якості (мін. 1200px ширини)
- **Формати**: JPG для фотографій, PNG для зображень з прозорістю
- **Організація**: Тримайте файли в логічних папках
- **Backup**: Зберігайте копії оригінальних зображень локально