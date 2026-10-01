// Publica dist/ en la rama gh-pages del repositorio (GitHub Pages).
// Uso: npm run deploy   (SITE_URL por defecto: la URL de GitHub Pages del repo)
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const run = (cmd, cwd = root, env) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
const out = (cmd) => execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();

const remote = out('git remote get-url origin');
const [, owner, repo] = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)/) || [];
if (!owner) throw new Error(`No se reconoce el remoto de GitHub: ${remote}`);
const site = process.env.SITE_URL || `https://${owner.toLowerCase()}.github.io/${repo}/`;

run('node scripts/build.mjs', root, { SITE_URL: site });
run('git init -q -b gh-pages', dist);
run('git add -A', dist);
run(`git commit -q -m "Publicar web (${out('git rev-parse --short HEAD')})"`, dist);
run(`git push -f "${remote}" gh-pages`, dist);
console.log(`Publicado → ${site}`);
