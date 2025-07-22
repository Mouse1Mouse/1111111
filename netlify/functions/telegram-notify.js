const TELEGRAM_BOT_TOKEN = '7679438863:AAFdSt_VKSQCOEHMpsgHlRnu5Pe5Q8itWDw';
const CHAT_IDS = ['923730033', '761026351', '432380172']; // Додайте більше chat_id за потреби

exports.handler = async (event, context) => {
  // Дозволяємо тільки POST запити
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Обробляємо CORS preflight запити
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const orderData = JSON.parse(event.body);
    const { 
      fullName, 
      phone, 
      contact, 
      city, 
      branch, 
      orderSummary, 
      totalSum, 
      comments, 
      paymentMethod = 'Не вказано' 
    } = orderData;

    // Формуємо повідомлення
    const message = `🔔 НОВЕ ЗАМОВЛЕННЯ MIVA!

👤 ПІБ: ${fullName}
📞 Телефон: ${phone}
📧 Контакт: ${contact || 'Не вказано'}

📍 ДОСТАВКА:
🏙️ Місто: ${city || 'Не вказано'}
📦 Відділення: ${branch || 'Не вказано'}

🛏️ ЗАМОВЛЕННЯ:
${orderSummary}

💰 Сума: ${totalSum} грн
💳 Спосіб оплати: ${paymentMethod}

${comments ? `💬 Коментар клієнта:\n${comments}\n\n` : ''}⚠️ ВАЖЛИВО: Зв'яжіться з клієнтом протягом 2 годин!

⏰ Час: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}`;

    // Відправляємо повідомлення кожному chat_id окремо
    const sendPromises = CHAT_IDS.map(async (chatId) => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error(`Помилка відправки до chat_id ${chatId}:`, result);
          return { chatId, success: false, error: result.description };
        }

        console.log(`Повідомлення успішно відправлено до chat_id ${chatId}`);
        return { chatId, success: true };
        
      } catch (error) {
        console.error(`Помилка відправки до chat_id ${chatId}:`, error);
        return { chatId, success: false, error: error.message };
      }
    });

    // Чекаємо на всі відправки
    const results = await Promise.all(sendPromises);
    
    // Підраховуємо результати
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Telegram сповіщення: ${successful} успішних, ${failed} невдалих`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: `Повідомлення відправлено: ${successful} успішних, ${failed} невдалих`,
        results: results
      })
    };

  } catch (error) {
    console.error('Помилка обробки Telegram сповіщення:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: false,
        error: 'Внутрішня помилка сервера',
        details: error.message
      })
    };
  }
};