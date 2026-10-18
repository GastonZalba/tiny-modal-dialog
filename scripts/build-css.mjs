import { mkdirSync, writeFileSync } from 'node:fs';
import { compile } from 'sass';

const input = 'src/styles/modal.scss';

mkdirSync('dist', { recursive: true });

const outputs = [
  { file: 'dist/modal.css', style: 'expanded' },
  { file: 'dist/modal.min.css', style: 'compressed' }
];

for (const { file, style } of outputs) {
  const { css } = compile(input, { style, charset: true });
  writeFileSync(file, css);
  console.log(`  ${file} written (${css.length} bytes)`);
}
