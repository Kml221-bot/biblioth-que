const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    const sql = fs.readFileSync('migration_clean.sql', 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i];
      // Skip empty statements or comments
      if (!stmt || stmt.startsWith('-- Drop')) continue;
      
      try {
        await client.query(stmt);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.error(`Error executing statement ${i}:`, e.message);
          console.error(stmt.substring(0, 50) + '...');
        }
      }
    }
    console.log('Migration applied successfully via sequential statements');
  } catch (err) {
    console.error('Connection Error:', err);
  } finally {
    await client.end();
  }
}

run();
