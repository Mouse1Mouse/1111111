const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;

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
    const { amount, orderId, customerName, customerEmail } = JSON.parse(event.body);

    // Валідація вхідних даних
    if (!amount || !orderId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Відсутні обов\'язкові параметри' })
      };
    }

    if (!MONOBANK_TOKEN) {
      console.error('MONOBANK_TOKEN не налаштований');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Сервер не налаштований для оплати' })
      };
    }

    // Створюємо інвойс через API Monobank
    const invoiceData = {
      amount: parseInt(amount) * 100, // Сума в копійках
      ccy: 980, // UAH
      merchantPaymInfo: {
        reference: orderId,
        destination: 'Оплата замовлення MIVA',
        comment: `Замовлення ${orderId}`,
        customerEmails: customerEmail ? [customerEmail] : []
      },
      redirectUrl: `${event.headers.origin || 'https://miva.com.ua'}/success.html?payment=monopay&orderId=${orderId}&total=${amount}`,
      webHookUrl: `${event.headers.origin || 'https://miva.com.ua'}/.netlify/functions/payment-webhook`
    };

    console.log('Створюємо інвойс:', invoiceData);

    const response = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'X-Token': MONOBANK_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const responseData = await response.json();
    console.log('Відповідь від Monobank:', responseData);

    if (!response.ok) {
      console.error('Помилка API Monobank:', responseData);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Помилка створення інвойсу',
          details: responseData
        })
      };
    }

    // Повертаємо посилання на оплату
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        invoiceUrl: responseData.pageUrl,
        invoiceId: responseData.invoiceId
      })
    };

  } catch (error) {
    console.error('Помилка створення інвойсу:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Внутрішня помилка сервера',
        details: error.message
      })
    };
  }
};