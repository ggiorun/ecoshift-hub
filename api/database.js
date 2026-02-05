require('dotenv').config();
const path = require('path');

let db;
let isPostgres = false;

// Check for Postgres URL in environment variables
const pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (pgUrl) {
  isPostgres = true;
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: pgUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Connected to PostgreSQL database.');
  initDb();
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, 'ecoshift.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
      console.log('Connected to local SQLite database.');
      initDb();
    }
  });
}

// Unified Query Interface
async function query(sql, params = []) {
  if (isPostgres) {
    // Convert ? to $1, $2, etc. for Postgres
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

    try {
      const result = await db.query(pgSql, params);
      return result.rows;
    } catch (err) {
      throw err;
    }
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      // Determine if it's a SELECT or a modification
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      }
    });
  }
}

// Initialize Tables
async function initDb() {
  const tableQueries = [
    // Users Table
    `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT,
            skills TEXT,
            accessibilityNeeds TEXT,
            credits INTEGER,
            password TEXT
        )`,
    // Trips Table
    `CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            driverId TEXT,
            driverName TEXT,
            fromLoc TEXT,
            toLoc TEXT,
            departureTime TEXT,
            seatsAvailable INTEGER,
            distanceKm REAL,
            co2Saved REAL,
            tutoringSubject TEXT,
            assistanceOffered INTEGER,
            specialEquipment TEXT,
            passengerIds TEXT
        )`,
    // Credit Logs
    `CREATE TABLE IF NOT EXISTS credit_logs (
            id TEXT PRIMARY KEY,
            userId TEXT,
            amount INTEGER,
            reason TEXT,
            timestamp TEXT
        )`,
    // Messages (Chat)
    `CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            tripId TEXT,
            senderId TEXT,
            senderName TEXT,
            text TEXT,
            timestamp TEXT
        )`,
    // Notifications
    `CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            userId TEXT,
            text TEXT,
            read INTEGER,
            type TEXT,
            timestamp TEXT
        )`,
    // Study Groups
    `CREATE TABLE IF NOT EXISTS study_groups (
            id TEXT PRIMARY KEY,
            trainNumber TEXT,
            trainLine TEXT,
            departureTime TEXT,
            subject TEXT,
            fromLoc TEXT,
            creatorId TEXT,
            members TEXT,
            maxMembers INTEGER
        )`
  ];

  try {
    for (const sql of tableQueries) {
      await query(sql);
    }
    console.log('Database tables initialized.');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
}

module.exports = {
  query,
  initDb
};
