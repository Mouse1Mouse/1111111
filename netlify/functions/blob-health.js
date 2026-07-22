function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

function safeError(error) {
  return String(error?.message || error || 'Unknown error')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
    .slice(0, 300);
}

export const handler = async (event) => {
  try {
    const { connectLambda, getStore } = await import('@netlify/blobs');
    connectLambda(event);
    const store = getStore('miva-instagram-orders');
    await store.set('health/current', 'ok');
    const value = await store.get('health/current');
    return response(200, { ok: value === 'ok' });
  } catch (error) {
    return response(500, {
      ok: false,
      errorName: String(error?.name || 'Error').slice(0, 80),
      error: safeError(error)
    });
  }
};
