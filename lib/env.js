'use strict';

const os = require(`os`);
const crypto = require(`crypto`);
const path = require(`path`);
const config = require(`./config`);

const env = module.exports = {
  $folderPath : null,
  folderPath () {
    if (env.$folderPath !== null) {
      return env.$folderPath;
    }

    const fileHash = crypto
    .createHash(`md5`)
    .update(config.path, `utf8`)
    .digest(`hex`);

    env.$folderPath = path.resolve(os.tmpdir(), fileHash);

    return env.$folderPath;
  },
  dbPath () {
    return path.resolve(env.folderPath(), `mozzart.db`);
  },
  logPath (uid) {
    return path.resolve(env.folderPath(), `${uid}.log`);
  },
};
