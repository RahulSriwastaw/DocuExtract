import pkg from 'pg';
const { Client } = pkg;

const pgClient = new Client({
  connectionString: 'postgresql://postgres.aekhuewsedfnvtuczmbs:epkQxGTaz0wQdhVE@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pgClient.connect();
  const res = await pgClient.query('SELECT DISTINCT airtable_table_name FROM questions WHERE airtable_table_name IS NOT NULL');
  console.log(res.rows);
  await pgClient.end();
}

run().catch(console.error);
