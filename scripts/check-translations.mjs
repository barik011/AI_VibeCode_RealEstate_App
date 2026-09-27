import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
const dictionary = {
  ...JSON.parse(readFileSync('src/i18n/ar.json', 'utf8')),
  ...JSON.parse(readFileSync('src/i18n/ar-content.json', 'utf8')),
};
const missing = new Set();
for (const file of files('src').filter((f) => f.endsWith('.jsx'))) {
  const ast = parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.name !== 't' || path.node.arguments[0]?.type !== 'StringLiteral') return;
      const key = path.node.arguments[0].value.replace(/\s+/g, ' ').trim();
      if (/[A-Za-z]/.test(key) && !key.includes('@') && !dictionary[key]) missing.add(key);
    },
  });
}
console.log(JSON.stringify([...missing], null, 2));
if (missing.size) process.exitCode = 1;
