// Copia as fontes OFL (fontsource) para public/fonts. Os arquivos ficam versionados,
// então este script só precisa rodar ao atualizar as versões das fontes.
import { copyFileSync, mkdirSync } from 'node:fs';
const out = new URL('../public/fonts/', import.meta.url);
mkdirSync(out, { recursive: true });
const src = (pkg, f) => new URL(`../node_modules/@fontsource/${pkg}/files/${f}`, import.meta.url);
for (const w of [500, 600, 700]) copyFileSync(src('rajdhani', `rajdhani-latin-${w}-normal.woff2`), new URL(`rajdhani-${w}.woff2`, out));
copyFileSync(src('silkscreen', 'silkscreen-latin-400-normal.woff2'), new URL('silkscreen-400.woff2', out));
console.log('Fontes copiadas para public/fonts');
