import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database.js';

async function validateSchema() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('--- STARTING SCHEMA VALIDATION ---');
    
    const schemaPath = path.resolve('docs/database-translation.md');
    const content = fs.readFileSync(schemaPath, 'utf8');
    const lines = content.split('\n');
    
    const tables = {};
    let currentTable = null;
    let currentColumn = null;
    let section = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## 2. Columns')) section = 2;
      else if (line.startsWith('## 3. Enums')) section = 3;
      else if (line.startsWith('## 4. Decimal Columns')) section = 4;
      else if (line.startsWith('## 5. Indexes')) section = 5;
      else if (line.startsWith('## 6. Unique Constraints')) section = 6;
      else if (line.startsWith('## 7. Foreign Keys')) section = 7;
      else if (line.startsWith('## 8.')) section = 8;

      if (section === 2) {
        if (line.startsWith('### `')) {
          const match = line.match(/### `([^`]+)`/);
          if (match) {
            currentTable = match[1];
            tables[currentTable] = { columns: {}, indexes: [], uniques: [], fks: [] };
          }
        } else if (line.startsWith('#### `') && currentTable) {
          const match = line.match(/#### `([^`]+)`/);
          if (match) {
            currentColumn = match[1];
            tables[currentTable].columns[currentColumn] = {};
          }
        } else if (line.startsWith('- ') && currentTable && currentColumn) {
          const kv = line.substring(2).split(':');
          if (kv.length >= 2) {
            const key = kv[0].trim();
            const val = kv.slice(1).join(':').trim();
            if (key === 'MySQL Type') tables[currentTable].columns[currentColumn].type = val.replace(/`/g, '');
            else if (key === 'Nullable') tables[currentTable].columns[currentColumn].nullable = val === 'YES';
            else if (key === 'Default') tables[currentTable].columns[currentColumn].default = val.replace(/`/g, '');
          }
        }
      } else if (section === 5 && line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').map(s=>s.trim()).filter(Boolean);
        if (parts.length >= 3 && parts[0] !== 'Table') {
          // If the parsed string happens to end with _index or _idx due to legacy malformed lists, filter it out.
          const colsList = parts[1].split(',').map(s=>s.trim()).filter(p => !p.endsWith('_index') && !p.endsWith('_idx'));
          tables[parts[0]].indexes.push({ cols: colsList.join(', '), name: parts[2] });
        }
      } else if (section === 6 && line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').map(s=>s.trim()).filter(Boolean);
        if (parts.length >= 3 && parts[0] !== 'Table') {
          const colsList = parts[1].split(',').map(s=>s.trim()).filter(p => !p.endsWith('_unique'));
          tables[parts[0]].uniques.push({ cols: colsList.join(', '), name: parts[2] });
        }
      } else if (section === 7 && line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').map(s=>s.trim()).filter(Boolean);
        if (parts.length >= 7 && parts[0] !== 'Table' && parts[0] !== 'Child Table') {
          tables[parts[0]].fks.push({
            col: parts[1],
            refTable: parts[2],
            refCol: parts[3],
            onDelete: parts[5]
          });
        }
      }
    }

    const excluded = ['sessions', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'];
    excluded.forEach(t => delete tables[t]);

    const expectedTables = Object.keys(tables);
    const [dbTables] = await connection.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME != 'schema_migrations'`);
    const dbTableNames = dbTables.map(t => t.TABLE_NAME);

    let errors = 0;

    // 1. Tables check
    for (const t of expectedTables) {
      if (!dbTableNames.includes(t)) { console.error(`❌ MISSING TABLE: ${t}`); errors++; }
    }
    for (const t of dbTableNames) {
      if (!expectedTables.includes(t)) { console.error(`❌ UNEXPECTED TABLE: ${t}`); errors++; }
    }

    // Index/Unique maps from DB
    const dbIdxMap = {};
    for (const t of expectedTables) {
      if (!dbTableNames.includes(t)) continue;
      const [idxs] = await connection.query(`SHOW INDEXES FROM \`${t}\``);
      const groups = {};
      idxs.forEach(row => {
        if (row.Key_name === 'PRIMARY') return;
        if (!groups[row.Key_name]) groups[row.Key_name] = { name: row.Key_name, cols: [], unique: row.Non_unique === 0 };
        groups[row.Key_name].cols.push(row.Column_name);
      });
      dbIdxMap[t] = { uniques: [], indexes: [] };
      Object.values(groups).forEach(g => {
        const info = { name: g.name, cols: g.cols.join(', ') };
        if (g.unique) dbIdxMap[t].uniques.push(info);
        else dbIdxMap[t].indexes.push(info);
      });
    }

    // 2. Columns & Constraints Check
    for (const t of expectedTables) {
      if (!dbTableNames.includes(t)) continue;

      const [dbCols] = await connection.query(`SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [t]);
      const actualCols = {};
      dbCols.forEach(c => actualCols[c.COLUMN_NAME] = { type: c.COLUMN_TYPE.toUpperCase(), nullable: c.IS_NULLABLE === 'YES' });
      
      const expectedCols = tables[t].columns;
      // Note: We check if DB is missing expected columns. We ALSO check if DB has extra columns!
      for (const [cName, cDef] of Object.entries(expectedCols)) {
        if (!actualCols[cName]) {
          console.error(`❌ MISSING COLUMN: ${t}.${cName}`);
          errors++;
          continue;
        }
      }
      for (const [cName, cDef] of Object.entries(actualCols)) {
        if (!expectedCols[cName]) {
          console.error(`❌ UNEXPECTED COLUMN (Phantom): ${t}.${cName}`);
          errors++;
        }
      }

      // Check Indexes
      for (const expected of tables[t].indexes) {
        const matched = [...(dbIdxMap[t].indexes), ...(dbIdxMap[t].uniques)].find(i => i.cols === expected.cols);
        if (!matched) {
          console.error(`❌ MISSING INDEX on ${t}(${expected.cols})`);
          errors++;
        }
      }

      // Check Uniques
      for (const expected of tables[t].uniques) {
        const matched = dbIdxMap[t].uniques.find(u => u.cols === expected.cols);
        if (!matched) {
          console.error(`❌ MISSING UNIQUE on ${t}(${expected.cols})`);
          errors++;
        }
      }
    }

    // 3. Foreign Keys check
    const [dbFks] = await connection.query(`
      SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE kcu
      WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    // Check missing expected FKs
    for (const t of expectedTables) {
      for (const expected of tables[t].fks) {
        const matched = dbFks.find(fk => fk.TABLE_NAME === t && fk.COLUMN_NAME === expected.col && fk.REFERENCED_TABLE_NAME === expected.refTable && fk.REFERENCED_COLUMN_NAME === expected.refCol);
        if (!matched) {
          console.error(`❌ MISSING FK on ${t}.${expected.col} -> ${expected.refTable}.${expected.refCol}`);
          errors++;
        }
      }
    }
    
    // Check unexpected DB FKs
    for (const fk of dbFks) {
      const t = fk.TABLE_NAME;
      const expectedFks = tables[t]?.fks || [];
      const matched = expectedFks.find(e => e.col === fk.COLUMN_NAME && e.refTable === fk.REFERENCED_TABLE_NAME && e.refCol === fk.REFERENCED_COLUMN_NAME);
      if (!matched) {
         console.error(`❌ UNEXPECTED FK (Phantom): ${t}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
         errors++;
      }
    }

    if (errors === 0) {
      console.log('✅ DATABASE SCHEMA VALIDATION PASSED SUCCESSFULLY.');
      console.log(`✅ Validated ${expectedTables.length} tables, columns, indexes, and FKs.`);
    } else {
      console.error(`❌ VALIDATION FAILED WITH ${errors} ERRORS.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Validation error:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
}

validateSchema();
