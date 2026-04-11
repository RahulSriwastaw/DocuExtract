import { Client } from 'pg';

const connectionString = 'postgresql://postgres.yxibppbfrugarjoeoijw:iuTKL5bWoinAH6kr@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function addColumns() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS topic TEXT,
      ADD COLUMN IF NOT EXISTS sub_topic TEXT,
      ADD COLUMN IF NOT EXISTS sub_subject TEXT,
      ADD COLUMN IF NOT EXISTS sub_chapter TEXT,
      ADD COLUMN IF NOT EXISTS keywords TEXT;
    `);
    console.log("Columns added successfully.");
  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await client.end();
  }
}

addColumns();
