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
    await client.query(sql);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
