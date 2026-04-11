import pkg from 'pg';
const { Client } = pkg;

const pgClient = new Client({
  connectionString: 'postgresql://postgres:epkQxGTaz0wQdhVE@db.aekhuewsedfnvtuczmbs.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pgClient.connect();
  const res = await pgClient.query('SELECT DISTINCT airtable_table_name FROM questions WHERE airtable_table_name IS NOT NULL');
  console.log(res.rows);
  await pgClient.end();
}

run().catch(console.error);
