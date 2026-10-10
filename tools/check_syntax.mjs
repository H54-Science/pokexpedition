// Validate every game module: unresolved merge markers otherwise break startup
// before the combat/meta tests ever import the UI.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../src/', import.meta.url));
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []);
}
let failed = false;
const modules = files(root);
for (const file of modules) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || result.error || `Syntaxe invalide : ${file}`);
  }
}
if (failed) process.exit(1);
console.log(`syntaxe : ${modules.length} modules vérifiés`);
