import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import initSqlJs from 'sql.js';
import { Pool, type PoolClient } from 'pg';

dotenv.config();

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(
  process.argv[2] || process.env.SQLITE_FILE_PATH || path.resolve(scriptDirectory, '..', 'data', 'st_silas.sqlite'),
);
const connectionString = process.env.DATABASE_URL;

const applicationTables = [
  'users',
  'teachers',
  'parents',
  'parent_students',
  'students',
  'enrollments',
  'attendance',
  'exams',
  'marks',
  'assignments',
  'fees',
  'payments',
  'expenses',
  'borrowing_records',
  'announcements',
  'messages',
  'admissions',
  'audit_logs',
  'notifications',
  'school_content',
  'teacher_subject_assignments',
  'student_reports',
];

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function migrateSqliteToPostgres() {
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to the destination PostgreSQL database.');
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite source file not found: ${sqlitePath}`);
  }

  const SQL = await initSqlJs();
  const sqlite = new SQL.Database(new Uint8Array(fs.readFileSync(sqlitePath)));
  const pool = new Pool({ connectionString });
  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    const databaseClient = await pool.connect();
    client = databaseClient;
    const schemaResult = await databaseClient.query<{ schema_name: string }>('SELECT current_schema() AS schema_name');
    const schemaName = schemaResult.rows[0]?.schema_name;
    if (!schemaName) {
      throw new Error('Could not determine the PostgreSQL schema for the migration.');
    }

    const targetTableResult = await databaseClient.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
      [schemaName],
    );
    const targetTables = new Set(targetTableResult.rows.map((row: { table_name: string }) => row.table_name));
    if (!targetTables.has('users')) {
      throw new Error('PostgreSQL schema is not initialized. Start the application successfully before migrating.');
    }

    await databaseClient.query('BEGIN');
    transactionStarted = true;
    const tablesToLock = applicationTables.filter((table) => targetTables.has(table)).sort();
    if (tablesToLock.length > 0) {
      await databaseClient.query(
        `LOCK TABLE ${tablesToLock.map((table) => `${quoteIdentifier(schemaName)}.${quoteIdentifier(table)}`).join(', ')}
         IN SHARE ROW EXCLUSIVE MODE`,
      );
    }

    for (const table of applicationTables) {
      if (!targetTables.has(table)) continue;
      const countResult = await databaseClient.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(schemaName)}.${quoteIdentifier(table)}`,
      );
      if (Number(countResult.rows[0]?.count || 0) > 0) {
        throw new Error(
          `PostgreSQL already contains application records in "${table}". No data was imported; use an empty destination database.`,
        );
      }
    }

    const sourceTablesResult = sqlite.exec(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    );
    const sourceTables = (sourceTablesResult[0]?.values || []).map((row: unknown[]) => String(row[0]));

    for (const table of sourceTables) {
      if (!targetTables.has(table)) {
        console.log(`[Migration] Skipping SQLite-only table "${table}".`);
        continue;
      }

      const sourceColumnsResult = sqlite.exec(`PRAGMA table_info(${quoteIdentifier(table)})`);
      const sourceColumns = (sourceColumnsResult[0]?.values || []).map((column: unknown[]) => String(column[1]));
      const targetColumnsResult = await databaseClient.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2`,
        [schemaName, table],
      );
      const targetColumns = new Set(targetColumnsResult.rows.map((row: { column_name: string }) => row.column_name));
      const sharedColumns = sourceColumns.filter((column) => targetColumns.has(column));
      if (sharedColumns.length === 0) continue;

      const selectSql = `SELECT ${sharedColumns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(table)}`;
      const sourceRows = sqlite.exec(selectSql)[0]?.values || [];
      if (sourceRows.length === 0) continue;

      const columnSql = sharedColumns.map(quoteIdentifier).join(', ');
      const placeholders = sharedColumns.map((_, index) => `$${index + 1}`).join(', ');
      const insertSql = `INSERT INTO ${quoteIdentifier(schemaName)}.${quoteIdentifier(table)} (${columnSql})
        VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      let insertedRows = 0;

      for (const row of sourceRows) {
        const result = await databaseClient.query(insertSql, row);
        insertedRows += result.rowCount || 0;
      }

      console.log(
        `[Migration] ${table}: imported ${insertedRows} of ${sourceRows.length} rows; existing-key conflicts were skipped.`,
      );
    }

    if (targetTables.has('users')) {
      await databaseClient.query(`UPDATE ${quoteIdentifier(schemaName)}.users SET is_online = 0 WHERE is_online <> 0`);
    }

    await databaseClient.query('COMMIT');
    transactionStarted = false;
    console.log('[Migration] SQLite data import completed. The source file was not modified.');
  } catch (error) {
    if (transactionStarted && client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    sqlite.close();
    client?.release();
    await pool.end();
  }
}

migrateSqliteToPostgres().catch((error: unknown) => {
  console.error('[Migration] Failed:', error);
  process.exitCode = 1;
});
