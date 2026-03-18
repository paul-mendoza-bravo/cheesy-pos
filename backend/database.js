import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cheesy_db',
  password: process.env.DB_PASSWORD || '12345',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const setupDatabase = async () => {
    let client;
    try {
        console.log('Connecting to PostgreSQL to initialize database...');
        client = await pool.connect();
        
        // Read the schema file (creates tables if they don't exist)
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);

        // Run migrations for existing databases (add new columns if missing)
        const migrations = [
          `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cajero_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL`,
          `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cocinero_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL`,
          `ALTER TABLE orders ADD COLUMN IF NOT EXISTS repartidor_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL`,
          `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_link TEXT`,
          `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)`,
        ];

        for (const migration of migrations) {
          try {
            await client.query(migration);
          } catch (err) {
            // Ignore errors (column already exists, etc.)
          }
        }

        console.log('Database initialized successfully.');
        
    } catch (error) {
        console.error('Error during database initialization:', error);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};

export default pool;
