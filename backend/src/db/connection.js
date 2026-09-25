const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let dbInstance = null;

function getDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbFilePath = customPath || config.dbPath;
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbFilePath, {
    // verbose: config.env === 'development' ? console.log : null
  });

  // Enable foreign keys and WAL mode for reliability and concurrency
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  closeDb
};
