const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const client = new Pool({
  connectionString: process.env.DATABASE,
});

client
  .connect()
  .then(() => console.log('PostgreSQL pool connection successful!'))
  .catch((err) => {
    console.log('Failed to connect to PostgreSQL Pool:', err);
    process.exit(1);
  });

module.exports = client;
