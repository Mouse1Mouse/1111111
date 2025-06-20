exports.handler = async (event, context) => {
  // Дозволяємо тільки POST запити від Monobank
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const webhookData = JSON.parse(event.body);
    console.log('Отримано webhook від Monobank:', webhookData);

    // Тут можна додати логіку обробки webhook'у:
    // - Збереження інформації про оплату в базу даних
    // - Відправка email підтвердження
    // - Оновлення статусу замовлення
    // - Інтеграція з системою управління замовленнями

    // Приклад обробки різних статусів
    switch (webhookData.status) {
      case 'success':
        console.log(`Оплата успішна для замовлення: ${webhookData.reference}`);
        // Тут можна додати логіку успішної оплати
        break;
      case 'failure':
        console.log(`Оплата не вдалася для замовлення: ${webhookData.reference}`);
        // Тут можна додати логіку неуспішної оплати
        break;
      case 'processing':
        console.log(`Оплата в обробці для замовлення: ${webhookData.reference}`);
        // Тут можна додати логіку обробки оплати
        break;
      default:
        console.log(`Невідомий статус оплати: ${webhookData.status}`);
    }

    // Повертаємо успішну відповідь Monobank
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Помилка обробки webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
};