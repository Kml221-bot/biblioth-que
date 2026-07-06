const fs = require('fs');
const sql = fs.readFileSync('migration.sql', 'utf-8');

// The SQL contains a bunch of ALTER TABLE "auth"."xxx" DROP CONSTRAINT ...
// We want to remove any line that starts with ALTER TABLE "auth" or DROP TABLE "auth"
// and the associated -- DropForeignKey or -- DropTable comments.

const lines = sql.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('"auth"."')) {
    // skip this line
    // also remove the previous line if it's a comment
    if (newLines.length > 0 && newLines[newLines.length - 1].startsWith('-- Drop')) {
      newLines.pop();
    }
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync('migration_clean.sql', newLines.join('\n'));
console.log('Cleaned migration SQL!');
