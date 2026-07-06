#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const distNestDir = path.resolve(__dirname, '..', 'dist', 'nest');

// Clean previous build output to avoid stale files
if (fs.existsSync(distNestDir)) {
  fs.rmSync(distNestDir, { recursive: true, force: true });
}

// Ensure the output directory exists
fs.mkdirSync(distNestDir, { recursive: true });

// Write package.json to force CommonJS for NestJS output
fs.writeFileSync(path.join(distNestDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');

console.log('✔ Prepared dist/nest for NestJS build');
