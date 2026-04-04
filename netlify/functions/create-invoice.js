const MONOBANK_TOKEN = 'm3oUJLiHdP4rMFyI8zUyfPw';

exports.handler = async (event, context) => {
  console.log('=== CREATE INVOICE FUNCTION START ===');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('Body:', event.body);

  // Дозволяємо тільки POST запити
  if (event.httpMethod !== 'POST') {
    console.log('Method not allowed:', event.httpMethod);
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
    console.log('CORS preflight request');
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
    let requestData;
    try {
      requestData = JSON.parse(event.body);
      console.log('Parsed request data:', requestData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { amount, orderId, customerName, customerEmail } = requestData;

    // Валідація вхідних даних
    if (!amount || !orderId) {
      console.error('Missing required parameters:', { amount, orderId });
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

    // Validate amount
    const amountInt = parseInt(amount);
    if (isNaN(amountInt) || amountInt <= 0) {
      console.error('Invalid amount:', amount);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Некоректна сума' })
      };
    }

    // Створюємо інвойс через API Monobank
    const invoiceData = {
      amount: amountInt * 100, // Сума в копійках
      ccy: 980, // UAH
      merchantPaymInfo: {
        reference: orderId,
        destination: 'Оплата замовлення MIVA',
        comment: `Замовлення ${orderId}`,
        customerEmails: customerEmail ? [customerEmail] : []
      },
      redirectUrl: `${event.headers.origin || event.headers.referer || 'https://miva.com.ua'}/success.html?payment=monopay&orderId=${orderId}&total=${amount}`,
      webHookUrl: `${event.headers.origin || event.headers.referer || 'https://miva.com.ua'}/.netlify/functions/payment-webhook`
    };

    console.log('Створюємо інвойс:', invoiceData);

    const monoResponse = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'X-Token': MONOBANK_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    console.log('Monobank response status:', monoResponse.status);
    console.log('Monobank response headers:', monoResponse.headers);

    const responseData = await monoResponse.json();
    console.log('Відповідь від Monobank:', responseData);

    if (!monoResponse.ok) {
      console.error('Помилка API Monobank:', responseData);
      return {
        statusCode: monoResponse.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Помилка створення інвойсу',
          details: responseData,
          status: monoResponse.status
        })
      };
    }

    // Check if response has required fields
    if (!responseData.pageUrl) {
      console.error('Missing pageUrl in Monobank response:', responseData);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Некоректна відповідь від платіжного сервісу',
          details: responseData
        })
      };
    }

    // Повертаємо посилання на оплату
    console.log('Invoice created successfully:', responseData.invoiceId);
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
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Внутрішня помилка сервера',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};