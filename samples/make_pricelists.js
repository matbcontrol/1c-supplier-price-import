// Генерирует прайс-листы поставщика «АЛЬФАМАРТ» на основе реальных товаров демобазы УНФ.
// Вход: goods.tsv (выгрузка товаров группы «Розница» с текущими ценами).
// Выход: pricelists.json (описание строк для сборки xlsx) и expected.json (что должна показать загрузка).
// Запуск: node make_pricelists.js gen/goods.tsv gen
const fs = require('fs');
const path = require('path');

const [, , goodsFile, outDir] = process.argv;

// Детерминированный генератор, чтобы прайсы пересобирались одинаково.
let seed = 20261113;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const round2 = (x) => Math.round(x * 100) / 100;

const goods = fs.readFileSync(goodsFile, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1).map((l) => {
  const [uuid, group, article, name, unit, retail, supplier, barcode] = l.split('\t');
  return { uuid, group, article, name, unit, retail: +retail, supplier: +supplier, barcode };
});

// Категории поставщика называются не так, как группы в базе.
const categoryOf = {
  'Ведра': 'Ведра, тазы, корыта',
  'Тазы': 'Ведра, тазы, корыта',
  'Губки, тряпки, салфетки': 'Губки, салфетки, тряпки для уборки',
  'Доски гладильные': 'Гладильные доски',
  'Канистры': 'Канистры',
  'Ковши, корзины, кувшины, миски': 'Посуда хозяйственная, корзины',
  'Мешки для мусора, пакеты хозяйственные': 'Мешки для мусора',
  'Стремянки': 'Лестницы и стремянки',
  'Сушилки': 'Сушилки для белья',
  'Хозяйственный инвентарь': 'Хозинвентарь',
  'Щетки, швабры, тряпки, совки, веники, метлы': 'Щетки, швабры, совки',
  'Перчатки, рукавицы': 'Перчатки',
};

// Поставщик пишет названия по-своему: сокращения, бренд через запятую.
function supplierName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/пластмассов(ое|ый|ая|ые)/gi, 'пласт.')
    .replace(/алюминиев(ое|ый|ая|ые)/gi, 'алюм.')
    .replace(/алюминев(ое|ый|ая|ые)/gi, 'алюм.')
    .replace(/металлическ(ое|ий|ая|ие)/gi, 'мет.')
    .replace(/эмалированн(ое|ый|ая|ые)/gi, 'эмал.')
    .replace(/\s*\(\s*"([^"]+)"\s*\)\s*/g, ', $1 ')
    .replace(/\s*\(Россия\)/g, '')
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

// Валидный EAN-13 из 12 цифр.
function ean13(base12) {
  const d = base12.split('').map(Number);
  const sum = d.reduce((s, x, i) => s + x * (i % 2 === 0 ? 1 : 3), 0);
  return base12 + ((10 - (sum % 10)) % 10);
}

const sorted = [...goods].sort((a, b) => (categoryOf[a.group] + a.name).localeCompare(categoryOf[b.group] + b.name, 'ru'));
sorted.forEach((g, i) => { g.code = 'АМ-' + String(10120 + i * 7).padStart(5, '0'); });

// Кто как будет найден при первой загрузке.
const byName = new Set(['9690', '9691', '8899', '8900', '1487']);        // артикула в прайсе нет, название как в базе
const byBarcode = new Set(goods.filter((g) => g.barcode).map((g) => g.article)); // артикул у поставщика свой
sorted.forEach((g) => {
  if (byName.has(g.article)) { g.pArticle = ''; g.pName = g.name.replace(/\s+/g, ' ').trim(); g.how = 'наименование'; }
  else if (byBarcode.has(g.article)) { g.pArticle = 'AM' + g.article + 'B'; g.pName = supplierName(g.name); g.how = 'штрихкод'; }
  else { g.pArticle = g.article; g.pName = supplierName(g.name); g.how = 'артикул'; }
  g.stock = Math.floor(rnd() * 180);
});

// Новые позиции поставщика.
const newItems1 = [
  { cat: 'Ведра, тазы, корыта', name: 'Ведро оцинкованное 12 л', unit: 'шт', price: 312.4, rrp: 590 },
  { cat: 'Ведра, тазы, корыта', name: 'Корыто оцинкованное 45 л', unit: 'шт', price: 1184.0, rrp: 2190 },
  { cat: 'Щетки, швабры, совки', name: 'Швабра с отжимом и ведром, комплект, YORK', unit: 'компл', price: 1540.0, rrp: 2890 },
  { cat: 'Щетки, швабры, совки', name: 'Совок пласт. с резиновой кромкой, YORK', unit: 'шт', price: 96.5, rrp: 189 },
  { cat: 'Губки, салфетки, тряпки для уборки', name: 'Салфетки из микрофибры универсальные, 5 шт/упак.', unit: 'упак', price: 118.0, rrp: 249 },
  { cat: 'Мешки для мусора', name: 'Мешки для мусора 60 л, 20 шт', unit: 'рул', price: 54.9, rrp: 99 },
  { cat: 'Лестницы и стремянки', name: 'Стремянка стальная, 5 ступеней', unit: 'шт', price: 2310.0, rrp: 4390 },
  { cat: 'Сушилки для белья', name: 'Сушилка для белья напольная, 18 м', unit: 'шт', price: 890.0, rrp: 1690 },
  { cat: 'Посуда хозяйственная, корзины', name: 'Корзина для белья плетёная, 45 л', unit: 'шт', price: 640.0, rrp: 1290 },
];
newItems1.forEach((n, i) => {
  n.code = 'АМ-' + String(12100 + i * 11);
  n.article = 'AM-N' + (501 + i);
  n.barcode = ean13('46070' + String(3300000 + i * 137).padStart(7, '0'));
  n.stock = 20 + i * 9;
});
// «компл» в классификаторе нет — меняем на «шт», чтобы не плодить ошибки сверх задуманного.
newItems1[2].unit = 'шт';

const newItems2 = [
  { cat: 'Канистры', name: 'Канистра пласт. для воды 10 л, с краном', unit: 'шт', price: 268.0, rrp: 499 },
  { cat: 'Хозинвентарь', name: 'Прищепки бельевые пласт., 24 шт', unit: 'упак', price: 64.0, rrp: 129 },
];
newItems2.forEach((n, i) => {
  n.code = 'АМ-' + String(12300 + i * 11);
  n.article = 'AM-N' + (601 + i);
  n.barcode = ean13('46070' + String(3400000 + i * 211).padStart(7, '0'));
  n.stock = 40 + i * 13;
});

// ---------- Прайс 1 (от 13.11.2026) ----------
const v1 = new Map();
for (const g of sorted) {
  const changed = rnd() < 0.55;
  // У товара без цены поставщика в базе (перчатки) поставщик всё равно указывает цену.
  const p = g.supplier > 0 ? (changed ? round2(g.supplier * (1 + 0.03 + rnd() * 0.06)) : g.supplier) : 38.9;
  const rrpChanged = rnd() < 0.3;
  const rrp = rrpChanged ? Math.round(g.retail * (1 + 0.04 + rnd() * 0.04)) : g.retail;
  v1.set(g.code, { price: p, rrp });
}
// «по запросу» вместо цены у дорогой позиции.
const onRequest = sorted.find((g) => g.article === '9352');

function rowsFor(version) {
  const items = [];
  for (const g of sorted) {
    if (version === 2 && (g.article === '8896' || g.article === '9717')) continue; // сняты с поставки
    const pr = version === 1 ? v1.get(g.code) : v2.get(g.code);
    let priceCell = pr.price;
    if (g === onRequest) priceCell = 'по запросу';
    items.push({
      cat: categoryOf[g.group], code: g.code, article: g.pArticle, barcode: g.barcode, name: g.pName,
      unit: g.unit, price: priceCell, rrp: pr.rrp, stock: g.stock,
    });
  }
  const extra = version === 1 ? newItems1 : [...newItems1, ...newItems2];
  for (const n of extra) {
    const pr = version === 1 ? { price: n.price, rrp: n.rrp } : v2.get(n.code);
    items.push({ cat: n.cat, code: n.code, article: n.article, barcode: n.barcode, name: n.name, unit: n.unit, price: pr.price, rrp: pr.rrp, stock: n.stock });
  }
  // Поставщик повторил позицию в другой категории.
  const dup = items.find((r) => r.article === '8333');
  items.push({ ...dup, cat: 'Посуда хозяйственная, корзины' });
  // Порядок как у поставщика: по категориям, внутри по названию.
  items.sort((a, b) => a.cat.localeCompare(b.cat, 'ru') || a.name.localeCompare(b.name, 'ru'));
  return items;
}

// ---------- Прайс 2 (от 20.11.2026) ----------
const v2 = new Map();
let raised = 0;
for (const g of sorted) {
  const base = v1.get(g.code);
  let price = base.price;
  if (price > 0 && raised < 25 && rnd() < 0.22) { price = round2(price * (1 + 0.03 + rnd() * 0.03)); raised++; }
  let rrp = base.rrp;
  if (rnd() < 0.08) rrp = Math.round(rrp * 1.05);
  v2.set(g.code, { price, rrp });
}
// Ошибка поставщика: сдвиг запятой.
const decimalSlip = sorted.find((g) => g.article === '3959');
v2.get(decimalSlip.code).price = round2(v2.get(decimalSlip.code).price * 10);
// Распродажа: −45 %.
const sale = sorted.find((g) => g.article === '8360');
v2.get(sale.code).price = round2(v2.get(sale.code).price * 0.55);
for (const n of newItems1) v2.set(n.code, { price: n.price, rrp: n.rrp });
for (const n of newItems2) v2.set(n.code, { price: n.price, rrp: n.rrp });

const out = {
  supplier: { name: 'ООО «АЛЬФАМАРТ»', inn: '6670365488' },
  lists: [
    { file: 'Прайс АЛЬФАМАРТ от 13.11.2026.xlsx', date: '13.11.2026', rows: rowsFor(1) },
    { file: 'Прайс АЛЬФАМАРТ от 20.11.2026.xlsx', date: '20.11.2026', rows: rowsFor(2), csv: 'Прайс АЛЬФАМАРТ от 20.11.2026.csv' },
  ],
  notes: {
    onRequest: onRequest.article, decimalSlip: decimalSlip.article, sale: sale.article,
    byName: [...byName], byBarcode: [...byBarcode], unknownUnit: 'рул', needsCharacteristic: '3004',
  },
};
fs.writeFileSync(path.join(outDir, 'pricelists.json'), JSON.stringify(out, null, 1));

// ---------- Ожидаемые результаты (считаются отдельно от обработки, по смыслу данных) ----------
const errorArticles = new Set(['3004']);            // перчатки: обязательна характеристика
const ok1 = sorted.filter((g) => !errorArticles.has(g.article) && g !== onRequest);
const sup1 = ok1.filter((g) => v1.get(g.code).price !== g.supplier).length;
const rrp1 = ok1.filter((g) => v1.get(g.code).rrp !== g.retail).length;
const chg1 = ok1.filter((g) => v1.get(g.code).price !== g.supplier || v1.get(g.code).rrp !== g.retail).length;
const how1 = {}; for (const g of sorted) how1[g.how] = (how1[g.how] || 0) + 1;
const expected = {
  v1: {
    rows: out.lists[0].rows.length, byBarcode: how1['штрихкод'], byArticle: how1['артикул'], byName: how1['наименование'],
    newItems: newItems1.length - 1, errors: 3, noPrice: 1, check: 0, changed: chg1,
    unchanged: ok1.length - chg1, supplierWrites: sup1 + newItems1.length - 1, rrpWrites: rrp1 + newItems1.length - 1,
    mappings: sorted.length - errorArticles.size + newItems1.length - 1,
  },
};
// После первой загрузки в базе цены из прайса 1; второй прайс сравнивается с ними.
const removed = new Set(['8896', '9717']);
const flagged = new Set([decimalSlip.article, sale.article]);
const ok2 = sorted.filter((g) => !errorArticles.has(g.article) && g !== onRequest && !removed.has(g.article) && !flagged.has(g.article));
const sup2 = ok2.filter((g) => v2.get(g.code).price !== v1.get(g.code).price).length;
const rrp2 = ok2.filter((g) => v2.get(g.code).rrp !== v1.get(g.code).rrp).length;
const chg2 = ok2.filter((g) => v2.get(g.code).price !== v1.get(g.code).price || v2.get(g.code).rrp !== v1.get(g.code).rrp).length;
const newOld = newItems1.length - 1; // созданные в первой загрузке теперь находятся по соответствию
expected.v2 = {
  rows: out.lists[1].rows.length, newItems: newItems2.length, errors: 3, noPrice: 1, check: flagged.size,
  changed: chg2, unchanged: ok2.length - chg2 + newOld, supplierWrites: sup2 + newItems2.length, rrpWrites: rrp2 + newItems2.length,
  bySupplierMapping: sorted.length - errorArticles.size - removed.size + newOld,
  decimalSlipCode: decimalSlip.code, decimalSlipPriceInDb: v1.get(decimalSlip.code).price, saleCode: sale.code,
};
fs.writeFileSync(path.join(outDir, 'expected.json'), JSON.stringify(expected, null, 1));
console.log('v1 rows', out.lists[0].rows.length, 'v2 rows', out.lists[1].rows.length);
console.log(JSON.stringify(expected));

// ---------- Большой прайс для проверки на объёме: 1000 позиций, CSV в UTF-8 ----------
const kinds = ['Ведро', 'Таз', 'Корзина', 'Контейнер', 'Ковш', 'Щетка', 'Совок', 'Швабра', 'Сушилка', 'Губка', 'Салфетка', 'Канистра', 'Мешки', 'Перчатки хозяйственные', 'Кувшин'];
const mats = ['пласт.', 'оцинк.', 'эмал.', 'алюм.', 'бамбуковая', 'силиконовая'];
const brands = ['POBEDA', 'YORK', 'ЭККОПЛАСТ', 'АЛЬФА', 'VITALUX', 'СТАЛЬЭМАЛЬ'];
const big = ['Код;Артикул;Штрихкод;Наименование;Группа товаров;Ед;Цена;РРЦ'];
for (const g of sorted) {
  if (errorArticles.has(g.article)) continue;
  const p = v1.get(g.code);
  big.push([g.code, g.pArticle, g.barcode, g.pName.includes(';') ? '"' + g.pName + '"' : g.pName, categoryOf[g.group], g.unit, String(p.price).replace('.', ','), p.rrp].join(';'));
}
let k = 0;
while (big.length < 1001) {
  k++;
  const name = pick(kinds) + ' ' + pick(mats) + ' ' + (5 + (k % 40)) + (k % 3 ? ' л' : ' см') + ', ' + pick(brands) + ', арт. Б' + (1000 + k);
  const price = round2(30 + rnd() * 900);
  big.push(['АМ-Б' + (20000 + k), 'Б' + (1000 + k), ean13('46071' + String(1000000 + k).padStart(7, '0')), name, pick(Object.values(categoryOf).slice(0, 10)), 'шт', String(price).replace('.', ','), Math.round(price * 2.4)].join(';'));
}
fs.mkdirSync(path.join(outDir, '..', '..', 'tests', 'data'), { recursive: true });
fs.writeFileSync(path.join(outDir, '..', '..', 'tests', 'data', 'Прайс 1000 позиций.csv'), '﻿' + big.join('\r\n'), 'utf8');
console.log('big', big.length - 1, 'rows, new', k);
