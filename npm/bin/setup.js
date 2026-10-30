#!/usr/bin/env node
'use strict';

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const pkg = require('../package.json');
const version = process.env.FIGMA_MCP_GO2_VERSION || pkg.version;
const repository = 'psychola96/figma-mcp-go';
const archiveName = 'figma-mcp-go2-plugin.zip';
const downloadUrl = `https://github.com/${repository}/releases/download/v${version}/${archiveName}`;
const setupRoot = process.env.FIGMA_MCP_GO2_HOME || path.join(os.homedir(), '.figma-mcp-go2');
const pluginDir = path.join(setupRoot, 'plugin');
const configPath = path.join(setupRoot, 'mcp-config.json');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const codexConfigPath = path.join(codexHome, 'config.toml');
const claudeConfigPath = path.join(setupRoot, 'claude-mcp-config.json');
const deepseekConfigPath = path.join(setupRoot, 'deepseek-mcp-config.json');
const tmpFile = path.join(os.tmpdir(), `figma-mcp-go2-${process.pid}.zip`);
const tmpExtract = path.join(os.tmpdir(), `figma-mcp-go2-${process.pid}`);

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          return request(response.headers.location);
        }
        if (response.statusCode !== 200) {
          response.resume();
          file.close();
          fs.rmSync(destination, { force: true });
          return reject(new Error(`HTTP ${response.statusCode} downloading ${currentUrl}`));
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

function extractArchive() {
  fs.rmSync(tmpExtract, { recursive: true, force: true });
  fs.mkdirSync(tmpExtract, { recursive: true });
  if (process.platform === 'win32') {
    execFileSync('powershell', [
      '-NoProfile', '-Command',
      `Expand-Archive -Force -Path "${tmpFile}" -DestinationPath "${tmpExtract}"`,
    ]);
  } else {
    execFileSync('unzip', ['-q', '-o', tmpFile, '-d', tmpExtract]);
  }
}

function findFile(name) {
  const entries = fs.readdirSync(tmpExtract, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(tmpExtract, entry.name);
    if (entry.isFile() && entry.name === name) return fullPath;
    if (entry.isDirectory()) {
      const nested = findFileIn(fullPath, name);
      if (nested) return nested;
    }
  }
  return null;
}

function findFileIn(directory, name) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === name) return fullPath;
    if (entry.isDirectory()) {
      const nested = findFileIn(fullPath, name);
      if (nested) return nested;
    }
  }
  return null;
}

function configureCodex() {
  if (!fs.existsSync(codexConfigPath)) return false;
  let config = fs.readFileSync(codexConfigPath, 'utf8');
  const section = '[mcp_servers.figma-mcp-go2]';
  if (!config.includes(section)) {
    const block = `\n${section}\ncommand = "npx"\nargs = ["-y", "figma-mcp-go2"]\nstartup_timeout_sec = 120\nenabled = true\n`;
    fs.appendFileSync(codexConfigPath, block);
  } else {
    config = config.replace(/(\[mcp_servers\.figma-mcp-go2\][\s\S]*?)(?=\n\[|$)/, (match) => {
      let updated = match.replace(/^enabled\s*=.*$/m, 'enabled = true');
      if (!/^enabled\s*=/m.test(updated)) updated += '\nenabled = true';
      return updated;
    });
    fs.writeFileSync(codexConfigPath, config);
  }
  return true;
}

function mcpServerConfig() {
  return {
    mcpServers: {
      'figma-mcp-go2': {
        command: 'npx',
        args: ['-y', 'figma-mcp-go2'],
      },
    },
  };
}

function configureClaude() {
  fs.writeFileSync(claudeConfigPath, `${JSON.stringify(mcpServerConfig(), null, 2)}\n`);
  try {
    const command = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(command, ['claude'], { stdio: 'ignore' });
    execFileSync('claude', [
      'mcp', 'add', '--scope', 'user', 'figma-mcp-go2', '--', 'npx', '-y', 'figma-mcp-go2',
    ], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

async function main() {
  console.log(`[figma-mcp-go2] Downloading ${archiveName} v${version}...`);
  try {
    await download(downloadUrl, tmpFile);
    extractArchive();

    const files = ['manifest.json', 'code.js', 'ui.html'];
    const sourceFiles = files.map((name) => ({ name, source: findFile(name) }));
    const missing = sourceFiles.filter((file) => !file.source).map((file) => file.name);
    if (missing.length) throw new Error(`Plugin archive is missing: ${missing.join(', ')}`);

    fs.mkdirSync(pluginDir, { recursive: true });
    for (const file of sourceFiles) fs.copyFileSync(file.source, path.join(pluginDir, file.name));

    fs.mkdirSync(setupRoot, { recursive: true });
    const mcpConfig = mcpServerConfig();
    fs.writeFileSync(configPath, `${JSON.stringify(mcpConfig, null, 2)}\n`);
    fs.writeFileSync(deepseekConfigPath, `${JSON.stringify(mcpConfig, null, 2)}\n`);

    const codexConfigured = configureCodex();
    const claudeConfigured = configureClaude();

    console.log('[figma-mcp-go2] Plugin installed.');
    console.log(`[figma-mcp-go2] Import this manifest in Figma Desktop:\n  ${path.join(pluginDir, 'manifest.json')}`);
    console.log(`[figma-mcp-go2] MCP config example written to:\n  ${configPath}`);
    console.log(`[figma-mcp-go2] Claude Code config written to:\n  ${claudeConfigPath}`);
    console.log(`[figma-mcp-go2] DeepSeek Harness config written to:\n  ${deepseekConfigPath}`);
    if (claudeConfigured) console.log('[figma-mcp-go2] Claude Code MCP configuration updated automatically.');
    if (codexConfigured) {
      console.log(`[figma-mcp-go2] Codex MCP configuration updated:\n  ${codexConfigPath}`);
      console.log('[figma-mcp-go2] Restart Codex to load the new MCP server.');
    }
  } catch (error) {
    console.error(`[figma-mcp-go2] Setup failed: ${error.message}`);
    console.error(`[figma-mcp-go2] URL: ${downloadUrl}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(tmpFile, { force: true });
    fs.rmSync(tmpExtract, { recursive: true, force: true });
  }
}

main();
