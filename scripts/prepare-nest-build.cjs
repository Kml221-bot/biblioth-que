const fs = require('node:fs');
const path = require('node:path');

const distNestDir = path.resolve(__dirname, '..', 'dist', 'nest');
fs.mkdirSync(distNestDir, { recursive: true });
fs.writeFileSync(path.join(distNestDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
