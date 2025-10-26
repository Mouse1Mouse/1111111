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
    const message = `🔔 *НОВЕ ЗАМОВЛЕННЯ MIVA!*

👤 *ПІБ:* ${fullName || '—'}
📞 *Телефон:* ${phone || '—'}
📧 *Контакт:* ${contact || 'Не вказано'}

📍 *ДОСТАВКА:*
🏙️ *Місто:* ${city || 'Не вказано'}
📦 *Відділення:* ${branch || 'Не вказано'}

🛏️ *ЗАМОВЛЕННЯ:*
${orderSummary || 'Деталі замовлення відсутні'}

💰 *Сума:* ${totalSum || '0'} грн
💳 *Спосіб оплати:* ${paymentMethod}

${comments ? `💬 *Коментар клієнта:*\n${comments}\n\n` : ''}⚠️ *ВАЖЛИВО:* Зв'яжіться з клієнтом протягом 2 годин!

⏰ *Час:* ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}`;

    // Логуємо повідомлення перед відправкою
    console.log('📤 Повідомлення перед відправкою:', message);

    // Перевіряємо чи повідомлення не порожнє та не містить undefined
    if (!message || message.includes('undefined') || message.trim() === '') {
      console.error('⚠️ Порожнє або некоректне повідомлення!');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Порожнє або некоректне повідомлення'
        })
      };
    }

    // Відправляємо повідомлення кожному chat_id окремо
    const sendPromises = CHAT_IDS.map(async (chatId) => {
      try {
        console.log(`📤 Відправляємо повідомлення до chat_id ${chatId}...`);
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        const result = await response.json();
        
        // Логуємо результат запиту
        console.log(`📊 Відповідь для chat_id ${chatId}:`, {
          status: response.status,
          ok: response.ok,
          data: result
        });
        
        if (!response.ok) {
          console.error(`❌ Помилка відправки до chat_id ${chatId}:`, {
            status: response.status,
            error: result.description || result.error_code,
            fullResponse: result
          });
          return { chatId, success: false, error: result.description || 'Unknown error' };
        }

        console.log(`✅ Повідомлення успішно відправлено до chat_id ${chatId}`);
        return { chatId, success: true, messageId: result.result?.message_id };
        
      } catch (error) {
        console.error(`❌ Виняток при відправці до chat_id ${chatId}:`, {
          error: error.message,
          stack: error.stack
        });
        return { chatId, success: false, error: error.message };
      }
    });

    // Чекаємо на всі відправки
    const results = await Promise.all(sendPromises);
    
    // Підраховуємо результати
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Підсумок Telegram сповіщень: ${successful} успішних, ${failed} невдалих`);
    
    // Логуємо детальні результати
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ Chat ID ${result.chatId}: успішно (message_id: ${result.messageId || 'N/A'})`);
      } else {
        console.error(`❌ Chat ID ${result.chatId}: помилка - ${result.error}`);
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: `Повідомлення відправлено: ${successful} успішних, ${failed} невдалих`,
        results: results,
        totalSent: successful,
        totalFailed: failed
      })
    };

  } catch (error) {
    console.error('❌ Критична помилка обробки Telegram сповіщення:', {
      error: error.message,
      stack: error.stack,
      body: event.body
    });
    
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