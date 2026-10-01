// Bundles the app into one self-contained HTML page (demo mode: sample data preloaded,
// in-memory navigation, no file downloads). Usage: node tools/build-demo.js <out.html>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const out = process.argv[2] || path.join(root, 'demo.html');

const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icons/icon.svg')).toString('base64');
const body = read('index.html').match(/<body>([\s\S]*?)<script/)[1].replace(/icons\/icon\.svg/g, icon);
const css = read('css/styles.css') + `
/* Hosted-demo adjustments */
.topbar { top: env(safe-area-inset-top, 0px); padding-top: 8px; }
`;
const js = ['js/icons.js', 'js/constants.js', 'js/files.js', 'js/importer.js', 'js/ui.js', 'js/store.js', 'js/app.js'].map(read).join('\n')
  .replace("const KEY = 'wc-tracker-v1';", "const KEY = 'wc-tracker-demo-v1';");

const html = `<title>Window Covering Job Tracker</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap">
<meta name="description" content="Demo of a sales and install tracker for a window covering business.">
<style>
${css}
</style>
${body}
<script>window.WC = { DEMO: true };</script>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
fs.writeFileSync(out, html);
console.log('Wrote', out, (html.length / 1024).toFixed(0) + ' KB');
