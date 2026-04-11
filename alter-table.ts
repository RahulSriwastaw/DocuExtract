import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not configured. Please set DATABASE_URL environment variable.");
  process.exit(1);
}

async function alterTable() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS image TEXT;`);
    console.log("Column 'image' added successfully.");
  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await client.end();
  }
}

alterTable();
