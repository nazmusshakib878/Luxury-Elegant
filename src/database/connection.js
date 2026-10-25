const Database = require('better-sqlite3');
const { DB_FILE } = require('../config/env');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

module.exports = db;
