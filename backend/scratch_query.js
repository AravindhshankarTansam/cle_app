import { getDatabase } from './database.js';

async function run() {
  const { db } = await getDatabase();
  await db.query('DROP DATABASE IF EXISTS missed_call_db');
  console.log('Dropped database');
  process.exit(0);
}

run();
