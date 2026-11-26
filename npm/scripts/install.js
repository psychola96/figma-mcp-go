#!/usr/bin/env node
'use strict';

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const os = require('node:os');

const pkg = require('../package.json');
const version = pkg.version;

const PLATFORM_MAP = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows',
};

const ARCH_MAP = {
  x64: 'amd64',
  arm64: 'arm64',
};

const goos = PLATFORM_MAP[process.platform];
const goarch = ARCH_MAP[process.arch];

if (!goos || !goarch) {
  console.error(`[figma-mcp-go] Unsupported platform: ${process.platform}/${process.arch}`);
  process.exit(1);
}

const isWindows = goos === 'windows';
const binaryName = isWindows ? 'figma-mcp-go.exe' : 'figma-mcp-go';
const ext = isWindows ? '.zip' : '.tar.gz';
const archiveName = `figma-mcp-go_${goos}_${goarch}${ext}`;
const downloadUrl = `https://github.com/psychola96/figma-mcp-go/releases/download/v${version}/${archiveName}`;
const binDir = path.join(__dirname, '..', 'bin');
const tmpFile = path.join(os.tmpdir(), archiveName);
const checksumsPath = path.join(__dirname, '..', 'checksums', `${version}.json`);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(u, redirects = 0) {
      if (redirects > 5 || !u.startsWith('https://')) return reject(new Error(`Refusing unsafe download URL: ${u}`));
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return get(new URL(res.headers.location, u).toString(), redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} downloading ${u}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

function verifyChecksum(file) {
  if (!fs.existsSync(checksumsPath)) throw new Error(`Missing integrity manifest: ${checksumsPath}`);
  const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
  const expected = checksums[archiveName];
  if (!/^[a-f0-9]{64}$/i.test(expected || '')) throw new Error(`Missing SHA-256 for ${archiveName}`);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`SHA-256 mismatch for ${archiveName}: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  console.log(`[figma-mcp-go] Downloading ${archiveName}...`);

  try {
    await download(downloadUrl, tmpFile);
    verifyChecksum(tmpFile);
  } catch (err) {
    console.error(`[figma-mcp-go] Download or integrity verification failed: ${err.message}`);
    console.error(`[figma-mcp-go] URL: ${downloadUrl}`);
    process.exit(1);
  }

  fs.mkdirSync(binDir, { recursive: true });

  try {
    if (isWindows) {
      execFileSync('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -Force -Path "${tmpFile}" -DestinationPath "${binDir}"`,
      ]);
    } else {
      execFileSync('tar', ['xzf', tmpFile, '-C', binDir, binaryName]);
      fs.chmodSync(path.join(binDir, binaryName), 0o755);
    }
  } catch (err) {
    console.error(`[figma-mcp-go] Failed to extract: ${err.message}`);
    process.exit(1);
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }

  console.log('[figma-mcp-go] Installed successfully.');
}

main();
