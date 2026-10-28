#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const binaryName = process.platform === 'win32' ? 'figma-mcp-go.exe' : 'figma-mcp-go';
const binaryPath = path.join(__dirname, binaryName);

if (process.argv[2] === 'setup') {
  const setupPath = path.join(__dirname, 'setup.js');
  const result = spawnSync(process.execPath, [setupPath, ...process.argv.slice(3)], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

if (!existsSync(binaryPath)) {
  process.stderr.write(
    '[figma-mcp-go2] Binary not found. Try reinstalling: npm install figma-mcp-go2\n'
  );
  process.exit(1);
}

const result = spawnSync(binaryPath, process.argv.slice(2), { stdio: 'inherit' });
process.exit(result.status ?? 1);
