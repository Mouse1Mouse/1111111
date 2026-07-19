function getSiteUrl() {
  return (process.env.URL || 'https://miva.com.ua').replace(/\/$/, '');
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': getSiteUrl(),
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function normalizeOrderId(value) {
  const orderId = String(value || '').trim();
  return /^MIVA-[A-Za-z0-9-]{8,70}$/.test(orderId) ? orderId : null;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new Error('Order items are required');
  }

  return items.map((item, index) => {
    const nameParts = [item.title, item.chosenSet, item.chosenPillow].filter(Boolean);
    const name = nameParts.join(' — ').trim().slice(0, 120);
    const qty = Number(item.quantity);
    const unitPrice = Number(item.price);
    const code = String(item.id || `item-${index + 1}`)
      .replace(/[^A-Za-z0-9_-]/g, '-')
      .slice(0, 64);

    if (!name || !Number.isInteger(qty) || qty <= 0 || qty > 100) {
      throw new Error('Invalid order item');
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error('Invalid item price');
    }

    const sum = Math.round(unitPrice * 100);
    return {
      name,
      qty,
      sum,
      total: sum * qty,
      unit: 'шт.',
      code,
      tax: [0]
    };
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  const monobankToken = process.env.MONOBANK_TOKEN;
  if (!monobankToken) {
    console.error('MONOBANK_TOKEN is not configured');
    return response(500, { error: 'Payment service is not configured' });
  }

  try {
    const requestData = JSON.parse(event.body || '{}');
    const orderId = normalizeOrderId(requestData.orderId);
    const basketOrder = normalizeItems(requestData.items);
    const amount = basketOrder.reduce((sum, item) => sum + item.total, 0);
    const requestedAmount = Math.round(Number(requestData.amount) * 100);

    if (!orderId || !Number.isFinite(requestedAmount) || requestedAmount !== amount) {
      return response(400, { error: 'Order amount or ID is invalid' });
    }

    const email = String(requestData.customerEmail || '').trim();
    const customerEmails = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? [email] : [];
    const siteUrl = getSiteUrl();
    const invoiceData = {
      amount,
      ccy: 980,
      merchantPaymInfo: {
        reference: orderId,
        destination: `Оплата замовлення MIVA ${orderId}`,
        comment: `Замовлення ${orderId}`,
        customerEmails,
        basketOrder
      },
      redirectUrl: `${siteUrl}/success.html?payment=monopay&orderId=${encodeURIComponent(orderId)}&total=${amount / 100}`,
      webHookUrl: `${siteUrl}/.netlify/functions/payment-webhook`,
      validity: 86400
    };

    const monoResponse = await fetch('https://api.monobank.ua/api/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'X-Token': monobankToken,
        'X-Cms': 'MIVA Netlify',
        'X-Cms-Version': '1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const responseData = await monoResponse.json().catch(() => ({}));
    if (!monoResponse.ok || !responseData.pageUrl || !responseData.invoiceId) {
      console.error('Monobank invoice creation failed:', monoResponse.status);
      return response(502, { error: 'Unable to create payment invoice' });
    }

    return response(200, {
      success: true,
      invoiceUrl: responseData.pageUrl,
      invoiceId: responseData.invoiceId
    });
  } catch (error) {
    console.error('Invoice request rejected:', error.message);
    return response(400, { error: 'Invalid order data' });
  }
};
