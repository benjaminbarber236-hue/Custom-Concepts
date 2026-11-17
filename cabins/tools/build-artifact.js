// Bundles the app into one page for publishing as a claude.ai artifact. There it saves to the
// artifact's database (your Claude account) instead of this browser.
// Usage: node tools/build-artifact.js <out.html>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const out = process.argv[2] || path.join(root, 'artifact.html');
const body = read('index.html').match(/<body>([\s\S]*?)<script/)[1];
const js = ['js/util.js', 'js/plan.js', 'js/store.js', 'js/sample.js', 'js/lenders.js', 'js/app.js'].map(read).join('\n');
// The artifact frame pads the page for the phone's safe areas itself, and needs the side gutter as max().
const css = read('css/styles.css').replace(
  /padding: calc\(env\(safe-area-inset-top, 0px\) \+ 20px\) 16px calc\(env\(safe-area-inset-bottom, 0px\) \+ 96px\);/,
  'padding-block: 20px 96px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));');
const html = `<title>Cabins</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Figtree:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
${body.trim()}
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
fs.writeFileSync(out, html);
console.log('Wrote', out, (html.length / 1024).toFixed(0) + ' KB');
