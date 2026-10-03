import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const tokenFile = 'src/styles/tokens.css';
const errors = [];
const definitions = new Set();
const tokens = new Map();
const references = [];
const variableReferences = (value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const intrinsic =
  /^(?:inherit|initial|unset|revert|revert-layer|currentColor|transparent|none|auto)$/i;

async function stylesheets(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await stylesheets(absolute)));
    else if (entry.name.endsWith('.css')) files.push(absolute);
  }
  return files;
}

const files = await stylesheets(path.join(root, 'src'));
for (const absolute of files) {
  const file = path.relative(root, absolute).split(path.sep).join('/');
  const stylesheet = postcss.parse(await readFile(absolute, 'utf8'), { from: file });
  stylesheet.walkDecls((declaration) => {
    const { prop, value } = declaration;
    const location = `${file}:${declaration.source.start.line}`;
    const fail = (message) => errors.push(`${location}: ${message}`);
    for (const variable of variableReferences(value)) references.push({ variable, location });
    if (prop.startsWith('--')) definitions.add(prop);

    if (file === tokenFile) {
      if (!prop.startsWith('--') || declaration.parent.selector !== ':root') {
        fail('Keep only global custom properties in the token file.');
      }
      if (tokens.has(prop)) fail(`Duplicate token ${prop}.`);
      tokens.set(prop, value);
      return;
    }

    if (
      ['font-size', 'font-weight'].includes(prop) &&
      !/^var\(--[\w-]+\)$/.test(value) &&
      !intrinsic.test(value)
    ) {
      fail(`${prop} must use a shared token via var().`);
    }
    if (
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(|\b(?:white|black)\b/i.test(
        value.replace(/var\(\s*--[\w-]+\s*\)/g, ''),
      )
    ) {
      fail('Move literal colors into the shared token file.');
    }
    if (
      /^(?:color|background-color|border(?:-.*)?-color|outline-color|text-decoration-color|caret-color|accent-color|fill|stroke)$/.test(
        prop,
      )
    ) {
      const remaining = value.replace(/var\(--[\w-]+\)/g, '').trim();
      if (remaining && !intrinsic.test(remaining))
        fail(`${prop} must use color tokens or CSS inheritance keywords.`);
    }
  });
}

for (const { variable, location } of references) {
  if (!definitions.has(variable)) errors.push(`${location}: Undefined variable ${variable}.`);
}

const visited = new Set();
function checkCycle(name, chain = []) {
  if (chain.includes(name)) {
    errors.push(`${tokenFile}: Circular token reference: ${[...chain, name].join(' -> ')}.`);
    return;
  }
  if (visited.has(name)) return;
  for (const reference of variableReferences(tokens.get(name) || '')) {
    if (tokens.has(reference)) checkCycle(reference, [...chain, name]);
  }
  visited.add(name);
}
for (const name of tokens.keys()) checkCycle(name);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `CSS tokens verified across ${files.length} stylesheets (${tokens.size} shared tokens).`,
  );
}
