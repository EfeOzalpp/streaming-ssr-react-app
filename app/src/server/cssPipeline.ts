// src/server/cssPipeline.ts
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import postcssPrefixSelector from 'postcss-prefix-selector';

/**
 * Processes CSS files with the same prefixer logic used in client build.
 * Returns one concatenated CSS string.
 */
export async function buildCriticalCss(
  files: string[],
  {
    prefix = '#main-shell',
    allow = (selector: string) =>
      selector.startsWith('html') ||
      selector.startsWith('body') ||
      selector.startsWith(':root') ||
      selector.includes('#dynamic-theme') ||
      selector.includes('#shadow-dynamic-app') ||
      selector.includes('::slotted'),
  }: {
    prefix?: string;
    allow?: (selector: string) => boolean;
  } = {}
): Promise<string> {
  const root = process.cwd();
  const out: string[] = [];

  const plugins = [
    postcssPrefixSelector({
      prefix,
      transform: (_p, selector, prefixed) => (allow(selector) ? selector : prefixed),
    }),
  ];

  for (const rel of files) {
    const abs = path.resolve(root, rel);
    if (!fs.existsSync(abs)) continue;
    const css = fs.readFileSync(abs, 'utf8');
    const result = await postcss(plugins).process(css, { from: abs });
    out.push(result.css);
  }
  return out.join('\n/* --- separator --- */\n');
}
