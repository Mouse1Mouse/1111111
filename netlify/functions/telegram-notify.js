const TELEGRAM_BOT_TOKEN = '8073830189:AAH4P8m1im6RTSIXpG859e9bQBGetjcvdmY';
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
    // Логуємо сирі дані що прийшли
    console.log('🔍 Сирі дані event.body:', event.body);
    console.log('🔍 Тип event.body:', typeof event.body);

    // Парсимо дані
    let orderData;
    try {
      orderData = JSON.parse(event.body);
      console.log('✅ Успішно розпарсили JSON:', orderData);
    } catch (parseError) {
      console.error('❌ Помилка парсингу JSON:', parseError.message);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Некоректний JSON',
          details: parseError.message
        })
      };
    }

    // Витягуємо дані з безпечними значеннями за замовчуванням
    const { 
      fullName = 'Не вказано', 
      phone = 'Не вказано', 
      contact = 'Не вказано', 
      city = 'Не вказано', 
      branch = 'Не вказано', 
      orderSummary = 'Деталі замовлення відсутні', 
      totalSum = '0', 
      comments = '', 
      paymentMethod = 'Не вказано',
      orderId = null
    } = orderData;

    // Логуємо отримані дані
    console.log('📋 Отримані дані замовлення:', {
      fullName,
      phone,
      contact,
      city,
      branch,
      orderSummary: orderSummary.substring(0, 100) + '...', // Скорочена версія для логу
      totalSum,
      comments,
      paymentMethod,
      orderId
    });

    // Формуємо красиве повідомлення з емодзі
    const message = `🔔 <b>НОВЕ ЗАМОВЛЕННЯ MIVA!</b>

👤 <b>Клієнт:</b> ${fullName}
📞 <b>Телефон:</b> ${phone}
📧 <b>Контакт:</b> ${contact}

📍 <b>Доставка:</b>
🏙️ <b>Місто:</b> ${city}
📦 <b>Відділення:</b> ${branch}

🛏️ <b>Замовлення:</b>
${orderSummary}

💰 <b>Загальна сума:</b> ${totalSum} грн
💳 <b>Спосіб оплати:</b> ${paymentMethod}
${orderId ? `🆔 <b>ID замовлення:</b> ${orderId}\n` : ''}${comments ? `💬 <b>Коментар клієнта:</b>\n${comments}\n\n` : ''}⚠️ <b>ВАЖЛИВО:</b> Зв'яжіться з клієнтом протягом 2 годин!

⏰ <b>Час:</b> ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}`;

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

    // Функція для відправки повідомлення в Telegram
    const sendTelegramMessage = async (message) => {
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
              parse_mode: 'HTML'
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

      return await Promise.all(sendPromises);
    };

    // Відправляємо повідомлення
    const results = await sendTelegramMessage(message);
    
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
        status: "ok",
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