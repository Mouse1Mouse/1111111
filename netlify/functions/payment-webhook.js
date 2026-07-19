import crypto from 'node:crypto';

let cachedPublicKey = null;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

async function getMonobankPublicKey(token) {
  if (cachedPublicKey) return cachedPublicKey;

  const keyResponse = await fetch('https://api.monobank.ua/api/merchant/pubkey', {
    headers: { 'X-Token': token }
  });

  if (!keyResponse.ok) {
    throw new Error('Unable to load Monobank public key');
  }

  const data = await keyResponse.json();
  if (!data.key) {
    throw new Error('Monobank public key is missing');
  }

  cachedPublicKey = Buffer.from(data.key, 'base64').toString('utf8');
  return cachedPublicKey;
}

async function verifySignature(body, signature, token) {
  if (!body || !signature) return false;

  const publicKey = await getMonobankPublicKey(token);
  const verifier = crypto.createVerify('SHA256');
  verifier.update(body, 'utf8');
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  const monobankToken = process.env.MONOBANK_TOKEN;
  if (!monobankToken) {
    console.error('MONOBANK_TOKEN is not configured');
    return response(500, { error: 'Webhook is not configured' });
  }

  try {
    const signature = event.headers?.['x-sign'] || event.headers?.['X-Sign'];
    const isAuthentic = await verifySignature(event.body, signature, monobankToken);

    if (!isAuthentic) {
      console.warn('Rejected Monobank webhook with invalid signature');
      return response(401, { error: 'Invalid signature' });
    }

    const webhookData = JSON.parse(event.body || '{}');
    const { invoiceId, status, reference, modifiedDate } = webhookData;

    if (!invoiceId || !status) {
      return response(400, { error: 'Invalid webhook payload' });
    }

    console.log('Verified Monobank webhook:', {
      invoiceId,
      status,
      reference,
      modifiedDate
    });

    // Fiscal receipt delivery will be added after the SOTA/monobank PRRO link is enabled.
    return response(200, { received: true });
  } catch (error) {
    console.error('Monobank webhook processing failed:', error.message);
    return response(500, { error: 'Webhook processing failed' });
  }
};
