import { cleanText } from './order-core.js';

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function wrapPackingLabelText(value, maxChars = 38, maxLines = 9) {
  const words = cleanText(value, 1200).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const chunks = word.length > maxChars
      ? word.match(new RegExp(`.{1,${maxChars}}`, 'gu')) || [word]
      : [word];
    for (const chunk of chunks) {
      const candidate = line ? `${line} ${chunk}` : chunk;
      if (candidate.length <= maxChars) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = chunk;
      }
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.join(' ').length < cleanText(value, 1200).length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return lines;
}

export function createPackingLabelDocument(order, ttn = '') {
  const items = wrapPackingLabelText(order?.itemsSummary || 'Товар не вказано');
  const location = cleanText([order?.city, order?.branch].filter(Boolean).join(' · '), 180);
  const itemLines = items.map((line, index) => (
    `<text x="55" y="${430 + index * 48}" class="items">${escapeXml(line)}</text>`
  )).join('');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="#fff"/>
  <rect x="18" y="18" width="964" height="964" fill="none" stroke="#000" stroke-width="8"/>
  <style>
    text { font-family: Arial, "DejaVu Sans", sans-serif; fill: #000; }
    .title { font-size: 55px; font-weight: 700; }
    .meta { font-size: 29px; }
    .name { font-size: 44px; font-weight: 700; }
    .section { font-size: 31px; font-weight: 700; }
    .items { font-size: 34px; font-weight: 600; }
    .ttn { font-size: 38px; font-weight: 700; letter-spacing: 2px; }
  </style>
  <text x="50" y="88" class="title">MIVA · ОПИС ЗАМОВЛЕННЯ</text>
  <line x1="50" y1="115" x2="950" y2="115" stroke="#000" stroke-width="4"/>
  <text x="50" y="165" class="meta">${escapeXml(cleanText(order?.id, 60))}</text>
  <text x="50" y="225" class="name">${escapeXml(cleanText(order?.customerName, 80))}</text>
  <text x="50" y="275" class="meta">Телефон: ${escapeXml(cleanText(order?.phone, 30))}</text>
  <text x="50" y="325" class="meta">${escapeXml(location)}</text>
  <line x1="50" y1="352" x2="950" y2="352" stroke="#000" stroke-width="3"/>
  <text x="50" y="400" class="section">ЩО ВСЕРЕДИНІ:</text>
  ${itemLines}
  <line x1="50" y1="865" x2="950" y2="865" stroke="#000" stroke-width="3"/>
  <text x="50" y="920" class="ttn">ТТН: ${escapeXml(cleanText(ttn, 30))}</text>
</svg>`;

  return {
    bytes: new TextEncoder().encode(svg),
    mimeType: 'image/svg+xml',
    filename: `MIVA-${cleanText(order?.id, 60) || 'order'}-100x100.svg`
  };
}
