// Bundles the app into one self-contained HTML page with sample data (nothing is saved).
// Usage: node tools/build-demo.js <out.html>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const out = process.argv[2] || path.join(root, 'demo.html');
const body = read('index.html').match(/<body>([\s\S]*?)<script/)[1];
const js = ['js/util.js', 'js/plan.js', 'js/store.js', 'js/sample.js', 'js/app.js'].map(read).join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cabins</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Figtree:wght@400;500;600;700&display=swap">
<style>
${read('css/styles.css')}
</style></head><body>
${body}
<script>window.L = { DEMO: true };</script>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script></body></html>
`;
fs.writeFileSync(out, html);
console.log('Wrote', out, (html.length / 1024).toFixed(0) + ' KB');
