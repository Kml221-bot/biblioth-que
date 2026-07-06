const fs = require('fs');
let txt = fs.readFileSync('.env', 'utf-8');

// Use the transaction pooler for everything by removing DIRECT_URL
txt = txt.replace(/DIRECT_URL=.*\n/g, '');
// Restore DATABASE_URL to its original state using 6543 and pgbouncer=true
txt = txt.replace(/DATABASE_URL=.*/, 'DATABASE_URL="postgresql://postgres.vnhzahpnkivbraswwknh:Mouhamadoukn22.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"');

fs.writeFileSync('.env', txt);
console.log('Restored transaction pooler');
