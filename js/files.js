// Document storage (proposal PDFs, plans, photos). File contents live in IndexedDB because they're
// too large for localStorage; each job keeps a list of file details in `project.files`.
(function () {
  const DB = 'wc-files';
  const STORE = 'files';
  let dbp;

  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbp;
  }

  function tx(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  const blobToDataURL = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const dataURLToBlob = (url) => fetch(url).then((r) => r.blob());

  // ---- PDF viewer (pdf.js, loaded on first use) ----
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let pdfjsP;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  function pdfjs() {
    // The worker script defines a global that lets pdf.js parse on the main thread (no separate worker needed).
    if (!pdfjsP) {
      pdfjsP = loadScript(PDFJS + 'pdf.worker.min.js').then(() => loadScript(PDFJS + 'pdf.min.js')).then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        return window.pdfjsLib;
      });
      pdfjsP.catch(() => { pdfjsP = null; });
    }
    return pdfjsP;
  }

  // zoom > 1 renders larger (for reading plans); the container scrolls.
  async function renderPdf(blob, container, zoom = 1) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const width = Math.max(280, container.clientWidth || 600) * zoom;
    container.innerHTML = '';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min((width / base.width) * dpr, 4096 / base.width) });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      canvas.className = 'pdf-page';
      canvas.style.width = `${zoom * 100}%`;
      canvas.setAttribute('aria-label', `Page ${n} of ${doc.numPages}`);
      container.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }
  }

  // Small first-page preview for file lists.
  async function renderThumb(blob, el) {
    if ((blob.type || '').startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      img.alt = '';
      el.replaceChildren(img);
      return;
    }
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (320 / base.width) });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    el.replaceChildren(canvas);
  }

  WC.files = {
    pdfjs,
    renderThumb,
    put: (id, blob) => tx('readwrite', (s) => s.put(blob, id)),
    get: (id) => tx('readonly', (s) => s.get(id)),
    del: (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {}),
    blobToDataURL,
    dataURLToBlob,
    renderPdf,
  };
})();
