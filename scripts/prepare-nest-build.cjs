#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'dist', 'nest');

// Clean previous build output to avoid stale files
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// Ensure the output directory exists
fs.mkdirSync(outDir, { recursive: true });

console.log('✔ Prepared dist/nest for NestJS build');
