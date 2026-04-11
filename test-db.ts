import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not configured. Please set DATABASE_URL environment variable.");
  process.exit(1);
}

const pgClient = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pgClient.connect();
  const res = await pgClient.query('SELECT DISTINCT airtable_table_name FROM questions WHERE airtable_table_name IS NOT NULL');
  console.log(res.rows);
  await pgClient.end();
}

run().catch(console.error);
