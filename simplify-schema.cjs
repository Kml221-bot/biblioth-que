const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(/schemas\s*=\s*\["public",\s*"auth"\]/, '');
schema = schema.replace(/@@schema\("auth"\)/g, '');
schema = schema.replace(/@@schema\("public"\)/g, '');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema simplified for db push');
