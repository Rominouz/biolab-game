const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const htmlPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(htmlPath)) {
  console.error('[inline-build] dist/index.html introuvable');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.endsWith('.js'));
const cssFile = files.find(f => f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('[inline-build] Fichiers JS ou CSS introuvables dans dist/assets');
  process.exit(1);
}

const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');

const standaloneHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BIOLAB // Terminal de Recherche Microbiologique (CRT-88)</title>
    <style>
${cssContent}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
${jsContent}
    </script>
  </body>
</html>`;

fs.writeFileSync(htmlPath, standaloneHtml, 'utf-8');
console.log(`[inline-build] dist/index.html converti en bundle autonome (${Math.round(standaloneHtml.length / 1024)} Ko)`);
