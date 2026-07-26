import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const manifestPath = path.join(root, 'model-parts', 'ben2', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

const indexHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
if (/\b(?:src|href)="\/(?!\/)/u.test(indexHtml)) {
  throw new Error('dist/index.html contains a root-relative asset URL and is not safe for a Pages project subpath.');
}

for (const [, reference] of indexHtml.matchAll(/\b(?:src|href)="([^"]+)"/gu)) {
  if (/^(?:[a-z]+:|#)/iu.test(reference)) continue;
  const target = path.resolve(dist, reference.split(/[?#]/u)[0]);
  await stat(target);
}

const highModel = path.join(dist, ...manifest.destination.replace(/^public\//u, '').split('/'));
const highStat = await stat(highModel);
if (highStat.size !== manifest.size || await hashFile(highModel) !== manifest.sha256) {
  throw new Error('Published BEN2 model does not match its source manifest.');
}

const lowModel = path.join(dist, 'models', 'Xenova', 'modnet', 'onnx', 'model_quantized.onnx');
const lowStat = await stat(lowModel);
if (lowStat.size !== 6632188 || await hashFile(lowModel) !== '92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a') {
  throw new Error('Published MODNet model is missing or invalid.');
}

for (const part of manifest.parts) {
  const partStat = await stat(path.join(root, 'model-parts', 'ben2', part.file));
  if (partStat.size !== part.size || partStat.size >= 50 * 1024 * 1024) {
    throw new Error(`Model part ${part.file} is invalid or not below 50 MiB.`);
  }
}

const files = await listFiles(dist);
const sizes = await Promise.all(files.map(async (filePath) => (await stat(filePath)).size));
const totalSize = sizes.reduce((sum, size) => sum + size, 0);
if (totalSize >= 1024 ** 3) throw new Error('Published site exceeds the GitHub Pages 1 GB limit.');

console.log(JSON.stringify({
  files: files.length,
  totalBytes: totalSize,
  highModelBytes: highStat.size,
  lowModelBytes: lowStat.size,
  rootRelativeAssetUrls: 0,
  checksumsValid: true,
}, null, 2));
