'use strict';

const env = require(`./env`);

const Database = require(`better-sqlite3`);

const storage = module.exports = {
  $db : null,
  db () {
    if (!storage.$db) { storage.$db = new Database(env.dbPath()); }

    return storage.$db;
  },
};
