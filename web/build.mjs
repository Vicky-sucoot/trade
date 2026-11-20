import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
await mkdir('dist/assets', { recursive: true });
const result = await build({
  entryPoints: ['entry.jsx'],
  outdir: 'dist/assets',
  jsx: 'automatic',
  bundle: true,
  splitting: true,
  metafile: true,
  entryNames: '[name]-[hash]',
  format: 'esm',
  minify: true,
  target: 'es2022',
});
const [script, entry] = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint === 'entry.jsx');
const html = await readFile('public/index.html', 'utf8');
await writeFile('dist/index.html', html.replace('./assets/entry.js', './' + script.replace(/^dist\//, ''))
  .replace('./assets/entry.css', './' + entry.cssBundle.replace(/^dist\//, '')));

await cp('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'dist/assets/pdf.worker.mjs');
await cp('node_modules/pdfjs-dist/cmaps', 'dist/assets/cmaps', { recursive: true });
