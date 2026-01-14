#!/usr/bin/env node
/**
 * Embeds static assets into a JavaScript module for offline use
 * - DaisyUI CSS, Tailwind JS
 * - React, ReactDOM, Babel (for offline JSX compilation)
 * - Logo and Favicon
 * - Frontend JSX components
 *
 * Run this before building with Bun to ensure assets are bundled
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const publicDir = join(rootDir, 'src', 'public');
const assetsDir = join(rootDir, 'src', 'assets');
const frontendDir = join(rootDir, 'src', 'frontend');

// Ensure assets directory exists
mkdirSync(assetsDir, { recursive: true });

console.log('Embedding static assets...\n');

// ============================================
// CSS and Tailwind
// ============================================
console.log('CSS & Tailwind:');
const daisyuiCss = readFileSync(join(publicDir, 'daisyui.css'), 'utf-8');
const tailwindJs = readFileSync(join(publicDir, 'tailwind.js'), 'utf-8');
console.log(`  - DaisyUI CSS: ${(daisyuiCss.length / 1024).toFixed(1)} KB`);
console.log(`  - Tailwind JS: ${(tailwindJs.length / 1024).toFixed(1)} KB`);

// ============================================
// React, ReactDOM, Babel
// ============================================
console.log('\nReact & Babel:');
let reactJs = '';
let reactDomJs = '';
let babelJs = '';

const reactPath = join(publicDir, 'react.min.js');
const reactDomPath = join(publicDir, 'react-dom.min.js');
const babelPath = join(publicDir, 'babel.min.js');

if (existsSync(reactPath)) {
  reactJs = readFileSync(reactPath, 'utf-8');
  console.log(`  - React: ${(reactJs.length / 1024).toFixed(1)} KB`);
} else {
  console.log('  - React: not found (skipped)');
}

if (existsSync(reactDomPath)) {
  reactDomJs = readFileSync(reactDomPath, 'utf-8');
  console.log(`  - ReactDOM: ${(reactDomJs.length / 1024).toFixed(1)} KB`);
} else {
  console.log('  - ReactDOM: not found (skipped)');
}

if (existsSync(babelPath)) {
  babelJs = readFileSync(babelPath, 'utf-8');
  console.log(`  - Babel: ${(babelJs.length / 1024).toFixed(1)} KB`);
} else {
  console.log('  - Babel: not found (skipped)');
}

// SheetJS (xlsx) for Excel export
let xlsxJs = '';
const xlsxPath = join(publicDir, 'xlsx.full.min.js');
if (existsSync(xlsxPath)) {
  xlsxJs = readFileSync(xlsxPath, 'utf-8');
  console.log(`  - SheetJS: ${(xlsxJs.length / 1024).toFixed(1)} KB`);
} else {
  console.log('  - SheetJS: not found (skipped)');
}

// ============================================
// Logo and Favicon
// ============================================
console.log('\nImages:');
const logoPath = join(rootDir, 'logo.png');
let logoBase64 = '';
if (existsSync(logoPath)) {
  const logoBuffer = readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  console.log(`  - Logo: ${(logoBuffer.length / 1024).toFixed(1)} KB`);
} else {
  console.log('  - Logo: not found (skipped)');
}

const faviconPath = join(rootDir, 'ico.ico');
let faviconBuffer = null;
if (existsSync(faviconPath)) {
  faviconBuffer = readFileSync(faviconPath);
  console.log(`  - Favicon: ${(faviconBuffer.length / 1024).toFixed(1)} KB`);
} else {
  console.log('  - Favicon: not found (skipped)');
}

// ============================================
// JSX Components
// ============================================
console.log('\nJSX Components:');

function readJsxFiles(dir, prefix = '') {
  const files = {};
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, readJsxFiles(fullPath, entry.name + '/'));
    } else if (entry.name.endsWith('.jsx')) {
      const key = prefix + entry.name;
      files[key] = readFileSync(fullPath, 'utf-8');
      console.log(`  - ${key}: ${(files[key].length / 1024).toFixed(1)} KB`);
    }
  }
  return files;
}

const jsxFiles = readJsxFiles(frontendDir);

// Define the load order for JSX files
const jsxLoadOrder = [
  'services/LogService.jsx',
  'services/ExportService.jsx',
  'hooks/useTheme.jsx',
  'hooks/useDebounce.jsx',
  'hooks/useInfiniteScroll.jsx',
  'components/Icons.jsx',
  'components/Header.jsx',
  'components/Stats.jsx',
  'components/Filters.jsx',
  'components/LogTable.jsx',
  'components/LogDetailModal.jsx',
  'components/ScrollToTop.jsx',
  'App.jsx'
];

// Build combined JSX in correct order
let combinedJsx = '';
for (const file of jsxLoadOrder) {
  if (jsxFiles[file]) {
    combinedJsx += `\n// ========== ${file} ==========\n${jsxFiles[file]}\n`;
  }
}

// ============================================
// Generate embedded module
// ============================================
const embeddedModule = `// Auto-generated by scripts/embed-assets.js - DO NOT EDIT
// Re-run: npm run embed-assets

// CSS & Tailwind
export const DAISYUI_CSS = ${JSON.stringify(daisyuiCss)};
export const TAILWIND_JS = ${JSON.stringify(tailwindJs)};

// React & Babel (for offline use)
export const REACT_JS = ${JSON.stringify(reactJs)};
export const REACT_DOM_JS = ${JSON.stringify(reactDomJs)};
export const BABEL_JS = ${JSON.stringify(babelJs)};

// SheetJS for Excel export
export const XLSX_JS = ${JSON.stringify(xlsxJs)};

// Images
export const LOGO_BASE64 = ${JSON.stringify(logoBase64)};
export const FAVICON_BUFFER = ${faviconBuffer ? `Buffer.from('${faviconBuffer.toString('base64')}', 'base64')` : 'null'};

// Combined JSX components (in load order)
export const FRONTEND_JSX = ${JSON.stringify(combinedJsx)};
`;

const outputPath = join(assetsDir, 'embedded.js');
writeFileSync(outputPath, embeddedModule);

console.log(`\nAssets embedded to: ${outputPath}`);
const totalSize = (
  daisyuiCss.length + tailwindJs.length +
  reactJs.length + reactDomJs.length + babelJs.length +
  logoBase64.length + (faviconBuffer?.length || 0) +
  combinedJsx.length
) / 1024;
console.log(`Total embedded size: ${totalSize.toFixed(1)} KB`);
