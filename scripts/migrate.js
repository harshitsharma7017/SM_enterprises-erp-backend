import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database.js';

async function runMigrations() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Create migrations table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.resolve('src/database/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();

    const [rows] = await connection.query('SELECT migration FROM schema_migrations');
    const executedMigrations = rows.map(r => r.migration);

    for (const file of files) {
      if (executedMigrations.includes(file)) {
        console.log(`[SKIP] Migration already run: ${file}`);
        continue;
      }

      console.log(`[START] Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      
      // Dynamic import
      const migrationModule = await import(filePath);

      await connection.beginTransaction();
      try {
        if (migrationModule.up) {
          await migrationModule.up(connection);
        } else {
          throw new Error(`Migration ${file} does not have an 'up' function.`);
        }
        
        await connection.query('INSERT INTO schema_migrations (migration) VALUES (?)', [file]);
        await connection.commit();
        console.log(`[SUCCESS] Migration completed: ${file}`);
      } catch (err) {
        await connection.rollback();
        console.error(`[FAILED] Migration failed: ${file}`);
        throw err;
      }
    }
  } catch (err) {
    console.error('Migration process encountered an error:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
}

runMigrations();
