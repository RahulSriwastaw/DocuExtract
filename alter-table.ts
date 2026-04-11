import { Client } from 'pg';

const connectionString = 'postgresql://postgres.yxibppbfrugarjoeoijw:iuTKL5bWoinAH6kr@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

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
