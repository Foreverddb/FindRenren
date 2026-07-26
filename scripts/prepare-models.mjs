import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDirectory = path.join(root, 'model-parts', 'ben2');
const manifest = JSON.parse(await readFile(path.join(partsDirectory, 'manifest.json'), 'utf8'));
const canonicalDestination = path.join(root, ...manifest.destination.split('/'));
const destination = process.env.BEN2_MODEL_OUTPUT
  ? path.resolve(root, process.env.BEN2_MODEL_OUTPUT)
  : canonicalDestination;

async function hashFile(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function fileMatches(filePath, expectedSize, expectedHash) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.size === expectedSize && await hashFile(filePath) === expectedHash;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function splitModel() {
  if (!await fileMatches(canonicalDestination, manifest.size, manifest.sha256)) {
    throw new Error(`Cannot split BEN2: ${manifest.destination} is missing or has an unexpected checksum.`);
  }

  await mkdir(partsDirectory, { recursive: true });
  let start = 0;
  for (const part of manifest.parts) {
    const partPath = path.join(partsDirectory, part.file);
    const end = start + part.size - 1;
    const input = createReadStream(canonicalDestination, { start, end });
    const output = createWriteStream(partPath);
    input.pipe(output);
    await once(output, 'finish');
    const partStat = await stat(partPath);
    if (partStat.size !== part.size) throw new Error(`Unexpected size for ${part.file}.`);
    start = end + 1;
  }

  if (start !== manifest.size) throw new Error('BEN2 part sizes do not match the source model size.');
  console.log(`Split BEN2 into ${manifest.parts.length} Git-safe parts.`);
}

async function assembleModel() {
  if (await fileMatches(destination, manifest.size, manifest.sha256)) {
    console.log('BEN2 model is ready.');
    return;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.model-assembly.tmp`;
  const output = createWriteStream(temporary);

  try {
    for (const part of manifest.parts) {
      const partPath = path.join(partsDirectory, part.file);
      const partStat = await stat(partPath);
      if (partStat.size !== part.size) throw new Error(`Missing or invalid model part: ${part.file}`);
      for await (const chunk of createReadStream(partPath)) {
        if (!output.write(chunk)) await once(output, 'drain');
      }
    }
    output.end();
    await once(output, 'finish');

    if (!await fileMatches(temporary, manifest.size, manifest.sha256)) {
      throw new Error('Assembled BEN2 model checksum does not match the manifest.');
    }

    await rm(destination, { force: true });
    await rename(temporary, destination);
    console.log('Assembled and verified the BEN2 model.');
  } catch (error) {
    output.destroy();
    await rm(temporary, { force: true });
    throw error;
  }
}

if (process.argv.includes('--split')) await splitModel();
else await assembleModel();
