const fs = require('fs');
let txt = fs.readFileSync('.env', 'utf-8');

// Set both DATABASE_URL and DIRECT_URL to use the direct connection for the migration
txt = txt.replace(/aws-0-eu-west-1\.pooler\.supabase\.com:\d+/g, 'db.vnhzahpnkivbraswwknh.supabase.co:5432');
txt = txt.replace(/\?pgbouncer=true&/g, '?');
txt = txt.replace(/\?pgbouncer=true/g, '');

fs.writeFileSync('.env', txt);
console.log('Updated URLs');
