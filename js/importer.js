// Order sheet import: reads an Excel / CSV / PDF order sheet, finds the header row, matches columns
// (Room, Width, Height, Fabric…) and turns each line into a product for review before adding.
(function () {
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  // Fields we can fill, with header words that usually mean them on manufacturer order forms.
  const FIELDS = [
    ['room', 'Room'], ['location', 'Window / location'], ['width', 'Width'], ['height', 'Height'], ['size', 'Size (W x H)'],
    ['qty', 'Qty'], ['brand', 'Brand'], ['product', 'Product / style'], ['color', 'Fabric / color'],
    ['mount', 'Mount'], ['control', 'Control'], ['price', 'Price'], ['notes', 'Notes'],
  ];
  const SYN = {
    room: ['room', 'room name', 'area', 'room location'],
    location: ['window', 'unit', 'location', 'position', 'opening', 'window name', 'window location', 'tag', 'label', 'win', 'line', 'item no', 'mark'],
    width: ['width', 'w', 'wd', 'width in', 'finished width', 'order width'],
    height: ['height', 'h', 'ht', 'length', 'drop', 'height in', 'finished height', 'order height', 'finished length'],
    size: ['size', 'dimensions', 'dims', 'w x h', 'wxh', 'measurements'],
    qty: ['qty', 'quantity', 'units', 'count', 'pcs'],
    brand: ['brand', 'manufacturer', 'mfr', 'mfg', 'vendor', 'supplier'],
    product: ['product', 'style', 'model', 'series', 'product line', 'description', 'collection', 'product type', 'item'],
    color: ['color', 'colour', 'fabric', 'material', 'finish', 'fabric color', 'color name', 'slat', 'fabric name'],
    mount: ['mount', 'mounting', 'mount type', 'ib ob', 'inside outside'],
    control: ['control', 'operation', 'lift', 'lift system', 'operating system', 'motor', 'motorization', 'control type', 'control side'],
    price: ['price', 'unit price', 'each', 'cost', 'msrp', 'net', 'sell price', 'retail'],
    notes: ['notes', 'note', 'comments', 'remarks', 'special instructions', 'instructions'],
  };
  const ROOMS = ['living room', 'family room', 'great room', 'kitchen', 'dining', 'primary bedroom', 'master bedroom', 'primary bath', 'master bath',
    'bedroom', 'bath', 'bathroom', 'office', 'den', 'study', 'laundry', 'mudroom', 'foyer', 'entry', 'nook', 'loft', 'bonus', 'media', 'theater',
    'guest', 'nursery', 'playroom', 'sunroom', 'patio', 'lanai', 'porch', 'garage', 'stair', 'hall', 'basement', 'powder'];

  const key = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function headerScore(cell, field) {
    const k = key(cell);
    if (!k) return 0;
    const syns = SYN[field];
    if (syns.includes(k) || syns.includes(k.replace(/s$/, ''))) return 3;
    if (syns.some((s) => s.length > 2 && (k.startsWith(s + ' ') || k.endsWith(' ' + s)))) return 2;
    if (syns.some((s) => s.length > 3 && k.includes(s))) return 1;
    return 0;
  }

  // Best one-to-one match of fields to columns: {field: columnIndex}.
  function autoMap(header) {
    const pairs = [];
    header.forEach((h, ci) => FIELDS.forEach(([f]) => { const sc = headerScore(h, f); if (sc) pairs.push({ f, ci, sc }); }));
    pairs.sort((a, b) => b.sc - a.sc || a.ci - b.ci);
    const map = {}; const used = new Set();
    for (const { f, ci } of pairs) {
      if (f in map || used.has(ci)) continue;
      map[f] = ci; used.add(ci);
    }
    return map;
  }

  function findHeader(grid) {
    let best = -1; let bestN = 1;
    grid.slice(0, 30).forEach((row, ri) => {
      const n = Object.keys(autoMap(row)).length;
      if (n > bestN) { best = ri; bestN = n; }
    });
    return best;
  }

  // ---- Value cleanup ----
  function toFraction(n) {
    const whole = Math.floor(n);
    let sixteenths = Math.round((n - whole) * 16);
    if (sixteenths === 16) return String(whole + 1);
    if (!sixteenths) return String(whole);
    let d = 16;
    while (sixteenths % 2 === 0) { sixteenths /= 2; d /= 2; }
    return `${whole} ${sixteenths}/${d}`;
  }
  function fmtDim(v) {
    if (v === '' || v == null) return '';
    if (typeof v === 'number') return toFraction(v);
    const s = String(v).replace(/["”″]|\binches\b|\bin\b/gi, '').trim();
    if (/^\d+(\.\d+)?$/.test(s)) return toFraction(parseFloat(s));
    return s.replace(/(\d)-(\d+\/\d+)/, '$1 $2');
  }
  const DIM = /(\d+(?:\.\d+)?(?:[ -]\d+\/\d+)?)\s*(?:["”″]|in\b)?\s*(?:w\b|wide)?\s*[x×X]\s*(\d+(?:\.\d+)?(?:[ -]\d+\/\d+)?)/;

  function normMount(v, strict) {
    const k = key(v);
    if (!k) return '';
    if (/\b(ib|im|inside)\b/.test(k)) return 'Inside';
    if (/\b(ob|om|outside)\b/.test(k)) return 'Outside';
    if (/\bceiling\b/.test(k)) return 'Ceiling';
    if (/\bpocket\b/.test(k)) return 'Pocket';
    if (/\bwall\b/.test(k)) return 'Wall';
    return strict ? '' : String(v).trim();
  }
  function normControl(v, strict) {
    const k = key(v);
    if (!k) return '';
    if (/motor|powerview|power rise|\brf\b|remote|somfy|lutron|sivoia|electric/.test(k)) {
      if (/batt|recharg/.test(k)) return 'Motorized – battery';
      if (/plug/.test(k)) return 'Motorized – plug-in';
      if (/hard ?wire|wired|110|120v|24 ?v|\bdc\b|\bac\b|qs\b/.test(k)) return 'Motorized – hardwired';
      return strict ? 'Motorized – battery' : String(v).trim();
    }
    if (/cordless|ultraglide|lite rise|litelift|easy ?lift/.test(k)) return 'Cordless';
    if (/wand/.test(k)) return 'Wand';
    if (/chain|loop|continuous|clutch/.test(k)) return 'Chain / loop';
    if (/crank/.test(k)) return 'Manual crank';
    if (/\bcord\b|corded/.test(k)) return 'Cord';
    return strict ? '' : String(v).trim();
  }
  function categoryOf(text) {
    const k = key(text);
    if (/shutter/.test(k)) return 'Shutters';
    if (/screen|outdoor|patio|exterior|phantom|insolroll/.test(k)) return 'Outdoor Screens & Shades';
    if (/drape|drapery|curtain|panel|rod|traverse/.test(k)) return 'Drapery';
    if (/blind|slat|venetian|vertical|faux wood/.test(k)) return 'Blinds';
    return 'Shades';
  }
  function brandFrom(text) {
    const k = key(text);
    const all = [...new Set(Object.values(WC.store.db.settings.brands).flat())].sort((a, b) => b.length - a.length);
    return all.find((b) => k.includes(key(b))) || '';
  }
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : NaN; };

  // ---- Grid (rows of cells) → products ----
  function rowsToItems(grid, headerIdx, map) {
    const out = [];
    let lastRoom = '';
    // A brand named in the title rows (e.g. "Hunter Douglas Order Form") fills in rows without one.
    const sheetBrand = brandFrom(grid.slice(0, headerIdx + 1).flat().join(' ')) || '';
    for (const row of grid.slice(headerIdx + 1)) {
      const g = (f) => (map[f] != null && map[f] !== '' ? String(row[map[f]] ?? '').trim() : '');
      const joined = row.map((c) => String(c ?? '')).join(' ');
      if (!joined.trim()) continue;
      if (/^(sub ?total|total|grand total|tax|freight|shipping|discount|deposit|balance)\b/.test(key(joined))) continue;
      if (Object.keys(autoMap(row)).length >= 2) continue; // a repeated header row
      let width = g('width'); let height = g('height');
      if ((!width || !height) && g('size')) { const m = g('size').match(DIM); if (m) { width = width || m[1]; height = height || m[2]; } }
      const product = g('product');
      if (!width && !height && !product) continue;
      if (width && height && Number.isNaN(num(width)) && Number.isNaN(num(String(width).split(' ')[0]))) continue;
      let room = g('room');
      if (room) lastRoom = room; else room = lastRoom;
      const qty = num(g('qty'));
      const price = num(g('price'));
      const text = `${g('brand')} ${product} ${g('color')}`;
      out.push({
        include: true,
        room, location: g('location'),
        width: fmtDim(row[map.width] !== undefined && typeof row[map.width] === 'number' ? row[map.width] : width),
        height: fmtDim(row[map.height] !== undefined && typeof row[map.height] === 'number' ? row[map.height] : height),
        qty: qty > 0 ? qty : 1,
        brand: g('brand') || brandFrom(text) || sheetBrand,
        product, color: g('color'),
        mount: normMount(g('mount')), control: normControl(g('control')),
        price: price > 0 ? price : '',
        notes: g('notes'),
        category: categoryOf(`${text} ${g('control')}`),
      });
    }
    return out;
  }

  // For PDFs without a recognizable table header: pick out any line with "W x H" measurements.
  function linesToItems(lines) {
    const out = [];
    let lastRoom = '';
    for (const line of lines) {
      const k = key(line);
      const room = ROOMS.find((r) => k.includes(r));
      const m = line.match(DIM);
      if (!m) { if (room && line.length < 40) lastRoom = line.trim(); continue; }
      const roomName = room ? line.match(new RegExp(room.replace(/ /g, '\\s+'), 'i'))[0] : lastRoom;
      if (room) lastRoom = roomName;
      const rest = line.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
      const q = line.match(/\bqty\.?\s*:?\s*(\d+)|\b(\d+)\s*(?:ea|pcs|units?)\b/i);
      out.push({
        include: true, room: roomName ? roomName.replace(/\b\w/g, (c) => c.toUpperCase()) : '', location: '',
        width: fmtDim(m[1]), height: fmtDim(m[2]), qty: q ? Number(q[1] || q[2]) : 1,
        brand: brandFrom(line), product: rest.slice(0, 90), color: '',
        mount: normMount(line, true), control: normControl(line, true), price: '', notes: '', category: categoryOf(line),
      });
    }
    return out;
  }

  // ---- Readers ----
  function parseCSV(text) {
    const first = text.split(/\r?\n/, 1)[0];
    const delim = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  let xlsxP;
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxP) {
      xlsxP = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = XLSX_URL;
        s.onload = () => resolve(window.XLSX);
        s.onerror = () => { xlsxP = null; reject(new Error('Excel reader needs an internet connection the first time')); };
        document.head.appendChild(s);
      });
    }
    return xlsxP;
  }

  const kindOf = (name, type) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf' || type === 'application/pdf') return 'pdf';
    if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext) || /spreadsheet|excel/.test(type || '')) return 'excel';
    if (['csv', 'tsv', 'txt'].includes(ext) || /csv|text\/plain|tab-separated/.test(type || '')) return 'csv';
    return '';
  };

  async function readGrid(blob, name) {
    const kind = kindOf(name, blob.type);
    if (kind === 'csv') return [parseCSV(await blob.text())];
    if (kind === 'excel') {
      const X = await loadXLSX();
      const wb = X.read(new Uint8Array(await blob.arrayBuffer()), { type: 'array' });
      return wb.SheetNames.map((n) => X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }));
    }
    throw new Error('Not a spreadsheet');
  }

  // PDF → text lines with x positions, grouped by baseline.
  async function pdfLines(blob) {
    const lib = await WC.files.pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const lines = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const tc = await page.getTextContent();
      const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ x: i.transform[4], y: i.transform[5], w: i.width, s: i.str }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const pageLines = [];
      for (const it of items) {
        const ln = pageLines.find((l) => Math.abs(l.y - it.y) < 3);
        if (ln) ln.items.push(it); else pageLines.push({ y: it.y, items: [it] });
      }
      pageLines.forEach((l) => {
        l.items.sort((a, b) => a.x - b.x);
        // Merge text pieces that sit close together into cells.
        const cells = [];
        for (const it of l.items) {
          const prev = cells[cells.length - 1];
          if (prev && it.x - (prev.x + prev.w) < 6) { prev.s += (it.x - (prev.x + prev.w) > 1 ? ' ' : '') + it.s; prev.w = it.x + it.w - prev.x; } else cells.push({ ...it });
        }
        lines.push(cells);
      });
    }
    return lines;
  }

  // Use a header line's cell positions as columns, then drop each later cell into the column it sits under.
  function pdfGrid(lines) {
    let hIdx = -1; let bestN = 1;
    lines.forEach((cells, i) => { const n = Object.keys(autoMap(cells.map((c) => c.s))).length; if (n > bestN) { bestN = n; hIdx = i; } });
    if (hIdx < 0) return null;
    const cols = lines[hIdx].map((c) => c.x);
    const grid = [lines[hIdx].map((c) => c.s)];
    for (const cells of lines.slice(hIdx + 1)) {
      const row = cols.map(() => '');
      for (const c of cells) {
        let ci = 0;
        for (let j = 0; j < cols.length; j++) if (c.x + 8 >= cols[j]) ci = j;
        row[ci] = row[ci] ? `${row[ci]} ${c.s}` : c.s;
      }
      grid.push(row);
    }
    return grid;
  }

  // Returns { mode: 'table'|'lines'|'none', grid, headerIdx, map, items }
  async function analyze(file) {
    const kind = kindOf(file.name, file.type);
    if (kind === 'pdf') {
      const lines = await pdfLines(file);
      const grid = pdfGrid(lines);
      if (grid) {
        const title = lines.slice(0, 6).map((cells) => cells.map((c) => c.s).join(' ')).join(' ');
        grid.unshift([title]);
        const map = autoMap(grid[1]);
        const items = rowsToItems(grid, 1, map);
        if (items.length) return { mode: 'table', grid, headerIdx: 1, map, items };
      }
      const items = linesToItems(lines.map((cells) => cells.map((c) => c.s).join('  ')));
      return { mode: items.length ? 'lines' : 'none', items };
    }
    if (!kind) throw new Error('Use an Excel (.xlsx), CSV or PDF order sheet');
    const sheets = await readGrid(file, file.name);
    for (const grid of sheets) {
      const h = findHeader(grid);
      if (h < 0) continue;
      const map = autoMap(grid[h]);
      const items = rowsToItems(grid, h, map);
      if (items.length) return { mode: 'table', grid, headerIdx: h, map, items };
    }
    return { mode: 'none', items: [] };
  }

  const TEMPLATE = 'Room,Window,Width,Height,Qty,Brand,Product,Fabric / Color,Mount,Control,Price,Notes\n'
    + 'Living Room,Left of fireplace,34 3/8,60,1,Hunter Douglas,Duette,Alabaster,Inside,Cordless,650,\n'
    + 'Living Room,Right of fireplace,34 3/8,60,1,Hunter Douglas,Duette,Alabaster,Inside,Cordless,650,\n'
    + 'Primary Bedroom,Slider,96,84,1,Hunter Douglas,Luminette,Pearl,Outside,Motorized – battery,2100,Stack left\n';

  WC.importer = { FIELDS, analyze, rowsToItems, readGrid, kindOf, TEMPLATE, normMount, normControl, categoryOf };
})();
