import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';

dotenv.config();

let pool: any = null;
let sqliteDb: any = null;
const isPostgres = !!process.env.DATABASE_URL;

async function getDb() {
  if (isPostgres) {
    if (!pool) {
      const { Pool } = pg;
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      console.log('Using PostgreSQL database');
    }
    return { pool, isPostgres: true };
  } else {
    if (!sqliteDb) {
      console.log('Using SQLite database (fallback)');
      sqliteDb = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
      });
    }
    return { sqliteDb, isPostgres: false };
  }
}

export const db = {
  query: async (text: string, params?: any[]) => {
    const { pool, sqliteDb, isPostgres } = await getDb();
    if (isPostgres) {
      let index = 1;
      const formattedText = text.replace(/\?/g, () => `$${index++}`);
      return pool.query(formattedText, params);
    } else {
      return sqliteDb.all(text, params);
    }
  },
  get: async (text: string, params?: any[]) => {
    const { pool, sqliteDb, isPostgres } = await getDb();
    if (isPostgres) {
      let index = 1;
      const formattedText = text.replace(/\?/g, () => `$${index++}`);
      const { rows } = await pool.query(formattedText, params);
      return rows[0];
    } else {
      return sqliteDb.get(text, params);
    }
  },
  all: async (text: string, params?: any[]) => {
    const { pool, sqliteDb, isPostgres } = await getDb();
    if (isPostgres) {
      let index = 1;
      const formattedText = text.replace(/\?/g, () => `$${index++}`);
      const { rows } = await pool.query(formattedText, params);
      return rows;
    } else {
      return sqliteDb.all(text, params);
    }
  },
  run: async (text: string, params?: any[]) => {
    const { pool, sqliteDb, isPostgres } = await getDb();
    if (isPostgres) {
      let index = 1;
      const formattedText = text.replace(/\?/g, () => `$${index++}`);
      const result = await pool.query(formattedText, params);
      return { changes: result.rowCount, lastID: null };
    } else {
      const result = await sqliteDb.run(text, params);
      return { changes: result.changes, lastID: result.lastID };
    }
  },
  exec: async (text: string) => {
    const { pool, sqliteDb, isPostgres } = await getDb();
    if (isPostgres) {
      await pool.query(text);
    } else {
      await sqliteDb.exec(text);
    }
  }
};
