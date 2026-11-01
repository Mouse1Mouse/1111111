import { cleanText } from './order-core.js';

export const PRODUCT_CATALOG_VERSION = '2026-11-01';

const product = (sku, name, price, kind, size, aliases = []) => Object.freeze({
  sku,
  name,
  price,
  kind,
  size,
  unit: 'шт',
  group: 'Постіль',
  aliases
});

export const SOTA_PRODUCT_CATALOG = Object.freeze([
  product('MIVA-BED-150', 'Комплект постільної білизни — 1,5-спальний', 1550, 'bed_set', '150', [
    'півтораспальний', 'півтора спальне', '1,5-спальний', '1.5-спальний', 'полуторний'
  ]),
  product('MIVA-BED-200', 'Комплект постільної білизни — двоспальний', 1700, 'bed_set', '200', [
    'двоспальний', 'двохспальний', 'двоспальне'
  ]),
  product('MIVA-BED-EURO', 'Комплект постільної білизни — Євро', 1750, 'bed_set', 'euro', [
    'євро комплект', 'комплект євро', 'евро комплект'
  ]),
  product('MIVA-BED-EURO-2', 'Комплект постільної білизни — Євро двоспальний', 1800, 'bed_set', 'euro_2', [
    'євро двоспальний', 'євро двохспальний', 'евро двоспальний', 'євро-двоспальний'
  ]),
  product('MIVA-BED-FAMILY', 'Комплект постільної білизни — сімейний', 1900, 'bed_set', 'family', [
    'сімейний', 'семейний', 'сімейне'
  ]),
  product('MIVA-BED-CUSTOM', 'Комплект постільної білизни — індивідуальний розмір', 1, 'bed_set', 'custom', [
    'індивідуальний', 'індивідуальні розміри', 'нестандартний розмір', 'на замовлення'
  ]),

  product('MIVA-DUVET-145X220', 'Підковдра — 145×220 см', 800, 'duvet', '145x220'),
  product('MIVA-DUVET-175X220', 'Підковдра — 175×220 см', 900, 'duvet', '175x220'),
  product('MIVA-DUVET-200X220', 'Підковдра — 200×220 см', 1000, 'duvet', '200x220'),

  product('MIVA-PILLOWCASE-50X70', 'Наволочки — 50×70 см', 350, 'pillowcase', '50x70'),
  product('MIVA-PILLOWCASE-70X70', 'Наволочки — 70×70 см', 400, 'pillowcase', '70x70'),

  product('MIVA-SHEET-FITTED-80X200X20', 'Простирадло на резинці — 80×200×20 см', 250, 'fitted_sheet', '80x200x20'),
  product('MIVA-SHEET-FITTED-120X200X20', 'Простирадло на резинці — 120×200×20 см', 250, 'fitted_sheet', '120x200x20'),
  product('MIVA-SHEET-FITTED-140X200X20', 'Простирадло на резинці — 140×200×20 см', 250, 'fitted_sheet', '140x200x20'),
  product('MIVA-SHEET-FITTED-160X200X20', 'Простирадло на резинці — 160×200×20 см', 250, 'fitted_sheet', '160x200x20'),
  product('MIVA-SHEET-FITTED-160X200X30', 'Простирадло на резинці — 160×200×30 см', 450, 'fitted_sheet', '160x200x30'),
  product('MIVA-SHEET-FITTED-180X200X20', 'Простирадло на резинці — 180×200×20 см', 450, 'fitted_sheet', '180x200x20'),
  product('MIVA-SHEET-FITTED-180X200X30', 'Простирадло на резинці — 180×200×30 см', 450, 'fitted_sheet', '180x200x30'),
  product('MIVA-SHEET-FITTED-200X200X20', 'Простирадло на резинці — 200×200×20 см', 450, 'fitted_sheet', '200x200x20'),
  product(
    'MIVA-SHEET-FITTED-CUSTOM',
    'Простирадло на резинці — індивідуальний розмір до 220×240×30 см',
    450,
    'fitted_sheet',
    'custom',
    ['резинка індивідуальний', 'простирадло на резинці на замовлення']
  ),

  product('MIVA-SHEET-FLAT-145X220', 'Простирадло — 145×220 см', 600, 'flat_sheet', '145x220'),
  product('MIVA-SHEET-FLAT-200X220', 'Простирадло — 200×220 см', 700, 'flat_sheet', '200x220'),
  product('MIVA-SHEET-FLAT-220X240', 'Простирадло — 220×240 см', 750, 'flat_sheet', '220x240')
]);

const CATALOG_BY_SKU = new Map(SOTA_PRODUCT_CATALOG.map((item) => [item.sku, item]));

function normalize(value) {
  return cleanText(value, 2000)
    .toLocaleLowerCase('uk-UA')
    .replace(/[хx×*]/gu, 'x')
    .replace(/(\d)\s*[/\\]\s*(\d)/gu, '$1x$2')
    .replace(/[–—−]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();
}

function fiscalLine(item, quantity = 1, unitPrice = item.price) {
  const safeQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const safeUnitPrice = Math.round(Number(unitPrice) * 100) / 100;
  return {
    sku: item.sku,
    name: item.name,
    quantity: safeQuantity,
    unit: item.unit,
    unitPrice: safeUnitPrice,
    totalAmount: Math.round(safeQuantity * safeUnitPrice * 100) / 100,
    group: item.group
  };
}

function findBy(kind, size) {
  return SOTA_PRODUCT_CATALOG.find((item) => item.kind === kind && item.size === size) || null;
}

function containsSize(text, size) {
  const parts = size.split('x');
  return new RegExp(`(?:^|\\D)${parts.map((part) => `${Number(part)}`).join('\\s*x\\s*')}(?:\\D|$)`, 'u').test(text);
}

function explicitQuantity(text, nounPattern) {
  const after = text.match(new RegExp(`${nounPattern}.{0,30}?(\\d+)\\s*(?:шт|од)(?:\\D|$)`, 'iu'));
  const before = text.match(new RegExp(`(?:^|\\D)(\\d+)\\s*(?:шт|од).{0,20}?${nounPattern}`, 'iu'));
  const quantity = Number(after?.[1] || before?.[1] || 1);
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 99 ? quantity : 1;
}

function findBedSet(text, totalAmount, hasAdditionalItem) {
  const sets = SOTA_PRODUCT_CATALOG.filter((item) => item.kind === 'bed_set');
  const ordered = [
    'MIVA-BED-FAMILY',
    'MIVA-BED-EURO-2',
    'MIVA-BED-150',
    'MIVA-BED-200',
    'MIVA-BED-EURO',
    'MIVA-BED-CUSTOM'
  ];
  for (const sku of ordered) {
    const item = CATALOG_BY_SKU.get(sku);
    if (item.aliases.some((alias) => text.includes(normalize(alias)))) return item;
  }

  if (/2\s*x\s*145\s*x\s*220/u.test(text) && containsSize(text, '220x240')) {
    return CATALOG_BY_SKU.get('MIVA-BED-FAMILY');
  }
  if (containsSize(text, '200x220') && containsSize(text, '220x240')) {
    return CATALOG_BY_SKU.get('MIVA-BED-EURO-2');
  }
  if (containsSize(text, '175x220')) return CATALOG_BY_SKU.get('MIVA-BED-200');
  if (containsSize(text, '145x220') && containsSize(text, '145x215')) {
    return CATALOG_BY_SKU.get('MIVA-BED-150');
  }

  const total = Math.round(Number(totalAmount) * 100) / 100;
  if (!hasAdditionalItem && Number.isFinite(total)) {
    const exactPrice = sets.find((item) => item.sku !== 'MIVA-BED-CUSTOM' && item.price === total);
    if (exactPrice) return exactPrice;
  }
  return null;
}

function findSizedProduct(text, kind) {
  const candidates = SOTA_PRODUCT_CATALOG
    .filter((item) => item.kind === kind && item.size !== 'custom')
    .sort((a, b) => b.size.length - a.size.length);
  return candidates.find((item) => containsSize(text, item.size)) || null;
}

function recognizedKinds(text) {
  return {
    bedSet: /комплект|однотон/u.test(text),
    fittedSheet: /резин|гумц/u.test(text),
    duvet: /підковдр|пододеяльник/u.test(text),
    pillowcase: /наволоч/u.test(text),
    flatSheet: /простирад/u.test(text) && !/резин|гумц/u.test(text)
  };
}

export function getCatalogProduct(sku) {
  return CATALOG_BY_SKU.get(cleanText(sku, 80)) || null;
}

export function matchOrderSummaryToCatalog(itemsSummary, totalAmount) {
  const source = cleanText(itemsSummary, 1200);
  const text = normalize(source);
  const kinds = recognizedKinds(text);
  const matches = [];
  const warnings = [];

  let fittedSheet = null;
  if (kinds.fittedSheet) {
    fittedSheet = findSizedProduct(text, 'fitted_sheet') ||
      CATALOG_BY_SKU.get('MIVA-SHEET-FITTED-CUSTOM');
  }

  if (kinds.bedSet) {
    const bedSet = findBedSet(text, totalAmount, Boolean(fittedSheet));
    if (bedSet) matches.push(fiscalLine(bedSet, explicitQuantity(text, 'комплект')));
  }

  if (fittedSheet) {
    matches.push(fiscalLine(fittedSheet, explicitQuantity(text, '(?:резин|гумц|простирад)')));
  }

  if (!kinds.bedSet && !fittedSheet) {
    if (kinds.duvet) {
      const item = findSizedProduct(text, 'duvet');
      if (item) matches.push(fiscalLine(item, explicitQuantity(text, '(?:підковдр|пододеяльник)')));
    } else if (kinds.pillowcase) {
      const item = findSizedProduct(text, 'pillowcase');
      if (item) matches.push(fiscalLine(item, 1));
    } else if (kinds.flatSheet) {
      const item = findSizedProduct(text, 'flat_sheet');
      if (item) matches.push(fiscalLine(item, explicitQuantity(text, 'простирад')));
    }
  }

  const total = Math.round(Number(totalAmount) * 100) / 100;
  if (!matches.length) {
    const fallback = CATALOG_BY_SKU.get('MIVA-BED-CUSTOM');
    warnings.push('Товар не вдалося однозначно зіставити з каталогом СОТА — потрібна перевірка менеджера.');
    return {
      catalogVersion: PRODUCT_CATALOG_VERSION,
      status: 'needs_review',
      items: [fiscalLine({
        ...fallback,
        name: source || fallback.name
      }, 1, total)],
      warnings
    };
  }

  let items = matches;
  let itemsTotal = Math.round(items.reduce((sum, item) => sum + item.totalAmount, 0) * 100) / 100;
  const customIndex = items.findIndex((item) =>
    item.sku === 'MIVA-BED-CUSTOM' || item.sku === 'MIVA-SHEET-FITTED-CUSTOM'
  );
  if (Number.isFinite(total) && total > 0 && itemsTotal !== total && customIndex >= 0) {
    const otherTotal = itemsTotal - items[customIndex].totalAmount;
    const customTotal = Math.round((total - otherTotal) * 100) / 100;
    if (customTotal > 0) {
      items = items.map((item, index) => index === customIndex
        ? { ...item, unitPrice: customTotal, totalAmount: customTotal }
        : item);
      itemsTotal = Math.round(items.reduce((sum, item) => sum + item.totalAmount, 0) * 100) / 100;
    }
  }

  const reconciled = Number.isFinite(total) && total > 0 && Math.abs(itemsTotal - total) <= 0.01;
  if (!reconciled) {
    warnings.push(
      `Сума розпізнаних товарів ${itemsTotal.toFixed(2)} грн не збігається із сумою замовлення ${total.toFixed(2)} грн.`
    );
  }

  return {
    catalogVersion: PRODUCT_CATALOG_VERSION,
    status: reconciled ? 'matched' : 'needs_review',
    items,
    warnings
  };
}
